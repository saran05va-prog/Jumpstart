package com.jumpstart.resource;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ResourceRepository extends JpaRepository<ResourceItem, Long>, JpaSpecificationExecutor<ResourceItem> {
    List<ResourceItem> findByOwnerId(Long ownerId);
    int countByTopicId(Long topicId);

    List<ResourceItem> findByOwnerIdAndRoadmapId(Long ownerId, Long roadmapId);
    List<ResourceItem> findByOwnerIdAndRoadmapIdAndTopicId(Long ownerId, Long roadmapId, Long topicId);

    long countByOwnerIdAndRoadmapId(Long ownerId, Long roadmapId);
    long countByOwnerIdAndRoadmapIdAndStatus(Long ownerId, Long roadmapId, ResourceStatus status);
    long countByOwnerIdAndRoadmapIdAndTopicId(Long ownerId, Long roadmapId, Long topicId);
    long countByOwnerIdAndRoadmapIdAndTopicIdAndStatus(Long ownerId, Long roadmapId, Long topicId, ResourceStatus status);
}
