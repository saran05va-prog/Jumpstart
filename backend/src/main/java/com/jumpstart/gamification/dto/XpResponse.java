package com.jumpstart.gamification.dto;

import java.util.List;

public record XpResponse(
        int totalXp,
        int level,
        int xpForNextLevel,
        int progressPercent,
        List<XpTransactionResponse> recentTransactions
) {

    public static int xpForLevel(int level) {
        return level * 100;
    }

    public static int calculateLevel(int totalXp) {
        int level = 1;
        int xpNeeded = 0;
        while (true) {
            xpNeeded += level * 100;
            if (totalXp < xpNeeded) break;
            level++;
        }
        return level;
    }

    public static int progressInLevel(int totalXp, int level) {
        int xpForCurrentLevel = 0;
        for (int i = 1; i < level; i++) {
            xpForCurrentLevel += i * 100;
        }
        int nextLevelXp = level * 100;
        int xpIntoLevel = totalXp - xpForCurrentLevel;
        return (int) (((double) xpIntoLevel / nextLevelXp) * 100);
    }
}
