package com.jumpstart.progress;

import com.jumpstart.progress.dto.*;
import com.jumpstart.resource.ResourceItem;
import com.jumpstart.resource.ResourceRepository;
import com.jumpstart.resource.ResourceStatus;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Progress engine.
 *
 * <p>Computes progress bottom-up from resource completion:
 * <pre>
 *   Topic Progress    = completed resources / total resources in topic
 *   Roadmap Progress  = average of topic progress
 *   Dashboard Progress = average of roadmap progress
 * </pre>
 * Topics with zero resources fall back to the topic's own status
 * ({@link com.jumpstart.topic.TopicStatus#isCompleted()}).
 */
@Service
@RequiredArgsConstructor
public class ProgressService {

    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;
    private final ResourceRepository resourceRepository;

    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspace(Long ownerId) {
        List<Roadmap> roadmaps = roadmapRepository.findByOwnerId(ownerId).stream()
                .filter(r -> !r.isArchived()).toList();

        // ── Roadmap progress ──
        List<RoadmapProgressResponse> roadmapProgress = roadmaps.stream()
                .map(r -> buildRoadmapProgress(r, ownerId))
                .toList();

        // ── Continue learning: in-progress resources ──
        List<ResourceItem> allOwned = resourceRepository.findByOwnerId(ownerId);
        List<ResourceItem> inProgress = allOwned.stream()
                .filter(r -> r.getStatus() == ResourceStatus.IN_PROGRESS)
                .sorted(Comparator.comparing(ResourceItem::getUpdatedAt).reversed())
                .toList();

        List<ResourceProgressResponse> continueLearning = inProgress.stream()
                .limit(10)
                .map(ResourceProgressResponse::from)
                .toList();

        // ── Completed today / this week ──
        ZoneId zone = ZoneId.systemDefault();
        Instant todayStart = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        Instant weekStart = LocalDate.now(zone).with(DayOfWeek.MONDAY).atStartOfDay(zone).toInstant();

        List<ResourceProgressResponse> completedToday = allOwned.stream()
                .filter(r -> r.getCompletedAt() != null && r.getCompletedAt().isAfter(todayStart))
                .sorted(Comparator.comparing(ResourceItem::getCompletedAt).reversed())
                .map(ResourceProgressResponse::from)
                .toList();

        List<ResourceProgressResponse> completedThisWeek = allOwned.stream()
                .filter(r -> r.getCompletedAt() != null && r.getCompletedAt().isAfter(weekStart))
                .sorted(Comparator.comparing(ResourceItem::getCompletedAt).reversed())
                .map(ResourceProgressResponse::from)
                .toList();

        // ── Topic progress across all roadmaps ──
        List<TopicProgressResponse> topicProgress = new ArrayList<>();
        for (Roadmap r : roadmaps) {
            List<Topic> topics = topicRepository.findByRoadmapIdOrderBySortOrderAsc(r.getId());
            List<ResourceItem> roadmapResources = resourceRepository.findByOwnerIdAndRoadmapId(ownerId, r.getId());
            for (Topic t : topics) {
                var topicRes = roadmapResources.stream()
                        .filter(res -> res.getTopic() != null && res.getTopic().getId().equals(t.getId()))
                        .toList();
                topicProgress.add(TopicProgressResponse.from(t, r, topicRes));
            }
        }

        // ── Summary stats ──
        long totalResources = allOwned.size();
        long completedResources = allOwned.stream().filter(ResourceItem::isCompleted).count();
        long inProgressCount = inProgress.size();
        int dashboardProgress = roadmapProgress.isEmpty() ? 0
                : (int) Math.round(roadmapProgress.stream().mapToInt(RoadmapProgressResponse::progressPercent).average().orElse(0));

        // ── Bookmarked & favorites ──
        List<ResourceProgressResponse> bookmarked = allOwned.stream()
                .filter(ResourceItem::isBookmarked)
                .sorted(Comparator.comparing(ResourceItem::getUpdatedAt).reversed())
                .limit(10)
                .map(ResourceProgressResponse::from)
                .toList();

        return new WorkspaceResponse(
                dashboardProgress,
                totalResources,
                completedResources,
                inProgressCount,
                continueLearning,
                completedToday,
                completedThisWeek,
                bookmarked,
                roadmapProgress,
                topicProgress
        );
    }

    @Transactional(readOnly = true)
    public RoadmapProgressResponse getRoadmapProgress(Long roadmapId, Long ownerId) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .filter(r -> r.getOwner().getId().equals(ownerId))
                .orElseThrow();
        return buildRoadmapProgress(roadmap, ownerId);
    }

    private RoadmapProgressResponse buildRoadmapProgress(Roadmap roadmap, Long ownerId) {
        List<Topic> topics = topicRepository.findByRoadmapIdOrderBySortOrderAsc(roadmap.getId());
        List<ResourceItem> resources = resourceRepository.findByOwnerIdAndRoadmapId(ownerId, roadmap.getId());

        List<TopicProgressResponse> topicResponses = new ArrayList<>();
        for (Topic t : topics) {
            var topicRes = resources.stream()
                    .filter(r -> r.getTopic() != null && r.getTopic().getId().equals(t.getId()))
                    .toList();
            topicResponses.add(TopicProgressResponse.from(t, roadmap, topicRes));
        }

        int totalResources = resources.size();
        int completedResources = (int) resources.stream().filter(ResourceItem::isCompleted).count();

        int progress;
        if (topicResponses.isEmpty()) {
            progress = 0;
        } else {
            progress = (int) Math.round(topicResponses.stream()
                    .mapToInt(TopicProgressResponse::progressPercent)
                    .average().orElse(0));
        }

        return new RoadmapProgressResponse(
                roadmap.getId(),
                roadmap.getTitle(),
                roadmap.getColorTheme().name(),
                progress,
                topics.size(),
                totalResources,
                completedResources,
                topicResponses
        );
    }
}
