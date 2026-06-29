package com.jumpstart.activity.dto;

import com.jumpstart.activity.RecentActivity;

import java.time.Instant;

public record RecentActivityResponse(
        Long id,
        String activityType,
        String entityType,
        Long entityId,
        String title,
        String subtitle,
        Instant createdAt
) {
    public static RecentActivityResponse from(RecentActivity a) {
        return new RecentActivityResponse(
                a.getId(),
                a.getActivityType(),
                a.getEntityType(),
                a.getEntityId(),
                a.getTitle(),
                a.getSubtitle(),
                a.getCreatedAt()
        );
    }
}
