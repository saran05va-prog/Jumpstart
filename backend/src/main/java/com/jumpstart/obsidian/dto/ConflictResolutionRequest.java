package com.jumpstart.obsidian.dto;

import jakarta.validation.constraints.NotNull;

public record ConflictResolutionRequest(
        @NotNull Long noteId,
        @NotNull String resolution,
        String mergedContent
) {}
