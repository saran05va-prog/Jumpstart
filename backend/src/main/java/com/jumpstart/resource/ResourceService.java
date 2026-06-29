package com.jumpstart.resource;

import com.jumpstart.activity.RecentActivityService;
import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.resource.dto.ResourceRequest;
import com.jumpstart.resource.dto.ResourceResponse;
import com.jumpstart.resource.dto.TagCount;
import com.jumpstart.resource.dto.TopicResourceGroup;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;
    private final RecentActivityService recentActivityService;

    @Transactional
    public ResourceResponse create(ResourceRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId).orElseThrow(() -> new ResourceNotFoundException("User", ownerId));

        Roadmap roadmap = resolveRoadmap(request.roadmapId(), ownerId);
        Topic topic = resolveTopic(request.topicId(), ownerId);

        ResourceStatus status = request.status() != null
                ? ResourceStatus.fromString(request.status())
                : (request.completed() ? ResourceStatus.COMPLETED : ResourceStatus.NOT_STARTED);

        ResourceItem item = ResourceItem.builder()
                .owner(owner)
                .roadmap(roadmap)
                .topic(topic)
                .title(request.title())
                .type(ResourceType.valueOf(request.type()))
                .url(request.url())
                .tags(request.tags() != null ? request.tags() : List.of())
                .rating(request.rating())
                .bookmarked(request.bookmarked())
                .completed(request.completed())
                .duration(request.duration())
                .status(status)
                .favorite(request.favorite() != null && request.favorite())
                .hidden(request.hidden() != null && request.hidden())
                .progressPercent(request.progressPercent() != null ? request.progressPercent() : 0)
                .estimatedMinutes(request.estimatedMinutes())
                .actualMinutes(request.actualMinutes())
                .lastPage(request.lastPage())
                .videoPositionSeconds(request.videoPositionSeconds())
                .readingProgress(request.readingProgress())
                .startedAt(status == ResourceStatus.IN_PROGRESS || status == ResourceStatus.COMPLETED ? Instant.now() : null)
                .build();
        item.syncLegacyCompleted();

        ResourceResponse resp = ResourceResponse.from(resourceRepository.save(item));
        recentActivityService.record(ownerId, "RESOURCE_CREATED", "Resource", item.getId(),
                "Saved resource: " + item.getTitle(), roadmap != null ? roadmap.getTitle() : null);
        return resp;
    }

    @Transactional(readOnly = true)
    public PageResponse<ResourceResponse> list(Long ownerId, ResourceType type, Boolean bookmarked,
                                               String q, Long topicId, Long roadmapId, Boolean completed,
                                               String tag, ResourceStatus status, Boolean favorite,
                                               Boolean hidden, Pageable pageable) {
        var spec = ResourceSpecifications.ownedBy(ownerId)
                .and(ResourceSpecifications.hasType(type))
                .and(ResourceSpecifications.isBookmarked(bookmarked))
                .and(ResourceSpecifications.titleContains(q))
                .and(ResourceSpecifications.hasTopicId(topicId))
                .and(ResourceSpecifications.hasRoadmapId(roadmapId))
                .and(ResourceSpecifications.completed(completed))
                .and(ResourceSpecifications.hasTag(tag))
                .and(ResourceSpecifications.hasStatus(status))
                .and(ResourceSpecifications.isFavorite(favorite))
                .and(ResourceSpecifications.isHidden(hidden));

        return PageResponse.from(resourceRepository.findAll(spec, pageable).map(ResourceResponse::from));
    }

    @Transactional(readOnly = true)
    public List<TagCount> getTagCounts(Long ownerId) {
        var owned = resourceRepository.findByOwnerId(ownerId);
        Map<String, Long> counts = owned.stream()
                .flatMap(r -> {
                    var tags = r.getTags();
                    return tags != null ? tags.stream() : java.util.stream.Stream.empty();
                })
                .filter(t -> t != null && !t.isBlank())
                .collect(Collectors.groupingBy(t -> t, Collectors.counting()));
        return counts.entrySet().stream()
                .map(e -> new TagCount(e.getKey(), e.getValue()))
                .sorted((a, b) -> a.tag().compareToIgnoreCase(b.tag()))
                .toList();
    }

    @Transactional
    public ResourceResponse update(Long id, ResourceRequest request, Long requesterId, Role requesterRole) {
        ResourceItem item = loadOwned(id, requesterId, requesterRole);
        item.setTitle(request.title());
        item.setType(ResourceType.valueOf(request.type()));
        item.setUrl(request.url());
        item.setTags(request.tags() != null ? request.tags() : List.of());
        item.setRating(request.rating());
        item.setBookmarked(request.bookmarked());
        item.setCompleted(request.completed());
        item.setDuration(request.duration());
        if (request.status() != null) {
            item.setStatus(ResourceStatus.fromString(request.status()));
        }
        if (request.favorite() != null) item.setFavorite(request.favorite());
        if (request.hidden() != null) item.setHidden(request.hidden());
        if (request.progressPercent() != null) item.setProgressPercent(request.progressPercent());
        if (request.estimatedMinutes() != null) item.setEstimatedMinutes(request.estimatedMinutes());
        if (request.actualMinutes() != null) item.setActualMinutes(request.actualMinutes());
        if (request.lastPage() != null) item.setLastPage(request.lastPage());
        if (request.videoPositionSeconds() != null) item.setVideoPositionSeconds(request.videoPositionSeconds());
        if (request.readingProgress() != null) item.setReadingProgress(request.readingProgress());
        item.syncLegacyCompleted();
        return ResourceResponse.from(resourceRepository.save(item));
    }

    @Transactional
    public ResourceResponse toggleBookmark(Long id, Long requesterId, Role requesterRole) {
        ResourceItem item = loadOwned(id, requesterId, requesterRole);
        item.setBookmarked(!item.isBookmarked());
        return ResourceResponse.from(resourceRepository.save(item));
    }

    @Transactional
    public ResourceResponse toggleFavorite(Long id, Long requesterId, Role requesterRole) {
        ResourceItem item = loadOwned(id, requesterId, requesterRole);
        item.setFavorite(!item.isFavorite());
        return ResourceResponse.from(resourceRepository.save(item));
    }

    /**
     * Quick-complete cycle: NOT_STARTED → IN_PROGRESS → COMPLETED → NOT_STARTED.
     * One click advances the state. This is the primary UX for marking resources.
     */
    @Transactional
    public ResourceResponse cycleStatus(Long id, Long requesterId, Role requesterRole) {
        ResourceItem item = loadOwned(id, requesterId, requesterRole);
        ResourceStatus prev = item.getStatus();
        ResourceStatus next = prev.next();
        item.setStatus(next);

        if (next == ResourceStatus.IN_PROGRESS && item.getStartedAt() == null) {
            item.setStartedAt(Instant.now());
        }
        item.syncLegacyCompleted();

        ResourceResponse resp = ResourceResponse.from(resourceRepository.save(item));

        String activityType = switch (next) {
            case IN_PROGRESS -> "RESOURCE_STARTED";
            case COMPLETED -> "RESOURCE_COMPLETED";
            default -> "RESOURCE_RESET";
        };
        String subtitle = switch (next) {
            case IN_PROGRESS -> "Marked in progress";
            case COMPLETED -> "Completed";
            default -> "Reset to not started";
        };
        recentActivityService.record(requesterId, activityType, "Resource", item.getId(),
                item.getTitle(), subtitle);

        return resp;
    }

    /** Legacy toggle — delegates to the cycle for backward compatibility. */
    @Transactional
    public ResourceResponse toggleCompleted(Long id, Long requesterId, Role requesterRole) {
        return cycleStatus(id, requesterId, requesterRole);
    }

    /**
     * Explicit status set with progress metadata (video position, page, percent).
     */
    @Transactional
    public ResourceResponse setStatus(Long id, ResourceStatus status, Integer progressPercent,
                                      Integer videoPositionSeconds, Integer lastPage,
                                      Double readingProgress, Long requesterId, Role requesterRole) {
        ResourceItem item = loadOwned(id, requesterId, requesterRole);
        item.setStatus(status);
        if (status == ResourceStatus.IN_PROGRESS && item.getStartedAt() == null) {
            item.setStartedAt(Instant.now());
        }
        if (progressPercent != null) item.setProgressPercent(progressPercent);
        if (videoPositionSeconds != null) item.setVideoPositionSeconds(videoPositionSeconds);
        if (lastPage != null) item.setLastPage(lastPage);
        if (readingProgress != null) item.setReadingProgress(readingProgress);
        item.syncLegacyCompleted();
        return ResourceResponse.from(resourceRepository.save(item));
    }

    @Transactional
    public void delete(Long id, Long requesterId, Role requesterRole) {
        resourceRepository.delete(loadOwned(id, requesterId, requesterRole));
    }

    public List<TopicResourceGroup> getByTopic(Long roadmapId, Long ownerId) {
        var topics = topicRepository.findByRoadmapIdOrderBySortOrderAsc(roadmapId);
        var resources = resourceRepository.findByOwnerId(ownerId).stream()
                .filter(r -> r.getRoadmap() != null && r.getRoadmap().getId().equals(roadmapId))
                .collect(Collectors.groupingBy(r -> r.getTopic() != null ? r.getTopic().getId() : -1L));
        var groups = new ArrayList<TopicResourceGroup>();
        for (var topic : topics) {
            var topicResources = resources.getOrDefault(topic.getId(), List.of());
            var responses = topicResources.stream().map(ResourceResponse::from).toList();
            int completed = (int) topicResources.stream().filter(ResourceItem::isCompleted).count();
            groups.add(new TopicResourceGroup(topic.getId(), topic.getTitle(), responses, completed, responses.size()));
        }
        var unassigned = resources.getOrDefault(-1L, List.of());
        if (!unassigned.isEmpty()) {
            var responses = unassigned.stream().map(ResourceResponse::from).toList();
            int completed = (int) unassigned.stream().filter(ResourceItem::isCompleted).count();
            groups.add(new TopicResourceGroup(-1L, "Unassigned", responses, completed, responses.size()));
        }
        return groups;
    }

    private Roadmap resolveRoadmap(Long roadmapId, Long ownerId) {
        if (roadmapId == null) return null;
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new ResourceNotFoundException("Roadmap", roadmapId));
        if (!roadmap.getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("You do not have access to this roadmap");
        }
        return roadmap;
    }

    private Topic resolveTopic(Long topicId, Long ownerId) {
        if (topicId == null) return null;
        Topic topic = topicRepository.findByIdWithRoadmapAndOwner(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        if (!topic.getRoadmap().getOwner().getId().equals(ownerId)) {
            throw new ForbiddenException("You do not have access to this topic");
        }
        return topic;
    }

    private ResourceItem loadOwned(Long id, Long requesterId, Role requesterRole) {
        ResourceItem item = resourceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Resource", id));
        if (requesterRole != Role.ADMIN && !item.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this resource");
        }
        return item;
    }
}
