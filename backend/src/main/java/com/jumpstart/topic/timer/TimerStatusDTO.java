package com.jumpstart.topic.timer;

import java.time.Instant;

public record TimerStatusDTO(
        String status,
        Instant serverStartTime,
        int accumulatedSeconds,
        Long topicId,
        String topicTitle
) {
    public static TimerStatusDTO from(TopicTimerState state) {
        return new TimerStatusDTO(
                state.getStatus(),
                state.getServerStartTime(),
                state.getAccumulatedSeconds(),
                state.getTopic().getId(),
                state.getTopic().getTitle()
        );
    }
}
