package com.jumpstart.note;

import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.topic.Topic;
import com.jumpstart.user.settings.UserSettings;
import com.jumpstart.user.settings.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotesStorageService {

    private final UserSettingsRepository settingsRepository;

    public String readNote(Long userId, Note note) throws IOException {
        UserSettings settings = settingsRepository.findByUserId(userId).orElse(null);
        if (settings == null || settings.getNotesStoragePath() == null || settings.getNotesStoragePath().isEmpty()) {
            return null;
        }
        Path filePath = buildNotePath(settings.getNotesStoragePath(), note);
        if (!Files.exists(filePath)) {
            return null;
        }
        return Files.readString(filePath, StandardCharsets.UTF_8);
    }

    public void writeNote(Long userId, Note note) throws IOException {
        UserSettings settings = settingsRepository.findByUserId(userId).orElse(null);
        if (settings == null || settings.getNotesStoragePath() == null || settings.getNotesStoragePath().isEmpty()) {
            return;
        }
        Path filePath = buildNotePath(settings.getNotesStoragePath(), note);
        Files.createDirectories(filePath.getParent());

        String markdown = toMarkdown(note);
        Files.writeString(filePath, markdown, StandardCharsets.UTF_8);
    }

    public void deleteNote(Long userId, Note note) throws IOException {
        UserSettings settings = settingsRepository.findByUserId(userId).orElse(null);
        if (settings == null || settings.getNotesStoragePath() == null || settings.getNotesStoragePath().isEmpty()) {
            return;
        }
        Path filePath = buildNotePath(settings.getNotesStoragePath(), note);
        Files.deleteIfExists(filePath);

        // Clean up empty parent directories
        Path parent = filePath.getParent();
        Path root = Paths.get(settings.getNotesStoragePath());
        while (parent != null && !parent.equals(root)) {
            try (var files = Files.list(parent)) {
                if (files.findAny().isPresent()) break;
                Files.delete(parent);
            }
            parent = parent.getParent();
        }
    }

    public boolean isConfigured(Long userId) {
        UserSettings settings = settingsRepository.findByUserId(userId).orElse(null);
        return settings != null && settings.getNotesStoragePath() != null && !settings.getNotesStoragePath().isEmpty();
    }

    public Path getStorageRoot(Long userId) {
        UserSettings settings = settingsRepository.findByUserId(userId).orElse(null);
        if (settings == null || settings.getNotesStoragePath() == null || settings.getNotesStoragePath().isEmpty()) {
            return null;
        }
        return Paths.get(settings.getNotesStoragePath());
    }

    private Path buildNotePath(String rootPath, Note note) {
        StringBuilder path = new StringBuilder("Roadmaps");
        if (note.getRoadmap() != null) {
            path.append("/").append(sanitizeFolderName(note.getRoadmap().getTitle()));
        }
        if (note.getTopic() != null) {
            path.append("/").append(sanitizeFolderName(note.getTopic().getTitle()));
        }
        path.append("/").append(sanitizeFileName(note.getTitle())).append(".md");
        return Paths.get(rootPath, path.toString());
    }

    private String toMarkdown(Note note) {
        StringBuilder md = new StringBuilder();
        md.append("---\n");
        md.append("title: \"").append(escapeYaml(note.getTitle())).append("\"\n");
        if (note.getRoadmap() != null) {
            md.append("roadmap: \"").append(escapeYaml(note.getRoadmap().getTitle())).append("\"\n");
            md.append("roadmapId: ").append(note.getRoadmap().getId()).append("\n");
        }
        if (note.getTopic() != null) {
            md.append("topic: \"").append(escapeYaml(note.getTopic().getTitle())).append("\"\n");
            md.append("topicId: ").append(note.getTopic().getId()).append("\n");
        }
        if (note.getTags() != null && !note.getTags().isEmpty()) {
            md.append("tags: [").append(note.getTags().stream().map(this::escapeYaml).reduce((a, b) -> a + ", " + b).orElse("")).append("]\n");
        }
        md.append("createdAt: ").append(note.getCreatedAt() != null ? DateTimeFormatter.ISO_INSTANT.format(note.getCreatedAt()) : "").append("\n");
        md.append("updatedAt: ").append(note.getUpdatedAt() != null ? DateTimeFormatter.ISO_INSTANT.format(note.getUpdatedAt()) : "").append("\n");
        md.append("jumpstartId: ").append(note.getId()).append("\n");
        md.append("---\n\n");
        if (note.getContent() != null) {
            md.append(note.getContent());
        }
        return md.toString();
    }

    private String sanitizeFolderName(String name) {
        return name.replaceAll("[<>:\"/\\\\|?*]", "_").trim();
    }

    private String sanitizeFileName(String name) {
        return name.replaceAll("[<>:\"/\\\\|?*]", "_").trim();
    }

    private String escapeYaml(String value) {
        return value.replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }
}