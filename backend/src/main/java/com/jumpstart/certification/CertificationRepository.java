package com.jumpstart.certification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CertificationRepository extends JpaRepository<Certification, Long> {
    Page<Certification> findByOwnerId(Long ownerId, Pageable pageable);
    List<Certification> findByOwnerId(Long ownerId);
}
