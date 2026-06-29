package com.jumpstart.schedule.dto;

import java.time.LocalDate;
import java.util.List;

public record AutoPlanRequest(
        List<Long> topicIds,
        LocalDate startDate,
        Integer dailyMinutes,
        List<Integer> studyDays
) {}