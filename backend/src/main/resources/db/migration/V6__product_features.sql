-- V6__product_features.sql
-- Adds timer, goal checklists, topic milestones, obsidian deeplinks, etc.

-- Topics: milestone label
ALTER TABLE topics ADD COLUMN milestone_label VARCHAR(60);

-- Resources: completed_at + order_index
ALTER TABLE resources ADD COLUMN completed_at TIMESTAMP NULL;
ALTER TABLE resources ADD COLUMN order_index INT NOT NULL DEFAULT 0;
CREATE INDEX idx_resources_order ON resources (roadmap_id, topic_id, order_index);

-- Notes: obsidian_uri + is_starred
ALTER TABLE notes ADD COLUMN obsidian_uri VARCHAR(500);
ALTER TABLE notes ADD COLUMN is_starred BOOLEAN NOT NULL DEFAULT FALSE;

-- Goals: description, priority, topic_id, status, completed_at
ALTER TABLE goals ADD COLUMN description TEXT;
ALTER TABLE goals ADD COLUMN priority VARCHAR(10) NOT NULL DEFAULT 'medium';
ALTER TABLE goals ADD COLUMN topic_id BIGINT;
ALTER TABLE goals ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE goals ADD COLUMN completed_at TIMESTAMP NULL;
ALTER TABLE goals ADD CONSTRAINT fk_goals_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL;
CREATE INDEX idx_goals_topic ON goals (topic_id);
CREATE INDEX idx_goals_status ON goals (status);

-- Goal checklist items
CREATE TABLE goal_checklist_items (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    goal_id     BIGINT        NOT NULL,
    text        VARCHAR(500),
    done        BOOLEAN       NOT NULL DEFAULT FALSE,
    order_index INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gci_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_gci_goal ON goal_checklist_items (goal_id);

-- Timer: sessions log
CREATE TABLE topic_timer_sessions (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    topic_id         BIGINT        NOT NULL,
    user_id          BIGINT        NOT NULL,
    start_time       TIMESTAMP     NULL,
    end_time         TIMESTAMP     NULL,
    duration_seconds INT           NULL,
    is_manual        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tts_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    CONSTRAINT fk_tts_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_tts_topic ON topic_timer_sessions (topic_id);
CREATE INDEX idx_tts_user  ON topic_timer_sessions (user_id);

-- Timer: active state (cross-device sync)
CREATE TABLE topic_timer_state (
    topic_id            BIGINT      PRIMARY KEY,
    user_id             BIGINT      NOT NULL,
    status              VARCHAR(10) NOT NULL DEFAULT 'stopped',
    server_start_time   TIMESTAMP   NULL,
    accumulated_seconds INT         NOT NULL DEFAULT 0,
    CONSTRAINT fk_tts_state_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    CONSTRAINT fk_tts_state_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_tts_state_user ON topic_timer_state (user_id);

-- Certifications: roadmap_id + study_hours + notes
ALTER TABLE certifications ADD COLUMN roadmap_id BIGINT;
ALTER TABLE certifications ADD COLUMN study_hours INT NOT NULL DEFAULT 0;
ALTER TABLE certifications ADD COLUMN cert_notes TEXT;
ALTER TABLE certifications ADD CONSTRAINT fk_certs_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE SET NULL;
CREATE INDEX idx_certs_roadmap ON certifications (roadmap_id);
