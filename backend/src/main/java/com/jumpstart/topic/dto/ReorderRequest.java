package com.jumpstart.topic.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ReorderRequest(
        @NotEmpty List<TopicOrder> topicOrders
) {
    public record TopicOrder(Long topicId, int orderIndex) {}
}
