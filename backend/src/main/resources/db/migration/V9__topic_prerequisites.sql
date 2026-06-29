-- V9__topic_prerequisites.sql

CREATE TABLE IF NOT EXISTS topic_prerequisites (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  topic_id BIGINT NOT NULL,
  prerequisite_topic_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_prereq (topic_id, prerequisite_topic_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_topic_id) REFERENCES topics(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_tp_topic ON topic_prerequisites (topic_id);
CREATE INDEX idx_tp_prereq ON topic_prerequisites (prerequisite_topic_id);
