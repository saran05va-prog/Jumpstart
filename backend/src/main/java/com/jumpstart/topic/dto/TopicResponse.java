package com.jumpstart.topic.dto;

import com.jumpstart.topic.Topic;

import java.time.Instant;

public record TopicResponse(
        Long id,
        Long roadmapId,
        String title,
        String description,
        String status,
        int difficulty,
        double estHours,
        int sortOrder,
        Long parentId,
        String sourceRef,
        String milestoneLabel,
        Instant createdAt,
        Instant updatedAt
) {
    public static TopicResponse from(Topic topic) {
        return new TopicResponse(
                topic.getId(),
                topic.getRoadmap().getId(),
                topic.getTitle(),
                topic.getDescription(),
                topic.getStatus().name(),
                topic.getDifficulty(),
                topic.getEstHours(),
                topic.getSortOrder(),
                topic.getParentId(),
                topic.getSourceRef(),
                topic.getMilestoneLabel(),
                topic.getCreatedAt(),
                topic.getUpdatedAt()
        );
    }
}
