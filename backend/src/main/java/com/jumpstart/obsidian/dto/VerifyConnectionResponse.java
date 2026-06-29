package com.jumpstart.obsidian.dto;

public record VerifyConnectionResponse(
        boolean success,
        String message,
        String vaultPath,
        long fileCount,
        long markdownFileCount
) {}
