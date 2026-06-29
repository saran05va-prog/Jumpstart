package com.jumpstart.project.dto;

import com.jumpstart.project.Project;

import java.time.Instant;

public record ProjectResponse(
        Long id,
        String title,
        String summary,
        String githubUrl,
        String demoUrl,
        boolean completed,
        Long topicId,
        Long roadmapId,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProjectResponse from(Project p) {
        return new ProjectResponse(
                p.getId(),
                p.getTitle(),
                p.getSummary(),
                p.getGithubUrl(),
                p.getDemoUrl(),
                p.isCompleted(),
                p.getTopic() != null ? p.getTopic().getId() : null,
                p.getRoadmap() != null ? p.getRoadmap().getId() : null,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
