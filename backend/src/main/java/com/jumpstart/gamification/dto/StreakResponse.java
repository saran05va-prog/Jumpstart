package com.jumpstart.gamification.dto;

import java.time.LocalDate;

public record StreakResponse(
        int currentStreak,
        int longestStreak,
        int weeklyStreak,
        int monthlyStreak,
        int perfectWeeks,
        int perfectMonths,
        LocalDate lastActivityDate,
        boolean atRisk,
        String statusMessage
) {}
