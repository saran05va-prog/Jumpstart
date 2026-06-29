package com.jumpstart.schedule.dto;

import java.util.List;

public record AutoSchedulePreview(
        int totalTopics,
        int totalDays,
        List<ScheduleItemResponse> items
) {}
