package com.jumpstart.topic;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {
    List<ChecklistItem> findByTopicIdOrderBySortOrderAsc(Long topicId);
    void deleteByTopicId(Long topicId);
}
