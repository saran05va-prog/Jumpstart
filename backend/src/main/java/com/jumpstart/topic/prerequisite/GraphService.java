package com.jumpstart.topic.prerequisite;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.note.NoteRepository;
import com.jumpstart.resource.ResourceRepository;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.topic.prerequisite.dto.*;
import com.jumpstart.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GraphService {

    private final TopicRepository topicRepository;
    private final TopicPrerequisiteRepository prerequisiteRepository;
    private final NoteRepository noteRepository;
    private final ResourceRepository resourceRepository;

    public GraphDTO getGraph(Long roadmapId, Long userId, Role role) {
        List<Topic> topics = topicRepository.findByRoadmapIdOrderBySortOrderAsc(roadmapId);
        if (topics.isEmpty()) return new GraphDTO(List.of(), List.of());

        Topic firstTopic = topics.getFirst();
        if (role != Role.ADMIN && !firstTopic.getRoadmap().getOwner().getId().equals(userId)) {
            throw new ForbiddenException("Not your roadmap");
        }

        List<TopicPrerequisite> prereqs = prerequisiteRepository.findByTopic_RoadmapId(roadmapId);

        Map<Long, Integer> noteCounts = new HashMap<>();
        Map<Long, Integer> resourceCounts = new HashMap<>();

        for (Topic t : topics) {
            noteCounts.put(t.getId(), noteRepository.findByTopicIdAndOwnerIdOrderByCreatedAtDesc(t.getId(), userId).size());
            resourceCounts.put(t.getId(), resourceRepository.countByTopicId(t.getId()));
        }

        List<GraphNodeDTO> nodes = topics.stream().map(t -> new GraphNodeDTO(
                t.getId(),
                t.getTitle(),
                t.getStatus().name(),
                (int) (t.getEstHours() * 60),
                noteCounts.getOrDefault(t.getId(), 0),
                resourceCounts.getOrDefault(t.getId(), 0)
        )).toList();

        List<GraphEdgeDTO> edges = prereqs.stream().map(p -> new GraphEdgeDTO(
                p.getPrerequisiteTopic().getId(),
                p.getTopic().getId(),
                "PREREQUISITE"
        )).toList();

        return new GraphDTO(nodes, edges);
    }

    @Transactional
    public void addPrerequisite(Long topicId, Long prerequisiteTopicId, Long userId, Role role) {
        Topic topic = loadTopic(topicId, userId, role);
        Topic prereq = loadTopic(prerequisiteTopicId, userId, role);
        if (prerequisiteRepository.findByTopicIdAndPrerequisiteTopicId(topicId, prerequisiteTopicId).isEmpty()) {
            prerequisiteRepository.save(TopicPrerequisite.builder()
                    .topic(topic)
                    .prerequisiteTopic(prereq)
                    .build());
        }
    }

    @Transactional
    public void removePrerequisite(Long topicId, Long prereqId, Long userId, Role role) {
        loadTopic(topicId, userId, role);
        TopicPrerequisite p = prerequisiteRepository.findById(prereqId)
                .orElseThrow(() -> new ResourceNotFoundException("Prerequisite", prereqId));
        if (!p.getTopic().getId().equals(topicId)) {
            throw new ForbiddenException("Prerequisite does not belong to this topic");
        }
        prerequisiteRepository.delete(p);
    }

    private Topic loadTopic(Long topicId, Long userId, Role role) {
        Topic topic = topicRepository.findByIdWithRoadmapAndOwner(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        if (role != Role.ADMIN && !topic.getRoadmap().getOwner().getId().equals(userId)) {
            throw new ForbiddenException("Not your topic");
        }
        return topic;
    }
}
