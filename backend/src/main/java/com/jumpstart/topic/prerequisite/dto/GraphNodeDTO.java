package com.jumpstart.topic.prerequisite.dto;

public record GraphNodeDTO(
        Long id,
        String title,
        String status,
        int estimatedMinutes,
        int noteCount,
        int resourceCount
) {}
