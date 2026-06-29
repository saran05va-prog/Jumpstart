package com.jumpstart.progress.dto;

import com.jumpstart.resource.ResourceItem;
import com.jumpstart.topic.Topic;
import com.jumpstart.roadmap.Roadmap;

import java.util.List;

public record TopicProgressResponse(
        Long topicId,
        String topicTitle,
        Long roadmapId,
        String roadmapTitle,
        String status,
        int progressPercent,
        int totalResources,
        int completedResources
) {
    public static TopicProgressResponse from(Topic topic, Roadmap roadmap, List<ResourceItem> resources) {
        int total = resources.size();
        int completed = (int) resources.stream().filter(ResourceItem::isCompleted).count();
        int progress;
        if (total > 0) {
            progress = Math.round((completed * 100f) / total);
        } else {
            progress = topic.getStatus().isCompleted() ? 100 : 0;
        }
        return new TopicProgressResponse(
                topic.getId(),
                topic.getTitle(),
                roadmap.getId(),
                roadmap.getTitle(),
                topic.getStatus().name(),
                progress,
                total,
                completed
        );
    }
}
