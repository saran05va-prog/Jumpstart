-- V8__timer_state_fix.sql
-- Fix topic_timer_state to add auto-increment ID and support cross-device queries
-- Also add note column to topic_timer_sessions

ALTER TABLE topic_timer_sessions ADD COLUMN note VARCHAR(255);

DROP TABLE IF EXISTS topic_timer_state;
CREATE TABLE topic_timer_state (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  topic_id BIGINT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  status VARCHAR(10) DEFAULT 'STOPPED',
  server_start_time TIMESTAMP NULL,
  accumulated_seconds INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_tts_user_status ON topic_timer_state (user_id, status);
