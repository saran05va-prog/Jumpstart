package com.jumpstart.topic.timer;

import java.time.Instant;

public record TimerStatusResponse(
        String status,
        Instant serverStartTime,
        int accumulatedSeconds,
        Instant serverNow
) {}
