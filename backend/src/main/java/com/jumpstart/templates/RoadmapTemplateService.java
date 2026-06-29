package com.jumpstart.templates;

import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.resource.ResourceItem;
import com.jumpstart.resource.ResourceRepository;
import com.jumpstart.resource.ResourceType;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapColor;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.roadmap.dto.RoadmapResponse;
import com.jumpstart.topic.*;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class RoadmapTemplateService {

    private final RoadmapTemplateLoader loader;
    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;
    private final TopicEdgeRepository topicEdgeRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;

    public List<Map<String, Object>> listTemplates() {
        return loader.listAll().stream().map(ir -> {
            RoadmapTemplateIr.Roadmap meta = ir.getRoadmap();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", meta.getKey());
            m.put("title", meta.getTitle());
            m.put("description", meta.getDescription());
            m.put("tag", meta.getCategory());
            m.put("colorTheme", meta.getColorTheme());
            int topicCount = ir.getTopics().stream()
                    .mapToInt(t -> 1 + (t.getChildren() != null ? t.getChildren().size() : 0))
                    .sum();
            m.put("topicCount", topicCount);
            m.put("source", ir.getSource() != null ? ir.getSource().getId() : "roadmap.sh");
            return m;
        }).toList();
    }

    @Transactional
    public RoadmapResponse importTemplate(String templateKey, Long ownerId) {
        RoadmapTemplateIr ir = loader.getByKey(templateKey);
        if (ir == null) {
            throw new ResourceNotFoundException("Template", templateKey);
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerId));

        RoadmapTemplateIr.Roadmap meta = ir.getRoadmap();
        Roadmap roadmap = Roadmap.builder()
                .owner(owner)
                .title(meta.getTitle())
                .description(meta.getDescription())
                .tag(meta.getCategory())
                .colorTheme(parseColorTheme(meta.getColorTheme()))
                .archived(false)
                .build();
        roadmap = roadmapRepository.save(roadmap);

        /* ── Build topics (parents first, then children) ── */
        Map<String, Topic> refToDbTopic = new LinkedHashMap<>();
        Map<String, RoadmapTemplateIr.Topic> irTopicByRef = new LinkedHashMap<>();
        List<ResourceItem> resources = new ArrayList<>();

        int globalOrder = 0;
        for (RoadmapTemplateIr.Topic irTopic : ir.getTopics()) {
            irTopicByRef.put(irTopic.getId(), irTopic);
            Topic parent = buildTopic(roadmap, irTopic, null, globalOrder++, owner);
            parent = topicRepository.save(parent);
            refToDbTopic.put(irTopic.getId(), parent);

            if (irTopic.getChildren() != null) {
                for (RoadmapTemplateIr.Topic irChild : irTopic.getChildren()) {
                    irTopicByRef.put(irChild.getId(), irChild);
                    Topic child = buildTopic(roadmap, irChild, parent.getId(), globalOrder++, owner);
                    child = topicRepository.save(child);
                    refToDbTopic.put(irChild.getId(), child);
                }
            }
        }

        /* ── Create ResourceItem entries for each topic's resources ── */
        for (Map.Entry<String, Topic> entry : refToDbTopic.entrySet()) {
            RoadmapTemplateIr.Topic irTopic = irTopicByRef.get(entry.getKey());
            if (irTopic == null || irTopic.getResources() == null) continue;
            for (RoadmapTemplateIr.Resource irRes : irTopic.getResources()) {
                ResourceType rt;
                try {
                    rt = ResourceType.valueOf(irRes.getType());
                } catch (IllegalArgumentException e) {
                    rt = ResourceType.CUSTOM;
                }
                resources.add(ResourceItem.builder()
                        .owner(owner)
                        .roadmap(roadmap)
                        .topic(entry.getValue())
                        .title(irRes.getTitle())
                        .type(rt)
                        .url(irRes.getUrl())
                        .rating(0)
                        .bookmarked(false)
                        .completed(false)
                        .build());
            }
        }
        if (!resources.isEmpty()) {
            resourceRepository.saveAll(resources);
        }

        /* ── Create TopicEdge for prerequisite/related graph ── */
        if (ir.getEdges() != null) {
            List<TopicEdge> edges = new ArrayList<>();
            for (RoadmapTemplateIr.Edge irEdge : ir.getEdges()) {
                Topic from = refToDbTopic.get(irEdge.getFrom());
                Topic to = refToDbTopic.get(irEdge.getTo());
                if (from != null && to != null) {
                    EdgeType edgeType = "prerequisite".equals(irEdge.getType())
                            ? EdgeType.PREREQUISITE
                            : EdgeType.RELATED;
                    edges.add(TopicEdge.builder()
                            .roadmap(roadmap)
                            .fromTopic(from)
                            .toTopic(to)
                            .edgeType(edgeType)
                            .build());
                }
            }
            if (!edges.isEmpty()) {
                topicEdgeRepository.saveAll(edges);
            }
        }

        /* ── Build response ── */
        int totalTopics = refToDbTopic.size();
        return new RoadmapResponse(
                roadmap.getId(),
                roadmap.getTitle(),
                roadmap.getDescription(),
                roadmap.getTag(),
                roadmap.getColorTheme().name(),
                roadmap.isArchived(),
                totalTopics,
                0,
                roadmap.getCreatedAt(),
                roadmap.getUpdatedAt()
        );
    }

    private Topic buildTopic(Roadmap roadmap, RoadmapTemplateIr.Topic irTopic, Long parentId,
                             int sortOrder, User owner) {
        return Topic.builder()
                .roadmap(roadmap)
                .title(irTopic.getTitle())
                .description(irTopic.getDescription())
                .status(TopicStatus.NOT_STARTED)
                .difficulty(irTopic.getDifficulty() >= 1 ? irTopic.getDifficulty() : 1)
                .estHours(irTopic.getEstHours() > 0 ? irTopic.getEstHours() : 1.0)
                .sortOrder(sortOrder)
                .parentId(parentId)
                .sourceRef(irTopic.getId())
                .build();
    }

    private RoadmapColor parseColorTheme(String colorTheme) {
        try {
            return RoadmapColor.valueOf(colorTheme);
        } catch (IllegalArgumentException e) {
            return RoadmapColor.MOSS;
        }
    }

    public Map<String, Object> getTemplatePreview(String templateKey) {
        RoadmapTemplateIr ir = loader.getByKey(templateKey);
        if (ir == null) {
            throw new ResourceNotFoundException("Template", templateKey);
        }

        RoadmapTemplateIr.Roadmap meta = ir.getRoadmap();
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("key", meta.getKey());
        preview.put("title", meta.getTitle());
        preview.put("description", meta.getDescription());
        preview.put("category", meta.getCategory());
        preview.put("colorTheme", meta.getColorTheme());

        List<Map<String, Object>> topicList = new ArrayList<>();
        if (ir.getTopics() != null) {
            for (RoadmapTemplateIr.Topic t : ir.getTopics()) {
                Map<String, Object> tm = new LinkedHashMap<>();
                tm.put("id", t.getId());
                tm.put("title", t.getTitle());
                tm.put("description", t.getDescription());
                tm.put("difficulty", t.getDifficulty());
                tm.put("estHours", t.getEstHours());
                int resCount = t.getResources() != null ? t.getResources().size() : 0;
                int childCount = t.getChildren() != null ? t.getChildren().size() : 0;
                if (t.getChildren() != null) {
                    List<Map<String, Object>> children = new ArrayList<>();
                    for (RoadmapTemplateIr.Topic c : t.getChildren()) {
                        Map<String, Object> cm = new LinkedHashMap<>();
                        cm.put("id", c.getId());
                        cm.put("title", c.getTitle());
                        cm.put("description", c.getDescription());
                        cm.put("difficulty", c.getDifficulty());
                        cm.put("estHours", c.getEstHours());
                        children.add(cm);
                    }
                    tm.put("children", children);
                }
                tm.put("resourceCount", resCount);
                tm.put("childCount", childCount);
                topicList.add(tm);
            }
        }
        preview.put("topics", topicList);

        int edgeCount = ir.getEdges() != null ? ir.getEdges().size() : 0;
        preview.put("edgeCount", edgeCount);

        return preview;
    }
}
