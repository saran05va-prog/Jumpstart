package com.jumpstart.topic.prerequisite;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TopicPrerequisiteRepository extends JpaRepository<TopicPrerequisite, Long> {
    List<TopicPrerequisite> findByTopicId(Long topicId);
    List<TopicPrerequisite> findByTopic_RoadmapId(Long roadmapId);
    Optional<TopicPrerequisite> findByTopicIdAndPrerequisiteTopicId(Long topicId, Long prerequisiteTopicId);
}
