package com.jumpstart.goal.dto;

import com.jumpstart.goal.GoalChecklistItem;

public record GoalChecklistItemResponse(
        Long id,
        Long goalId,
        String text,
        boolean done,
        int orderIndex
) {
    public static GoalChecklistItemResponse from(GoalChecklistItem item) {
        return new GoalChecklistItemResponse(
                item.getId(), item.getGoal().getId(),
                item.getText(), item.isDone(), item.getOrderIndex()
        );
    }
}
