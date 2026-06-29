package com.jumpstart.templates;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Top-level shape of a single template IR JSON file.
 * Fields are named in kebab-case to match the JSON keys produced by the extractor.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RoadmapTemplateIr {
    private String schemaVersion;
    private Source source;
    private Roadmap roadmap;
    private List<Topic> topics;
    private List<Edge> edges;
    private List<Project> projects;
    private List<Question> questions;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Source {
        private String id;
        private String sourceRoadmapId;
        private String url;
        private String extractedAt;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Roadmap {
        private String key;
        private String title;
        private String description;
        private String category;
        private List<String> tags;
        private String colorTheme;
        private Metadata metadata;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Metadata {
        private Integer order;
        private Boolean hasTopics;
        private List<String> relatedRoadmaps;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Topic {
        private String id;
        private String title;
        private String description;
        private int difficulty;
        private double estHours;
        private int sortOrder;
        private List<Topic> children;
        private List<Resource> resources;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Resource {
        private String type;
        private String title;
        private String url;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Edge {
        private String from;
        private String to;
        private String type; // prerequisite | related
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Project {
        private String title;
        private String description;
        private int difficulty;
        private List<String> skills;
        private String url;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Question {
        private String question;
        private String answer;
        private List<String> topics;
    }
}
