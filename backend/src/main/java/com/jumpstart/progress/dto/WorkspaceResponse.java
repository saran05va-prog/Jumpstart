package com.jumpstart.progress.dto;

import java.util.List;

public record WorkspaceResponse(
        int dashboardProgress,
        long totalResources,
        long completedResources,
        long inProgressCount,
        List<ResourceProgressResponse> continueLearning,
        List<ResourceProgressResponse> completedToday,
        List<ResourceProgressResponse> completedThisWeek,
        List<ResourceProgressResponse> bookmarked,
        List<RoadmapProgressResponse> roadmapProgress,
        List<TopicProgressResponse> topicProgress
) {}
