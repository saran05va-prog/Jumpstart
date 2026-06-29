package com.jumpstart.activity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface RecentActivityRepository extends JpaRepository<RecentActivity, Long> {

    List<RecentActivity> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    Page<RecentActivity> findByOwnerIdOrderByCreatedAtDesc(Long ownerId, Pageable pageable);

    List<RecentActivity> findByOwnerIdAndCreatedAtAfterOrderByCreatedAtDesc(Long ownerId, Instant after);

    long countByOwnerIdAndCreatedAtAfter(Long ownerId, Instant after);
}
