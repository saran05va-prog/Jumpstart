-- V2__checklists_projects_sessions_links.sql
-- Adds study_sessions, checklist_items, projects, topic_links tables
-- and extends existing tables with new columns for the Learning OS.

-- ── Study sessions (was missing from V1) ──
CREATE TABLE study_sessions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id        BIGINT        NOT NULL,
    session_date    DATE          NOT NULL,
    minutes         DOUBLE        NOT NULL,
    roadmap_id      BIGINT,
    topic_id        BIGINT,
    note            VARCHAR(500),
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_sessions_owner ON study_sessions (owner_id);
CREATE INDEX idx_sessions_date  ON study_sessions (session_date);

-- ── Checklist items for topics ──
CREATE TABLE checklist_items (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    topic_id    BIGINT        NOT NULL,
    label       VARCHAR(300)  NOT NULL,
    completed   BOOLEAN       NOT NULL DEFAULT FALSE,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_checklist_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_checklist_topic ON checklist_items (topic_id);

-- ── Projects for topics ──
CREATE TABLE projects (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id     BIGINT        NOT NULL,
    topic_id     BIGINT,
    roadmap_id   BIGINT,
    title        VARCHAR(200)  NOT NULL,
    summary      TEXT,
    github_url   VARCHAR(1000),
    demo_url     VARCHAR(1000),
    completed    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_owner   FOREIGN KEY (owner_id)   REFERENCES users (id)    ON DELETE CASCADE,
    CONSTRAINT fk_projects_topic   FOREIGN KEY (topic_id)   REFERENCES topics (id)   ON DELETE SET NULL,
    CONSTRAINT fk_projects_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_projects_owner ON projects (owner_id);
CREATE INDEX idx_projects_topic ON projects (topic_id);

-- ── Topic links (Obsidian / external references) ──
CREATE TABLE topic_links (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    topic_id    BIGINT        NOT NULL,
    label       VARCHAR(200)  NOT NULL,
    uri         VARCHAR(1000) NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_links_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_links_topic ON topic_links (topic_id);

-- ── Note tags (ElementCollection backing table) ──
CREATE TABLE note_tags (
    note_id  BIGINT      NOT NULL,
    tag      VARCHAR(60),
    CONSTRAINT fk_note_tags_note FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_note_tags_note ON note_tags (note_id);

-- ── Alter topics: add description ──
ALTER TABLE topics ADD COLUMN description TEXT;

-- ── Alter resources: add completed ──
ALTER TABLE resources ADD COLUMN completed BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Alter notes: add topic_id, tags, summary ──
ALTER TABLE notes ADD COLUMN topic_id BIGINT;
ALTER TABLE notes ADD COLUMN summary TEXT;
ALTER TABLE notes ADD CONSTRAINT fk_notes_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE SET NULL;
CREATE INDEX idx_notes_topic ON notes (topic_id);

-- ── Alter goals: add due_date ──
ALTER TABLE goals ADD COLUMN due_date DATE;

-- ── Alter certifications: add status and completion_date ──
ALTER TABLE certifications ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PLANNED';
ALTER TABLE certifications ADD COLUMN completion_date DATE;

CREATE INDEX idx_certifications_status ON certifications (status);
