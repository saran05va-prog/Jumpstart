package com.jumpstart.schedule.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ScheduleRequest(
        @NotNull Long topicId,
        @NotNull LocalDate scheduledDate,
        Integer plannedMinutes,
        String note
) {}
