-- V5__roadmap_templates_ir.sql
-- Adds parent_id and source_ref to topics for subtopic hierarchy and template traceability.
-- Creates topic_edges table for the prerequisite/related dependency graph.
-- These columns default to NULL so existing rows are unaffected.

ALTER TABLE topics
  ADD COLUMN parent_id BIGINT NULL,
  ADD COLUMN source_ref VARCHAR(120) NULL;

ALTER TABLE topics
  ADD CONSTRAINT fk_topic_parent
    FOREIGN KEY (parent_id) REFERENCES topics(id) ON DELETE CASCADE;

CREATE TABLE topic_edges (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  roadmap_id BIGINT NOT NULL,
  from_topic_id BIGINT NOT NULL,
  to_topic_id BIGINT NOT NULL,
  edge_type VARCHAR(20) NOT NULL,
  CONSTRAINT fk_edge_roadmap FOREIGN KEY (roadmap_id)
    REFERENCES roadmaps(id) ON DELETE CASCADE,
  CONSTRAINT fk_edge_from FOREIGN KEY (from_topic_id)
    REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_edge_to FOREIGN KEY (to_topic_id)
    REFERENCES topics(id) ON DELETE CASCADE
);
