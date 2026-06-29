package com.jumpstart.note.dto;

import jakarta.validation.constraints.NotNull;

public record ObsidianLinkRequest(
        @NotNull Long topicId,
        String content,
        String vaultFile
) {}
