package com.jumpstart.resource;

import org.springframework.data.jpa.domain.Specification;

public final class ResourceSpecifications {

    private ResourceSpecifications() {}

    public static Specification<ResourceItem> ownedBy(Long ownerId) {
        return (root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId);
    }

    public static Specification<ResourceItem> hasType(ResourceType type) {
        return (root, query, cb) -> type == null ? cb.conjunction() : cb.equal(root.get("type"), type);
    }

    public static Specification<ResourceItem> isBookmarked(Boolean bookmarked) {
        return (root, query, cb) -> bookmarked == null ? cb.conjunction() : cb.equal(root.get("bookmarked"), bookmarked);
    }

    public static Specification<ResourceItem> titleContains(String q) {
        return (root, query, cb) -> (q == null || q.isBlank())
                ? cb.conjunction()
                : cb.like(cb.lower(root.get("title")), "%" + q.toLowerCase() + "%");
    }

    public static Specification<ResourceItem> hasTopicId(Long topicId) {
        return (root, query, cb) -> topicId == null
                ? cb.conjunction()
                : cb.equal(root.get("topic").get("id"), topicId);
    }

    public static Specification<ResourceItem> hasRoadmapId(Long roadmapId) {
        return (root, query, cb) -> roadmapId == null
                ? cb.conjunction()
                : cb.equal(root.get("roadmap").get("id"), roadmapId);
    }

    public static Specification<ResourceItem> completed(Boolean completed) {
        return (root, query, cb) -> completed == null
                ? cb.conjunction()
                : cb.equal(root.get("completed"), completed);
    }

    public static Specification<ResourceItem> hasTag(String tag) {
        return (root, query, cb) -> (tag == null || tag.isBlank())
                ? cb.conjunction()
                : cb.isMember(tag, root.get("tags"));
    }

    public static Specification<ResourceItem> hasStatus(ResourceStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<ResourceItem> isFavorite(Boolean favorite) {
        return (root, query, cb) -> favorite == null ? cb.conjunction() : cb.equal(root.get("favorite"), favorite);
    }

    public static Specification<ResourceItem> isHidden(Boolean hidden) {
        return (root, query, cb) -> hidden == null ? cb.conjunction() : cb.equal(root.get("hidden"), hidden);
    }
}
