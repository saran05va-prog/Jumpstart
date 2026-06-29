package com.jumpstart.resource.dto;

import java.util.List;

public record TopicResourceGroup(
        Long topicId,
        String topicTitle,
        List<ResourceResponse> resources,
        int completedCount,
        int totalCount
) {}
