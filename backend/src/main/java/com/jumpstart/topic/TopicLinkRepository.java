package com.jumpstart.topic;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TopicLinkRepository extends JpaRepository<TopicLink, Long> {
    List<TopicLink> findByTopicIdOrderByCreatedAtDesc(Long topicId);
}
