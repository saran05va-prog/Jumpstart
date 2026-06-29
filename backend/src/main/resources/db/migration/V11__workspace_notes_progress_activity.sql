-- V11__workspace_notes_progress_activity.sql
-- Unified learning workspace: resource status/progress, note backlinks,
-- note pinning/view tracking, and recent activity feed.
--
-- This migration is additive only — no existing columns are dropped or
-- renamed, so existing data migrates safely.

-- ────────────────────────────────────────────────────────────────────
-- 1. Resources: status enum, favorite, hidden, progress & position tracking
-- ────────────────────────────────────────────────────────────────────

-- Status is the single source of truth for the quick-complete cycle.
-- The legacy `completed` boolean is kept for backward compatibility and
-- synced via triggers-free application logic (ResourceService).
ALTER TABLE resources ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE resources ADD COLUMN favorite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE resources ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE resources ADD COLUMN progress_percent INT NOT NULL DEFAULT 0;
ALTER TABLE resources ADD COLUMN estimated_minutes INT NULL;
ALTER TABLE resources ADD COLUMN actual_minutes INT NULL;
ALTER TABLE resources ADD COLUMN started_at TIMESTAMP NULL;
ALTER TABLE resources ADD COLUMN last_page INT NULL;
ALTER TABLE resources ADD COLUMN video_position_seconds INT NULL;
ALTER TABLE resources ADD COLUMN reading_progress DOUBLE NULL;

CREATE INDEX idx_resources_status    ON resources (status);
CREATE INDEX idx_resources_favorite  ON resources (favorite);
CREATE INDEX idx_resources_hidden    ON resources (hidden);
CREATE INDEX idx_resources_roadmap_topic ON resources (roadmap_id, topic_id);

-- Backfill status from the legacy completed flag so existing data is
-- represented correctly in the new state machine.
UPDATE resources SET status = 'COMPLETED', progress_percent = 100 WHERE completed = TRUE;
UPDATE resources SET status = 'IN_PROGRESS' WHERE completed = FALSE AND started_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────
-- 2. Notes: pinning and view tracking
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE notes ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN last_viewed_at TIMESTAMP NULL;

CREATE INDEX idx_notes_pinned   ON notes (is_pinned);
CREATE INDEX idx_notes_updated  ON notes (updated_at);

-- ────────────────────────────────────────────────────────────────────
-- 3. Note links (Obsidian-style [[wikilinks]] and backlinks)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE note_links (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_note_id  BIGINT       NOT NULL,
    target_note_id  BIGINT       NULL,
    link_text       VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_note_links_source FOREIGN KEY (source_note_id) REFERENCES notes (id) ON DELETE CASCADE,
    CONSTRAINT fk_note_links_target FOREIGN KEY (target_note_id) REFERENCES notes (id) ON DELETE SET NULL,
    CONSTRAINT uq_note_link UNIQUE (source_note_id, link_text)
) ENGINE=InnoDB;

CREATE INDEX idx_note_links_source ON note_links (source_note_id);
CREATE INDEX idx_note_links_target ON note_links (target_note_id);

-- ────────────────────────────────────────────────────────────────────
-- 4. Recent activity feed
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE recent_activity (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id      BIGINT       NOT NULL,
    activity_type VARCHAR(40)  NOT NULL,
    entity_type   VARCHAR(40)  NULL,
    entity_id     BIGINT       NULL,
    title         VARCHAR(300) NOT NULL,
    subtitle      VARCHAR(500) NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recent_activity_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_recent_activity_owner ON recent_activity (owner_id, created_at DESC);
CREATE INDEX idx_recent_activity_type  ON recent_activity (activity_type);
