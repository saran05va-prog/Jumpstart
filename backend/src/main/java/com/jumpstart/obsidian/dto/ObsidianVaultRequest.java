package com.jumpstart.obsidian.dto;

import jakarta.validation.constraints.Size;

public record ObsidianVaultRequest(
        @Size(max = 100) String vaultName,
        String vaultPath
) {}
