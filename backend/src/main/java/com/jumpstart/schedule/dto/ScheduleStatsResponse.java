package com.jumpstart.schedule.dto;

import java.time.LocalDate;

public record ScheduleStatsResponse(
        LocalDate date,
        int plannedMinutes,
        int actualMinutes
) {}
