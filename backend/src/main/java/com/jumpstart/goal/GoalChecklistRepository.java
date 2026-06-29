package com.jumpstart.goal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GoalChecklistRepository extends JpaRepository<GoalChecklistItem, Long> {
    List<GoalChecklistItem> findByGoalIdOrderByOrderIndexAsc(Long goalId);
    void deleteByGoalId(Long goalId);
}
