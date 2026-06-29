-- V10__study_schedule.sql

CREATE TABLE IF NOT EXISTS study_schedule (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  topic_id BIGINT NOT NULL,
  scheduled_date DATE NOT NULL,
  planned_minutes INT DEFAULT 60,
  note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_ss_user_date ON study_schedule (user_id, scheduled_date);
CREATE INDEX idx_ss_topic ON study_schedule (topic_id);
