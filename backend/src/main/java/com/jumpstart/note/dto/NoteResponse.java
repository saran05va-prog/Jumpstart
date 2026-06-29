package com.jumpstart.note.dto;

import com.jumpstart.note.Note;

import java.time.Instant;
import java.util.List;

public record NoteResponse(
        Long id,
        String title,
        String content,
        String summary,
        List<String> tags,
        int wordCount,
        Long roadmapId,
        Long topicId,
        String obsidianUri,
        String obsidianFile,
        boolean isStarred,
        boolean isPinned,
        Instant lastViewedAt,
        Instant createdAt,
        Instant updatedAt,
        List<BacklinkResponse> backlinks,
        String syncStatus,
        String vaultPath,
        Instant lastSyncedAt,
        boolean hasConflict,
        String conflictContent,
        Instant conflictDetectedAt
) {
    public static NoteResponse from(Note n) {
        return new NoteResponse(
                n.getId(), n.getTitle(), n.getContent(), n.getSummary(),
                n.getTags(), n.getWordCount(),
                n.getRoadmap() != null ? n.getRoadmap().getId() : null,
                n.getTopic() != null ? n.getTopic().getId() : null,
                n.getObsidianUri(), n.getObsidianFile(),
                n.isStarred(), n.isPinned(),
                n.getLastViewedAt(), n.getCreatedAt(), n.getUpdatedAt(),
                null,
                n.getSyncStatus(), n.getVaultPath(), n.getLastSyncedAt(),
                n.getConflictContent() != null,
                n.getConflictContent(), n.getConflictDetectedAt()
        );
    }

    public static NoteResponse fromWithBacklinks(Note n, List<BacklinkResponse> backlinks) {
        return new NoteResponse(
                n.getId(), n.getTitle(), n.getContent(), n.getSummary(),
                n.getTags(), n.getWordCount(),
                n.getRoadmap() != null ? n.getRoadmap().getId() : null,
                n.getTopic() != null ? n.getTopic().getId() : null,
                n.getObsidianUri(), n.getObsidianFile(),
                n.isStarred(), n.isPinned(),
                n.getLastViewedAt(), n.getCreatedAt(), n.getUpdatedAt(),
                backlinks,
                n.getSyncStatus(), n.getVaultPath(), n.getLastSyncedAt(),
                n.getConflictContent() != null,
                n.getConflictContent(), n.getConflictDetectedAt()
        );
    }
}
