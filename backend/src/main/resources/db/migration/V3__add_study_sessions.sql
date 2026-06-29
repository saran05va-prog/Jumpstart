-- V3__add_study_sessions.sql
-- Add foreign key constraints for study_sessions that were missing from V2.

ALTER TABLE study_sessions
  ADD CONSTRAINT fk_study_sessions_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_study_sessions_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE SET NULL;
