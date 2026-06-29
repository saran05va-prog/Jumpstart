package com.jumpstart.gamification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserXpRepository extends JpaRepository<UserXp, Long> {
    Optional<UserXp> findByUserId(Long userId);
}
