package com.jumpstart.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<Project> findByOwnerIdAndTopicIdOrderByCreatedAtDesc(Long ownerId, Long topicId);

    List<Project> findByOwnerIdAndRoadmapIdOrderByCreatedAtDesc(Long ownerId, Long roadmapId);
}
