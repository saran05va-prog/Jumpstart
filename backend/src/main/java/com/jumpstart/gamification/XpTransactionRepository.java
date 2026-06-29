package com.jumpstart.gamification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface XpTransactionRepository extends JpaRepository<XpTransaction, Long> {
    List<XpTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT COALESCE(SUM(x.amount), 0) FROM XpTransaction x WHERE x.user.id = :userId")
    int getTotalXp(Long userId);
}
