package com.jumpstart.roadmap;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface RoadmapRepository extends JpaRepository<Roadmap, Long>, JpaSpecificationExecutor<Roadmap> {
    List<Roadmap> findByOwnerId(Long ownerId);
}
