package com.jumpstart.roadmap;

import org.springframework.data.jpa.domain.Specification;

/**
 * Composable filter predicates for the roadmap listing endpoint
 * (GET /api/roadmaps?ownerId=&tag=&archived=).
 */
public final class RoadmapSpecifications {

    private RoadmapSpecifications() {}

    public static Specification<Roadmap> ownedBy(Long ownerId) {
        return (root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId);
    }

    public static Specification<Roadmap> hasTag(String tag) {
        return (root, query, cb) -> tag == null || tag.isBlank()
                ? cb.conjunction()
                : cb.equal(cb.lower(root.get("tag")), tag.toLowerCase());
    }

    public static Specification<Roadmap> isArchived(Boolean archived) {
        return (root, query, cb) -> archived == null
                ? cb.conjunction()
                : cb.equal(root.get("archived"), archived);
    }

    public static Specification<Roadmap> titleContains(String q) {
        return (root, query, cb) -> (q == null || q.isBlank())
                ? cb.conjunction()
                : cb.like(cb.lower(root.get("title")), "%" + q.toLowerCase() + "%");
    }
}
