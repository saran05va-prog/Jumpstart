package com.jumpstart.resource.dto;

import com.jumpstart.resource.ResourceItem;

import java.time.Instant;
import java.util.List;

public record ResourceResponse(
        Long id,
        String title,
        String type,
        String url,
        List<String> tags,
        double rating,
        boolean bookmarked,
        boolean completed,
        String duration,
        Long roadmapId,
        Long topicId,
        String status,
        boolean favorite,
        boolean hidden,
        int progressPercent,
        Integer estimatedMinutes,
        Integer actualMinutes,
        Instant startedAt,
        Instant completedAt,
        Integer lastPage,
        Integer videoPositionSeconds,
        Double readingProgress,
        Instant createdAt,
        Instant updatedAt
) {
    public static ResourceResponse from(ResourceItem r) {
        var tags = r.getTags();
        return new ResourceResponse(
                r.getId(), r.getTitle(), r.getType().name(), r.getUrl(),
                tags != null ? List.copyOf(tags) : List.of(),
                r.getRating(), r.isBookmarked(), r.isCompleted(), r.getDuration(),
                r.getRoadmap() != null ? r.getRoadmap().getId() : null,
                r.getTopic() != null ? r.getTopic().getId() : null,
                r.getStatus().name(),
                r.isFavorite(),
                r.isHidden(),
                r.getProgressPercent(),
                r.getEstimatedMinutes(),
                r.getActualMinutes(),
                r.getStartedAt(),
                r.getCompletedAt(),
                r.getLastPage(),
                r.getVideoPositionSeconds(),
                r.getReadingProgress(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
