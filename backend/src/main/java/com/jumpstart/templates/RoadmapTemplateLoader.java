package com.jumpstart.templates;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class RoadmapTemplateLoader implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(RoadmapTemplateLoader.class);

    private final ApplicationContext appContext;
    private final ObjectMapper objectMapper;
    private final Map<String, RoadmapTemplateIr> templates = new LinkedHashMap<>();

    public RoadmapTemplateLoader(ApplicationContext appContext, ObjectMapper objectMapper) {
        this.appContext = appContext;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        Resource[] resources = appContext.getResources("classpath:roadmap-templates/*.json");
        for (Resource res : resources) {
            try {
                RoadmapTemplateIr ir = objectMapper.readValue(res.getInputStream(), RoadmapTemplateIr.class);
                String key = ir.getRoadmap().getKey();
                templates.put(key, ir);
                int topicCount = ir.getTopics() != null ? ir.getTopics().size() : 0;
                int edgeCount = ir.getEdges() != null ? ir.getEdges().size() : 0;
                log.info("Loaded template: {} ({} topics, {} edges)", key, topicCount, edgeCount);
            } catch (Exception e) {
                log.warn("Failed to load template {}: {}", res.getFilename(), e.getMessage());
            }
        }
        if (templates.isEmpty()) {
            log.warn("No roadmap templates loaded — check classpath:roadmap-templates/");
        }
    }

    public RoadmapTemplateIr getByKey(String key) {
        return templates.get(key);
    }

    public List<RoadmapTemplateIr> listAll() {
        return List.copyOf(templates.values());
    }
}
