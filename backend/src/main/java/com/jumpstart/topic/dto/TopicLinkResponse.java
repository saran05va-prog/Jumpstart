package com.jumpstart.topic.dto;

import com.jumpstart.topic.TopicLink;

import java.time.Instant;

public record TopicLinkResponse(
        Long id,
        Long topicId,
        String label,
        String uri,
        Instant createdAt
) {
    public static TopicLinkResponse from(TopicLink link) {
        return new TopicLinkResponse(
                link.getId(),
                link.getTopic().getId(),
                link.getLabel(),
                link.getUri(),
                link.getCreatedAt()
        );
    }
}
