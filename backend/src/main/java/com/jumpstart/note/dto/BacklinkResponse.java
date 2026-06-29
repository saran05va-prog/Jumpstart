package com.jumpstart.note.dto;

/**
 * A backlink — a note that links TO the current note via [[wikilink]].
 */
public record BacklinkResponse(
        Long noteId,
        String title,
        String linkText,
        Long roadmapId,
        Long topicId
) {}
