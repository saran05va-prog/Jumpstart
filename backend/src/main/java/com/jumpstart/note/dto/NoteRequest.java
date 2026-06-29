package com.jumpstart.note.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

public record NoteRequest(
        @Size(max = 200) String title,
        String content,
        String summary,
        List<String> tags,
        Long roadmapId,
        Long topicId,
        @Size(max = 500) String obsidianUri,
        String obsidianFile,
        Boolean isStarred,
        Boolean isPinned
) {}
