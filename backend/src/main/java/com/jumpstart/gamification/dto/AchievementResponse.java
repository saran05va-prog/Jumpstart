package com.jumpstart.gamification.dto;

import java.time.Instant;

public record AchievementResponse(
        String code,
        String title,
        String description,
        String icon,
        String category,
        int xpReward,
        boolean earned,
        Instant earnedAt
) {}
