package com.jumpstart.goal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoalChecklistItemRequest(
        @NotBlank @Size(max = 500) String text,
        Boolean done,
        Integer orderIndex
) {}
