package com.jumpstart.note;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NoteRepository extends JpaRepository<Note, Long> {
    Page<Note> findByOwnerIdAndTitleContainingIgnoreCase(Long ownerId, String title, Pageable pageable);
    Page<Note> findByOwnerId(Long ownerId, Pageable pageable);
    List<Note> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId);
    List<Note> findByTopicIdAndOwnerIdOrderByCreatedAtDesc(Long topicId, Long ownerId);
    List<Note> findByTopicIdAndOwnerIdOrderByIsPinnedDescUpdatedAtDesc(Long topicId, Long ownerId);
    Optional<Note> findByTopicIdAndOwnerId(Long topicId, Long ownerId);
    List<Note> findByRoadmapIdAndOwnerIdOrderByCreatedAtDesc(Long roadmapId, Long ownerId);
    List<Note> findByOwnerIdAndIsStarredTrueOrderByUpdatedAtDesc(Long ownerId);
    List<Note> findByOwnerIdAndIsPinnedTrueOrderByUpdatedAtDesc(Long ownerId);

    @Query("SELECT n FROM Note n WHERE n.owner.id = :ownerId AND " +
           "(LOWER(n.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(cast(n.content as string)) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Note> searchByOwner(@Param("ownerId") Long ownerId, @Param("q") String q);

    @Query("SELECT n FROM Note n WHERE n.owner.id = :ownerId ORDER BY n.lastViewedAt DESC NULLS LAST, n.updatedAt DESC")
    List<Note> findRecentlyViewed(@Param("ownerId") Long ownerId, Pageable pageable);

    List<Note> findByOwnerIdOrderByLastViewedAtDesc(Long ownerId);

    // Needed for vault sync
    Optional<Note> findByOwnerIdAndVaultPath(Long ownerId, String vaultPath);
}
