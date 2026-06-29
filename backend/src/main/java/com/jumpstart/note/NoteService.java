package com.jumpstart.note;

import com.jumpstart.activity.RecentActivityService;
import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.gamification.GamificationService;
import com.jumpstart.note.dto.BacklinkResponse;
import com.jumpstart.note.dto.NoteRequest;
import com.jumpstart.note.dto.NoteResponse;
import com.jumpstart.obsidian.VaultSyncService;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import com.jumpstart.user.settings.UserSettings;
import com.jumpstart.user.settings.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository noteRepository;
    private final NoteLinkRepository noteLinkRepository;
    private final NoteLinkService noteLinkService;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;
    private final RecentActivityService recentActivityService;
    private final VaultSyncService vaultSyncService;
    private final UserSettingsRepository userSettingsRepository;
    private final GamificationService gamificationService;
    private final NotesStorageService notesStorageService;

    @Transactional
    public NoteResponse create(NoteRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId).orElseThrow(() -> new ResourceNotFoundException("User", ownerId));
        Roadmap roadmap = resolveRoadmap(request.roadmapId(), ownerId);
        Topic topic = resolveTopic(normalizeTopicId(request.topicId()), ownerId);

        Note note = Note.builder()
                .owner(owner)
                .roadmap(roadmap)
                .topic(topic)
                .title(request.title() != null ? request.title() : "Untitled note")
                .content(request.content())
                .summary(request.summary())
                .tags(request.tags() != null ? request.tags() : List.of())
                .obsidianUri(request.obsidianUri())
                .obsidianFile(request.obsidianFile())
                .isStarred(request.isStarred() != null && request.isStarred())
                .isPinned(request.isPinned() != null && request.isPinned())
                .lastViewedAt(Instant.now())
                .wordCount(wordCount(request.content()))
                .build();

        note = noteRepository.save(note);
        noteLinkService.rebuildLinks(note);

        // Write to Markdown storage if configured
        writeNoteToStorage(ownerId, note);

        // Write to Obsidian vault if connected
        String vaultPath = getVaultPath(ownerId);
        if (vaultPath != null) vaultSyncService.writeNoteToVault(note, vaultPath);

        recentActivityService.record(ownerId, "NOTE_CREATED", "Note", note.getId(),
                "Created note: " + note.getTitle(),
                topic != null ? topic.getTitle() : (roadmap != null ? roadmap.getTitle() : null));

        // Gamification: XP for creating a note
        gamificationService.recordActivity(ownerId);
        gamificationService.addXp(ownerId, 10, "Created a note", "NOTE", note.getId());

        return NoteResponse.from(note);
    }

    /**
     * Lists notes. When {@code q} is present, searches both title AND
     * content (the old implementation only searched title and ignored q
     * in the listAll path — a bug).
     */
    public List<NoteResponse> listAll(Long ownerId, Long topicId, Long roadmapId,
                                      Boolean starred, Boolean pinned, String q) {
        List<Note> notes;
        if (StringUtils.hasText(q)) {
            notes = noteRepository.searchByOwner(ownerId, q);
        } else if (topicId != null) {
            notes = noteRepository.findByTopicIdAndOwnerIdOrderByIsPinnedDescUpdatedAtDesc(topicId, ownerId);
        } else if (roadmapId != null) {
            notes = noteRepository.findByRoadmapIdAndOwnerIdOrderByCreatedAtDesc(roadmapId, ownerId);
        } else if (Boolean.TRUE.equals(pinned)) {
            notes = noteRepository.findByOwnerIdAndIsPinnedTrueOrderByUpdatedAtDesc(ownerId);
        } else if (Boolean.TRUE.equals(starred)) {
            notes = noteRepository.findByOwnerIdAndIsStarredTrueOrderByUpdatedAtDesc(ownerId);
        } else {
            notes = noteRepository.findByOwnerIdOrderByUpdatedAtDesc(ownerId);
        }
        return notes.stream().map(NoteResponse::from).toList();
    }

    public PageResponse<NoteResponse> list(Long ownerId, String q, Pageable pageable) {
        var page = StringUtils.hasText(q)
                ? noteRepository.findByOwnerIdAndTitleContainingIgnoreCase(ownerId, q, pageable)
                : noteRepository.findByOwnerId(ownerId, pageable);
        return PageResponse.from(page.map(NoteResponse::from));
    }

    @Transactional
    public NoteResponse getById(Long id, Long requesterId, Role requesterRole) {
        Note note = loadOwned(id, requesterId, requesterRole);
        note.setLastViewedAt(Instant.now());
        note = noteRepository.save(note);
        List<BacklinkResponse> backlinks = noteLinkService.getBacklinks(id);
        return NoteResponse.fromWithBacklinks(note, backlinks);
    }

    @Transactional
    public NoteResponse update(Long id, NoteRequest request, Long requesterId, Role requesterRole) {
        Note note = loadOwned(id, requesterId, requesterRole);
        if (request.title() != null) note.setTitle(request.title());
        if (request.content() != null) note.setContent(request.content());
        if (request.summary() != null) note.setSummary(request.summary());
        if (request.tags() != null) note.setTags(request.tags());
        if (request.obsidianUri() != null) note.setObsidianUri(request.obsidianUri());
        if (request.obsidianFile() != null) note.setObsidianFile(request.obsidianFile());
        if (request.isStarred() != null) note.setStarred(request.isStarred());
        if (request.isPinned() != null) note.setPinned(request.isPinned());
        note.setWordCount(wordCount(note.getContent()));

        Long topicId = normalizeTopicId(request.topicId());
        if (topicId != null || request.topicId() != null) {
            note.setTopic(resolveTopic(topicId, requesterId));
        }
        if (request.roadmapId() != null) {
            note.setRoadmap(resolveRoadmap(request.roadmapId(), requesterId));
        }

        note = noteRepository.save(note);
        noteLinkService.rebuildLinks(note);

        // Write to Markdown storage if configured
        writeNoteToStorage(requesterId, note);

        // Sync to vault
        String vaultPath = getVaultPath(requesterId);
        if (vaultPath != null) vaultSyncService.writeNoteToVault(note, vaultPath);

        recentActivityService.record(requesterId, "NOTE_EDITED", "Note", note.getId(),
                "Edited note: " + note.getTitle(), null);

        gamificationService.recordActivity(requesterId);

        return NoteResponse.from(note);
    }

    @Transactional
    public NoteResponse togglePin(Long id, Long requesterId, Role requesterRole) {
        Note note = loadOwned(id, requesterId, requesterRole);
        note.setPinned(!note.isPinned());
        return NoteResponse.from(noteRepository.save(note));
    }

    @Transactional
    public NoteResponse toggleStar(Long id, Long requesterId, Role requesterRole) {
        Note note = loadOwned(id, requesterId, requesterRole);
        note.setStarred(!note.isStarred());
        return NoteResponse.from(noteRepository.save(note));
    }

    @Transactional
    public NoteResponse duplicate(Long id, Long requesterId, Role requesterRole) {
        Note original = loadOwned(id, requesterId, requesterRole);
        Note copy = Note.builder()
                .owner(original.getOwner())
                .roadmap(original.getRoadmap())
                .topic(original.getTopic())
                .title(original.getTitle() + " (copy)")
                .content(original.getContent())
                .summary(original.getSummary())
                .tags(original.getTags())
                .obsidianUri(original.getObsidianUri())
                .obsidianFile(original.getObsidianFile())
                .isStarred(false)
                .isPinned(false)
                .lastViewedAt(Instant.now())
                .wordCount(original.getWordCount())
                .build();
        copy = noteRepository.save(copy);
        noteLinkService.rebuildLinks(copy);
        return NoteResponse.from(copy);
    }

    @Transactional
    public void delete(Long id, Long requesterId, Role requesterRole) {
        Note note = loadOwned(id, requesterId, requesterRole);
        noteLinkRepository.deleteBySourceId(id);

        // Remove from Markdown storage if configured
        deleteNoteFromStorage(requesterId, note);

        // Remove from vault
        String vaultPath = getVaultPath(requesterId);
        if (vaultPath != null) vaultSyncService.deleteNoteFromVault(note, vaultPath);

        noteRepository.delete(note);
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> recent(Long ownerId, int limit) {
        return noteRepository.findByOwnerIdOrderByUpdatedAtDesc(ownerId).stream()
                .limit(limit)
                .map(NoteResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> recentlyViewed(Long ownerId, int limit) {
        return noteRepository.findByOwnerIdOrderByLastViewedAtDesc(ownerId).stream()
                .filter(n -> n.getLastViewedAt() != null)
                .limit(limit)
                .map(NoteResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BacklinkResponse> backlinks(Long id, Long requesterId, Role requesterRole) {
        loadOwned(id, requesterId, requesterRole);
        return noteLinkService.getBacklinks(id);
    }

    private Roadmap resolveRoadmap(Long roadmapId, Long ownerId) {
        if (roadmapId == null) return null;
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new ResourceNotFoundException("Roadmap", roadmapId));
        if (!roadmap.getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("You do not have access to this roadmap");
        }
        return roadmap;
    }

    private Topic resolveTopic(Long topicId, Long ownerId) {
        if (topicId == null) return null;
        Topic topic = topicRepository.findByIdWithRoadmapAndOwner(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        if (!topic.getRoadmap().getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("You do not have access to this topic");
        }
        return topic;
    }

    /**
     * Treats 0 (sent by frontend "unlink") and negative values as null.
     * This fixes the bug where topicId=0 caused a 404 lookup.
     */
    private Long normalizeTopicId(Long topicId) {
        if (topicId == null || topicId <= 0) return null;
        return topicId;
    }

    private Note loadOwned(Long id, Long requesterId, Role requesterRole) {
        Note note = noteRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Note", id));
        if (requesterRole != Role.ADMIN && !note.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this note");
        }
        return note;
    }

    private int wordCount(String content) {
        if (!StringUtils.hasText(content)) return 0;
        return content.trim().split("\\s+").length;
    }

    private String getVaultPath(Long userId) {
        return userSettingsRepository.findByUserId(userId)
                .map(UserSettings::getObsidianVaultPath)
                .orElse(null);
    }

    private void writeNoteToStorage(Long userId, Note note) {
        try {
            notesStorageService.writeNote(userId, note);
        } catch (Exception e) {
            log.warn("Failed to write note to storage: {}", e.getMessage());
        }
    }

    private void deleteNoteFromStorage(Long userId, Note note) {
        try {
            notesStorageService.deleteNote(userId, note);
        } catch (Exception e) {
            log.warn("Failed to delete note from storage: {}", e.getMessage());
        }
    }
}
