package com.jumpstart.topic.timer;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record TimerLogRequest(
        @NotNull @Min(1) int durationSeconds,
        String note,
        String sessionDate
) {
    public TimerLogRequest { if (durationSeconds <= 0) durationSeconds = 60; }
    public TimerLogRequest() { this(60, null, null); }
}
