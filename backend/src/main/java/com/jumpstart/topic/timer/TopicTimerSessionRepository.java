package com.jumpstart.topic.timer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TopicTimerSessionRepository extends JpaRepository<TopicTimerSession, Long> {
    List<TopicTimerSession> findByTopicIdAndUserIdOrderByCreatedAtDesc(Long topicId, Long userId);
}
