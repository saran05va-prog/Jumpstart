package com.jumpstart.topic.timer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TopicTimerStateRepository extends JpaRepository<TopicTimerState, Long> {
    Optional<TopicTimerState> findByTopicIdAndUserId(Long topicId, Long userId);
    Optional<TopicTimerState> findByUserIdAndStatus(Long userId, String status);
}
