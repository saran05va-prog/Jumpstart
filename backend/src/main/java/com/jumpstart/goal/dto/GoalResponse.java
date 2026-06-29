package com.jumpstart.goal.dto;

import com.jumpstart.goal.Goal;

import java.time.Instant;
import java.time.LocalDate;

public record GoalResponse(
        Long id,
        String label,
        String description,
        String cadence,
        String priority,
        String status,
        double targetValue,
        double progressValue,
        String unit,
        boolean complete,
        LocalDate dueDate,
        Long topicId,
        Instant completedAt
) {
    public static GoalResponse from(Goal goal) {
        return new GoalResponse(
                goal.getId(), goal.getLabel(), goal.getDescription(),
                goal.getCadence().name(),
                goal.getPriority(), goal.getStatus(),
                goal.getTargetValue(), goal.getProgressValue(), goal.getUnit(),
                goal.getProgressValue() >= goal.getTargetValue(),
                goal.getDueDate(),
                goal.getTopic() != null ? goal.getTopic().getId() : null,
                goal.getCompletedAt()
        );
    }
}
