package com.jumpstart.topic.dto;

import com.jumpstart.topic.ChecklistItem;

public record ChecklistItemResponse(
        Long id,
        Long topicId,
        String label,
        boolean completed,
        int sortOrder
) {
    public static ChecklistItemResponse from(ChecklistItem item) {
        return new ChecklistItemResponse(
                item.getId(),
                item.getTopic().getId(),
                item.getLabel(),
                item.isCompleted(),
                item.getSortOrder()
        );
    }
}
