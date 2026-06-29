package com.jumpstart.obsidian;

import com.jumpstart.note.Note;
import com.jumpstart.note.NoteRepository;
import com.jumpstart.obsidian.dto.SyncStatusResponse;
import com.jumpstart.obsidian.dto.VerifyConnectionResponse;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import com.jumpstart.user.settings.UserSettings;
import com.jumpstart.user.settings.UserSettingsRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.ClosedWatchServiceException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class VaultSyncService {

    private final UserSettingsRepository settingsRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final MarkdownParser markdownParser;
    private final SimpMessagingTemplate messagingTemplate;

    private final AtomicBoolean shutdown = new AtomicBoolean(false);
    private final Map<Long, VaultWatcher> watchers = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    private static final long DEBOUNCE_MS = 800;
    private static final long EVENT_COOLDOWN_MS = 2000;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".md", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf", ".mp3", ".wav", ".ogg");

    @PostConstruct
    public void init() {
        startAllWatchers();
    }

    @PreDestroy
    public void destroy() {
        shutdown.set(true);
        stopAllWatchers();
        scheduler.shutdownNow();
    }

    // ── Watcher management ──

    public synchronized void startWatcher(Long userId) {
        Path vaultPath = resolveVaultPath(userId);
        if (vaultPath == null) return;
        if (watchers.containsKey(userId)) return;
        if (!Files.isDirectory(vaultPath)) return;

        VaultWatcher watcher = new VaultWatcher(userId, vaultPath);
        watchers.put(userId, watcher);
        watcher.start();
        log.info("Started vault watcher for user {} at {}", userId, vaultPath);
    }

    public synchronized void stopWatcher(Long userId) {
        VaultWatcher watcher = watchers.remove(userId);
        if (watcher != null) {
            watcher.stop();
            log.info("Stopped vault watcher for user {}", userId);
        }
    }

    public void startAllWatchers() {
        List<Long> userIds = settingsRepository.findAll().stream()
                .filter(s -> s.getObsidianVaultPath() != null && !s.getObsidianVaultPath().isEmpty())
                .map(s -> s.getUser().getId())
                .toList();
        for (Long uid : userIds) startWatcher(uid);
    }

    private void stopAllWatchers() {
        new ArrayList<>(watchers.keySet()).forEach(this::stopWatcher);
    }

    // ── Vault path resolution ──

    public Path getVaultPath(Long userId) {
        return resolveVaultPath(userId);
    }

    private Path resolveVaultPath(Long userId) {
        return settingsRepository.findByUserId(userId)
                .map(UserSettings::getObsidianVaultPath)
                .filter(p -> p != null && !p.isEmpty())
                .map(Paths::get)
                .filter(Files::isDirectory)
                .orElse(null);
    }

    private String getVaultPathString(Long userId) {
        return settingsRepository.findByUserId(userId)
                .map(UserSettings::getObsidianVaultPath)
                .orElse(null);
    }

    // ── File event processing ──

    public void handleFileChange(Long userId, Path filePath) {
        if (shutdown.get()) return;
        if (!Files.exists(filePath) || !filePath.toString().endsWith(".md")) return;

        try {
            String markdown = FileUtils.readFileToString(filePath.toFile(), StandardCharsets.UTF_8);
            MarkdownParser.ParsedNote parsed = markdownParser.parse(markdown);
            String vaultPathBase = getVaultPathString(userId);
            if (vaultPathBase == null) return;
            String absPath = filePath.toAbsolutePath().normalize().toString();
            String vaultNorm = Paths.get(vaultPathBase).normalize().toString();
            String relativePath = absPath.startsWith(vaultNorm)
                    ? absPath.substring(vaultNorm.length()).replaceAll("^[/\\\\]", "")
                    : absPath;

            String storedChecksum = parsed.frontmatter().get("jumpstart_checksum");
            String currentChecksum = parsed.checksum();

            Optional<Note> existing = Optional.empty();
            String jid = parsed.frontmatter().get("jumpstart_id");
            if (jid != null && !jid.isEmpty()) {
                try { existing = noteRepository.findById(Long.parseLong(jid)); } catch (NumberFormatException ignored) {}
            }
            if (existing.isEmpty()) {
                existing = noteRepository.findByOwnerIdAndVaultPath(userId, relativePath);
            }

            if (existing.isPresent()) {
                Note note = existing.get();
                String dbChecksum = note.getChecksum();

                // Loop prevention: if checksums match, skip
                if (currentChecksum.equals(dbChecksum)) return;

                // If it was written by Jumpstart recently (checksum in frontmatter matches DB)
                if (storedChecksum != null && storedChecksum.equals(dbChecksum)) {
                    return;
                }

                // Conflict detection: both sides changed since last sync
                boolean jumpstartChanged = note.getUpdatedAt() != null
                        && note.getLastSyncedAt() != null
                        && note.getUpdatedAt().isAfter(note.getLastSyncedAt());

                if (jumpstartChanged) {
                    note.setSyncStatus("CONFLICT");
                    note.setConflictContent(parsed.content());
                    note.setConflictDetectedAt(Instant.now());
                    noteRepository.save(note);
                    notifyFrontend(userId, "CONFLICT_DETECTED", note.getId(), note.getTitle(), "CONFLICT", true);
                    return;
                }

                // Normal vault-to-db sync
                note.setContent(parsed.content());
                note.setTitle(parsed.title());
                note.setTags(parsed.tags());
                note.setChecksum(currentChecksum);
                note.setLastSyncedAt(Instant.now());
                note.setSyncStatus("SYNCED");
                note.setConflictContent(null);
                note.setConflictDetectedAt(null);
                noteRepository.save(note);
                notifyFrontend(userId, "NOTE_UPDATED", note.getId(), note.getTitle(), "SYNCED", false);
            } else {
                User user = userRepository.findById(userId).orElse(null);
                if (user == null) return;
                Note note = Note.builder()
                        .owner(user)
                        .title(parsed.title())
                        .content(parsed.content())
                        .tags(parsed.tags())
                        .vaultPath(relativePath)
                        .checksum(currentChecksum)
                        .lastSyncedAt(Instant.now())
                        .syncStatus("SYNCED")
                        .build();
                note = noteRepository.save(note);
                notifyFrontend(userId, "NOTE_CREATED", note.getId(), note.getTitle(), "SYNCED", false);
            }
        } catch (Exception e) {
            log.error("Error processing vault file {} for user {}: {}", filePath, userId, e.getMessage());
        }
    }

    void handleFileDelete(Long userId, Path filePath) {
        if (shutdown.get()) return;
        try {
            String vaultPathBase = getVaultPathString(userId);
            if (vaultPathBase == null) return;
            String absPath = filePath.toAbsolutePath().normalize().toString();
            String vaultNorm = Paths.get(vaultPathBase).normalize().toString();
            String relativePath = absPath.startsWith(vaultNorm)
                    ? absPath.substring(vaultNorm.length()).replaceAll("^[/\\\\]", "")
                    : absPath;

            noteRepository.findByOwnerIdAndVaultPath(userId, relativePath)
                    .ifPresent(note -> {
                        note.setSyncStatus("NONE");
                        note.setVaultPath(null);
                        note.setChecksum(null);
                        note.setLastSyncedAt(null);
                        noteRepository.save(note);
                        notifyFrontend(userId, "NOTE_DELETED", note.getId(), note.getTitle(), "NONE", false);
                    });
        } catch (Exception e) {
            log.error("Error handling vault file deletion {}: {}", filePath, e.getMessage());
        }
    }

    // ── Writing notes to vault ──

    public void writeNoteToVault(Note note, String vaultPath) {
        if (vaultPath == null || vaultPath.isEmpty()) return;
        try {
            String relativePath = buildVaultPath(note);
            Path fullPath = Paths.get(vaultPath, relativePath);
            Files.createDirectories(fullPath.getParent());

            String existingContent = Files.exists(fullPath)
                    ? FileUtils.readFileToString(fullPath.toFile(), StandardCharsets.UTF_8)
                    : null;
            String existingChecksum = existingContent != null
                    ? markdownParser.sha256(existingContent)
                    : null;

            // Conflict check: vault file changed externally since last sync
            if (note.getLastSyncedAt() != null && existingChecksum != null
                    && !existingChecksum.equals(note.getChecksum())) {
                Instant fileModTime = Instant.ofEpochMilli(fullPath.toFile().lastModified());
                if (fileModTime.isAfter(note.getLastSyncedAt())) {
                    note.setSyncStatus("CONFLICT");
                    note.setConflictContent(existingContent);
                    note.setConflictDetectedAt(Instant.now());
                    noteRepository.save(note);
                    notifyFrontend(note.getOwner().getId(), "CONFLICT_DETECTED",
                            note.getId(), note.getTitle(), "CONFLICT", true);
                    return;
                }
            }

            String checksum = markdownParser.sha256(
                    note.getTitle() + note.getContent() + (note.getTags() != null ? note.getTags().toString() : ""));

            String markdown = markdownParser.toMarkdown(
                    note.getTitle(), note.getContent(), note.getTags(),
                    note.getId(),
                    note.getRoadmap() != null ? note.getRoadmap().getTitle() : null,
                    note.getTopic() != null ? note.getTopic().getTitle() : null,
                    checksum);

            FileUtils.writeStringToFile(fullPath.toFile(), markdown, StandardCharsets.UTF_8);

            note.setVaultPath(relativePath);
            note.setChecksum(checksum);
            note.setLastSyncedAt(Instant.now());
            note.setSyncStatus("SYNCED");
            note.setConflictContent(null);
            note.setConflictDetectedAt(null);
            noteRepository.save(note);
        } catch (IOException e) {
            log.error("Failed to write note {} to vault: {}", note.getId(), e.getMessage());
            note.setSyncStatus("PENDING_UPLOAD");
            noteRepository.save(note);
        }
    }

    public void deleteNoteFromVault(Note note, String vaultPath) {
        if (vaultPath == null || vaultPath.isEmpty() || note.getVaultPath() == null) return;
        try {
            Path fullPath = Paths.get(vaultPath, note.getVaultPath());
            Files.deleteIfExists(fullPath);

            // Clean up empty parent directories
            Path parent = fullPath.getParent();
            while (parent != null && !parent.equals(Paths.get(vaultPath))) {
                try (var files = Files.list(parent)) {
                    if (files.findAny().isPresent()) break;
                    Files.delete(parent);
                }
                parent = parent.getParent();
            }
        } catch (IOException e) {
            log.warn("Failed to delete vault file {}: {}", note.getVaultPath(), e.getMessage());
        }
    }

    // ── Verification & Status ──

    public VerifyConnectionResponse verifyConnection(Long userId) {
        UserSettings settings = settingsRepository.findByUserId(userId).orElse(null);
        if (settings == null || settings.getObsidianVaultPath() == null) {
            return new VerifyConnectionResponse(false, "No vault path configured", null, 0, 0);
        }
        Path path = Paths.get(settings.getObsidianVaultPath());
        if (!Files.exists(path)) {
            return new VerifyConnectionResponse(false,
                    "Vault path does not exist: " + settings.getObsidianVaultPath(),
                    settings.getObsidianVaultPath(), 0, 0);
        }
        if (!Files.isDirectory(path)) {
            return new VerifyConnectionResponse(false, "Vault path is not a directory",
                    settings.getObsidianVaultPath(), 0, 0);
        }
        try {
            File vaultDir = path.toFile();
            File[] allFiles = vaultDir.listFiles();
            long totalFiles = allFiles != null ? allFiles.length : 0;
            long mdFiles;
            try (var stream = Files.walk(path)) {
                mdFiles = stream.filter(f -> f.toString().endsWith(".md")).count();
            }
            // Start watcher if not already running
            startWatcher(userId);
            return new VerifyConnectionResponse(true, "Vault connected successfully",
                    settings.getObsidianVaultPath(), totalFiles, mdFiles);
        } catch (IOException e) {
            return new VerifyConnectionResponse(false, "Error reading vault: " + e.getMessage(),
                    settings.getObsidianVaultPath(), 0, 0);
        }
    }

    public SyncStatusResponse getSyncStatus(Long userId) {
        UserSettings settings = settingsRepository.findByUserId(userId).orElse(null);
        Path vaultPath = getVaultPath(userId);
        boolean connected = vaultPath != null;
        List<Note> notes = noteRepository.findByOwnerIdOrderByUpdatedAtDesc(userId);
        long total = notes.size();
        long synced = notes.stream().filter(n -> "SYNCED".equals(n.getSyncStatus())).count();
        long pending = notes.stream().filter(n ->
                "PENDING_UPLOAD".equals(n.getSyncStatus()) || n.getSyncStatus() == null).count();
        long conflicted = notes.stream().filter(n -> "CONFLICT".equals(n.getSyncStatus())).count();
        return new SyncStatusResponse(
                connected,
                settings != null ? settings.getObsidianVaultPath() : null,
                settings != null ? settings.getObsidianVaultName() : null,
                settings != null ? settings.getLastSyncAt() : null,
                total, synced, pending, conflicted
        );
    }

    public void syncAll(Long userId) {
        UserSettings settings = settingsRepository.findByUserId(userId).orElse(null);
        String vaultPath = getVaultPathString(userId);
        if (settings == null || vaultPath == null) return;
        List<Note> notes = noteRepository.findByOwnerIdOrderByUpdatedAtDesc(userId);
        for (Note note : notes) {
            if (!"SYNCED".equals(note.getSyncStatus()) || note.getVaultPath() == null) {
                writeNoteToVault(note, vaultPath);
            }
        }
        settings.setLastSyncAt(Instant.now());
        settingsRepository.save(settings);
        notifyFrontend(userId, "SYNC_STATUS_CHANGED", null, null,
                notes.isEmpty() ? "NONE" : "SYNCED", false);
        startWatcher(userId);
    }

    // ── Conflict resolution ──

    public Note resolveConflict(Long noteId, Long userId, String resolution, String mergedContent) {
        Note note = noteRepository.findById(noteId).orElse(null);
        if (note == null) return null;
        if (!note.getOwner().getId().equals(userId)) return null;
        if (!"CONFLICT".equals(note.getSyncStatus())) return note;

        String vaultPath = getVaultPathString(userId);

        switch (resolution) {
            case "KEEP_JUMPSTART" -> {
                note.setSyncStatus("PENDING_UPLOAD");
                note.setConflictContent(null);
                note.setConflictDetectedAt(null);
                note = noteRepository.save(note);
                if (vaultPath != null) writeNoteToVault(note, vaultPath);
            }
            case "KEEP_OBSIDIAN" -> {
                String conflictContent = note.getConflictContent();
                if (conflictContent != null) {
                    note.setContent(conflictContent);
                }
                note.setSyncStatus("PENDING_UPLOAD");
                note.setConflictContent(null);
                note.setConflictDetectedAt(null);
                note = noteRepository.save(note);
                if (vaultPath != null) writeNoteToVault(note, vaultPath);
            }
            case "MERGE" -> {
                if (mergedContent != null) {
                    note.setContent(mergedContent);
                }
                note.setSyncStatus("PENDING_UPLOAD");
                note.setConflictContent(null);
                note.setConflictDetectedAt(null);
                note = noteRepository.save(note);
                if (vaultPath != null) writeNoteToVault(note, vaultPath);
            }
        }

        notifyFrontend(userId, "NOTE_UPDATED", note.getId(), note.getTitle(), note.getSyncStatus(), false);
        return note;
    }

    // ── WebSocket notifications ──

    private void notifyFrontend(Long userId, String type, Long noteId, String title, String syncStatus, boolean hasConflict) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("type", type);
            payload.put("noteId", noteId);
            payload.put("title", title != null ? title : "");
            payload.put("syncStatus", syncStatus);
            payload.put("hasConflict", hasConflict);
            messagingTemplate.convertAndSend("/topic/sync/" + userId, payload);
        } catch (Exception e) {
            log.debug("Failed to send WS notification to user {}: {}", userId, e.getMessage());
        }
    }

    // ── Vault path building ──

    private String buildVaultPath(Note note) {
        String folder = "Jumpstart Notes";
        if (note.getRoadmap() != null) {
            folder = folder + "/" + sanitizeFolderName(note.getRoadmap().getTitle());
        }
        if (note.getTopic() != null) {
            folder = folder + "/" + sanitizeFolderName(note.getTopic().getTitle());
        }
        return folder + "/" + sanitizeFileName(note.getTitle()) + ".md";
    }

    private String sanitizeFolderName(String name) {
        return name.replaceAll("[<>:\"/\\\\|?*]", "_").trim();
    }

    private String sanitizeFileName(String name) {
        return name.replaceAll("[<>:\"/\\\\|?*]", "_").trim();
    }

    // ── WatchService implementation ──

    private class VaultWatcher {
        private final Long userId;
        private final Path vaultRoot;
        private final AtomicBoolean running = new AtomicBoolean(true);
        private final Map<Path, Long> eventCooldowns = new ConcurrentHashMap<>();
        private WatchService watchService;
        private final Map<WatchKey, Path> watchKeys = new ConcurrentHashMap<>();
        private ExecutorService executor;

        VaultWatcher(Long userId, Path vaultRoot) {
            this.userId = userId;
            this.vaultRoot = vaultRoot;
            this.executor = Executors.newSingleThreadExecutor(r -> {
                Thread t = new Thread(r, "vault-watcher-" + userId);
                t.setDaemon(true);
                return t;
            });
        }

        void start() {
            executor.submit(this::run);
        }

        void stop() {
            running.set(false);
            try {
                if (watchService != null) watchService.close();
            } catch (IOException ignored) {}
            executor.shutdownNow();
            try { executor.awaitTermination(2, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}
        }

        private void run() {
            try {
                watchService = FileSystems.getDefault().newWatchService();
                registerAll(vaultRoot);

                while (running.get() && !shutdown.get()) {
                    WatchKey key;
                    try {
                        key = watchService.poll(3, TimeUnit.SECONDS);
                    } catch (ClosedWatchServiceException e) {
                        break;
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                    if (key == null) continue;

                    Path dir = watchKeys.get(key);
                    if (dir == null) { key.reset(); continue; }

                    List<WatchEvent<?>> events = key.pollEvents();
                    for (WatchEvent<?> event : events) {
                        if (event.kind() == StandardWatchEventKinds.OVERFLOW) continue;

                        Path filename = (Path) event.context();
                        Path fullPath = dir.resolve(filename).normalize();

                        // Skip hidden files, .obsidian folder, and non-allowed extensions
                        String fileName = filename.toString();
                        if (fileName.startsWith(".") || fileName.startsWith("~")) continue;
                        if (fullPath.startsWith(vaultRoot.resolve(".obsidian"))) continue;
                        if (!Files.isDirectory(fullPath) && !fileName.endsWith(".md")) continue;

                        // Debounce rapid events
                        long now = System.currentTimeMillis();
                        Long lastEvent = eventCooldowns.get(fullPath);
                        if (lastEvent != null && (now - lastEvent) < DEBOUNCE_MS) continue;
                        eventCooldowns.put(fullPath, now);

                        if (Files.isDirectory(fullPath)) {
                            if (event.kind() == StandardWatchEventKinds.ENTRY_CREATE) {
                                registerAll(fullPath);
                            }
                            continue;
                        }

                        scheduler.schedule(() -> {
                            if (!running.get() || shutdown.get()) return;
                            try {
                                if (event.kind() == StandardWatchEventKinds.ENTRY_CREATE
                                        || event.kind() == StandardWatchEventKinds.ENTRY_MODIFY) {
                                    if (Files.exists(fullPath)) {
                                        handleFileChange(userId, fullPath);
                                    }
                                } else if (event.kind() == StandardWatchEventKinds.ENTRY_DELETE) {
                                    handleFileDelete(userId, fullPath);
                                }
                            } catch (Exception e) {
                                log.error("Watcher error processing {}: {}", fullPath, e.getMessage());
                            }
                        }, DEBOUNCE_MS, TimeUnit.MILLISECONDS);
                    }

                    if (!key.reset()) {
                        watchKeys.remove(key);
                        if (watchKeys.isEmpty()) break;
                    }
                }
            } catch (IOException e) {
                log.error("Vault watcher failed for user {}: {}", userId, e.getMessage());
            }
        }

        private void registerAll(Path start) throws IOException {
            try (Stream<Path> stream = Files.walk(start)) {
                stream.filter(Files::isDirectory).forEach(dir -> {
                    try {
                        WatchKey key = dir.register(watchService,
                                StandardWatchEventKinds.ENTRY_CREATE,
                                StandardWatchEventKinds.ENTRY_MODIFY,
                                StandardWatchEventKinds.ENTRY_DELETE);
                        watchKeys.put(key, dir.normalize());
                    } catch (IOException e) {
                        log.warn("Failed to register watcher for {}: {}", dir, e.getMessage());
                    }
                });
            }
        }
    }
}
