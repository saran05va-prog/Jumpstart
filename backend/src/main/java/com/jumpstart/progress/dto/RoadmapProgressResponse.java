package com.jumpstart.progress.dto;

import java.util.List;

public record RoadmapProgressResponse(
        Long roadmapId,
        String roadmapTitle,
        String colorTheme,
        int progressPercent,
        int topicCount,
        int totalResources,
        int completedResources,
        List<TopicProgressResponse> topics
) {}
