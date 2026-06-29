package com.jumpstart.topic.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChecklistItemRequest(
        @NotBlank @Size(max = 300) String label,
        boolean completed,
        int sortOrder
) {
}
