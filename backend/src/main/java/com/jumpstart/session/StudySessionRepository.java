package com.jumpstart.session;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    List<StudySession> findByOwnerIdAndSessionDateBetweenOrderBySessionDateAsc(
            Long ownerId, LocalDate start, LocalDate end);

    List<StudySession> findByOwnerIdOrderBySessionDateDesc(Long ownerId);
}
