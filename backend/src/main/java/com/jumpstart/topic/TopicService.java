package com.jumpstart.topic;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.topic.dto.ReorderRequest;
import com.jumpstart.topic.dto.TopicRequest;
import com.jumpstart.topic.dto.TopicResponse;
import com.jumpstart.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TopicService {

    private final TopicRepository topicRepository;
    private final RoadmapRepository roadmapRepository;

    public List<TopicResponse> listByRoadmap(Long roadmapId, Long requesterId, Role requesterRole) {
        Roadmap roadmap = loadOwnedRoadmap(roadmapId, requesterId, requesterRole);
        return topicRepository.findByRoadmapIdOrderBySortOrderAsc(roadmap.getId())
                .stream().map(TopicResponse::from).toList();
    }

    @Transactional
    public TopicResponse create(Long roadmapId, TopicRequest request, Long requesterId, Role requesterRole) {
        Roadmap roadmap = loadOwnedRoadmap(roadmapId, requesterId, requesterRole);

        Topic topic = Topic.builder()
                .roadmap(roadmap)
                .title(request.title())
                .description(request.description())
                .status(TopicStatus.valueOf(request.status()))
                .difficulty(request.difficulty())
                .estHours(request.estHours())
                .sortOrder(request.sortOrder())
                .milestoneLabel(request.milestoneLabel())
                .build();

        return TopicResponse.from(topicRepository.save(topic));
    }

    @Transactional
    public TopicResponse update(Long topicId, TopicRequest request, Long requesterId, Role requesterRole) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        assertOwnership(topic.getRoadmap(), requesterId, requesterRole);

        topic.setTitle(request.title());
        topic.setDescription(request.description());
        topic.setStatus(TopicStatus.valueOf(request.status()));
        topic.setDifficulty(request.difficulty());
        topic.setEstHours(request.estHours());
        topic.setSortOrder(request.sortOrder());
        topic.setMilestoneLabel(request.milestoneLabel());

        return TopicResponse.from(topicRepository.save(topic));
    }

    @Transactional
    public void delete(Long topicId, Long requesterId, Role requesterRole) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        assertOwnership(topic.getRoadmap(), requesterId, requesterRole);
        topicRepository.delete(topic);
    }

    @Transactional
    public List<TopicResponse> reorder(Long roadmapId, List<ReorderRequest.TopicOrder> orders, Long requesterId, Role requesterRole) {
        Roadmap roadmap = loadOwnedRoadmap(roadmapId, requesterId, requesterRole);
        Map<Long, Integer> orderMap = orders.stream()
                .collect(Collectors.toMap(ReorderRequest.TopicOrder::topicId, ReorderRequest.TopicOrder::orderIndex));
        List<Topic> topics = topicRepository.findByRoadmapIdOrderBySortOrderAsc(roadmap.getId());
        for (Topic topic : topics) {
            if (orderMap.containsKey(topic.getId())) {
                topic.setSortOrder(orderMap.get(topic.getId()));
            }
        }
        topicRepository.saveAll(topics);
        return topics.stream()
                .sorted(Comparator.comparingInt(Topic::getSortOrder))
                .map(TopicResponse::from)
                .toList();
    }

    private Roadmap loadOwnedRoadmap(Long roadmapId, Long requesterId, Role requesterRole) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new ResourceNotFoundException("Roadmap", roadmapId));
        assertOwnership(roadmap, requesterId, requesterRole);
        return roadmap;
    }

    private void assertOwnership(Roadmap roadmap, Long requesterId, Role requesterRole) {
        if (requesterRole != Role.ADMIN && !roadmap.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this roadmap");
        }
    }
}
