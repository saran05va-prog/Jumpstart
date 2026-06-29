package com.jumpstart.gamification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    List<UserBadge> findByUserId(Long userId);
    Optional<UserBadge> findByUserIdAndAchievementCode(Long userId, String achievementCode);
    boolean existsByUserIdAndAchievementCode(Long userId, String achievementCode);
}
