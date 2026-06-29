package com.jumpstart.roadmap.dto;

import com.jumpstart.roadmap.Roadmap;

import java.time.Instant;

public record RoadmapResponse(
        Long id,
        String title,
        String description,
        String tag,
        String colorTheme,
        boolean archived,
        int topicCount,
        int progressPercent,
        Instant createdAt,
        Instant updatedAt
) {
    public static RoadmapResponse from(Roadmap roadmap) {
        var topics = roadmap.getTopics();
        long done = topics.stream().filter(t -> t.getStatus().isCompleted()).count();
        long totalChecklistItems = topics.stream()
                .flatMap(t -> t.getChecklist() == null ? java.util.stream.Stream.empty() : t.getChecklist().stream())
                .count();
        long doneChecklistItems = topics.stream()
                .flatMap(t -> t.getChecklist() == null ? java.util.stream.Stream.empty() : t.getChecklist().stream())
                .filter(c -> c.isCompleted())
                .count();

        int progress;
        if (!topics.isEmpty()) {
            double topicProgress = (done * 100.0) / topics.size();
            double checklistProgress = totalChecklistItems > 0
                    ? (doneChecklistItems * 100.0) / totalChecklistItems
                    : 0;
            progress = (int) Math.round(topicProgress * 0.6 + checklistProgress * 0.4);
        } else {
            progress = 0;
        }

        return new RoadmapResponse(
                roadmap.getId(),
                roadmap.getTitle(),
                roadmap.getDescription(),
                roadmap.getTag(),
                roadmap.getColorTheme().name(),
                roadmap.isArchived(),
                topics.size(),
                progress,
                roadmap.getCreatedAt(),
                roadmap.getUpdatedAt()
        );
    }
}
