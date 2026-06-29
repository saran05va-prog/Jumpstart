package com.jumpstart.note;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoteLinkRepository extends JpaRepository<NoteLink, Long> {

    List<NoteLink> findBySourceId(Long sourceId);

    /** Backlinks: all links where the target is this note. */
    List<NoteLink> findByTargetId(Long targetId);

    void deleteBySourceId(Long sourceId);

    long countByTargetId(Long targetId);
}
