package com.jumpstart.progress.dto;

import com.jumpstart.resource.ResourceItem;
import com.jumpstart.resource.ResourceStatus;

import java.time.Instant;

public record ResourceProgressResponse(
        Long id,
        String title,
        String type,
        String url,
        String status,
        int progressPercent,
        boolean bookmarked,
        boolean favorite,
        Integer videoPositionSeconds,
        Integer lastPage,
        Long roadmapId,
        Long topicId,
        Instant updatedAt,
        Instant completedAt
) {
    public static ResourceProgressResponse from(ResourceItem r) {
        return new ResourceProgressResponse(
                r.getId(),
                r.getTitle(),
                r.getType().name(),
                r.getUrl(),
                r.getStatus().name(),
                r.getProgressPercent(),
                r.isBookmarked(),
                r.isFavorite(),
                r.getVideoPositionSeconds(),
                r.getLastPage(),
                r.getRoadmap() != null ? r.getRoadmap().getId() : null,
                r.getTopic() != null ? r.getTopic().getId() : null,
                r.getUpdatedAt(),
                r.getCompletedAt()
        );
    }
}
