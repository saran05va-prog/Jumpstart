package com.jumpstart.goal;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    Page<Goal> findByOwnerId(Long ownerId, Pageable pageable);
    Page<Goal> findByOwnerIdAndCadence(Long ownerId, Cadence cadence, Pageable pageable);
    Page<Goal> findByOwnerIdAndStatus(Long ownerId, String status, Pageable pageable);
    Page<Goal> findByOwnerIdAndTopicId(Long ownerId, Long topicId, Pageable pageable);
    List<Goal> findByOwnerId(Long ownerId);
    List<Goal> findByOwnerIdAndTopicId(Long ownerId, Long topicId);
    List<Goal> findByOwnerIdAndTopicIdAndStatus(Long ownerId, Long topicId, String status);
}
