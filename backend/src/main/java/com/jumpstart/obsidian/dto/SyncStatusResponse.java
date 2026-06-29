package com.jumpstart.obsidian.dto;

import java.time.Instant;

public record SyncStatusResponse(
        boolean connected,
        String vaultPath,
        String vaultName,
        Instant lastSyncAt,
        long totalNotes,
        long syncedNotes,
        long pendingNotes,
        long conflictedNotes
) {}
