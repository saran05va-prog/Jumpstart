package com.jumpstart.gamification.dto;

import java.util.List;

public record GamificationDashboardResponse(
        StreakResponse streak,
        XpResponse xp,
        List<AchievementResponse> achievements,
        int unreadAchievements
) {}
