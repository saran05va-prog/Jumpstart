package com.jumpstart.topic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TopicRepository extends JpaRepository<Topic, Long> {
    List<Topic> findByRoadmapIdOrderBySortOrderAsc(Long roadmapId);
    long countByRoadmapIdAndStatus(Long roadmapId, TopicStatus status);

    @Query("SELECT t FROM Topic t WHERE t.roadmap.owner.id = :ownerId AND LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Topic> searchByOwnerAndTitle(@Param("ownerId") Long ownerId, @Param("q") String q);

    @Query("SELECT t FROM Topic t JOIN FETCH t.roadmap r JOIN FETCH r.owner WHERE t.id = :id")
    Optional<Topic> findByIdWithRoadmapAndOwner(@Param("id") Long id);
}
