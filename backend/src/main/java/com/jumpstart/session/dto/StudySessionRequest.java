package com.jumpstart.session.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record StudySessionRequest(
        @NotNull(message = "Date is required")
        LocalDate sessionDate,

        @NotNull(message = "Minutes is required")
        @Min(value = 1, message = "Minutes must be at least 1")
        @Max(value = 1440, message = "Minutes cannot exceed 1440")
        Double minutes,

        Long roadmapId,

        Long topicId,

        @Size(max = 500, message = "Note must be 500 characters or fewer")
        String note
) {
}
