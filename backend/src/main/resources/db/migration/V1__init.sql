-- V1__init.sql
-- Initial schema for Jumpstart. Targets MySQL 8 / Aiven MySQL.

CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(120)  NOT NULL,
    email           VARCHAR(180)  NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,
    role            VARCHAR(20)   NOT NULL,
    email_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT        NOT NULL,
    token_hash  VARCHAR(128)  NOT NULL,
    expires_at  TIMESTAMP     NOT NULL,
    revoked     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

CREATE TABLE roadmaps (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id     BIGINT        NOT NULL,
    title        VARCHAR(160)  NOT NULL,
    description  TEXT,
    tag          VARCHAR(60),
    color_theme  VARCHAR(20)   NOT NULL DEFAULT 'MOSS',
    archived     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_roadmaps_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_roadmaps_owner ON roadmaps (owner_id);
CREATE INDEX idx_roadmaps_tag ON roadmaps (tag);

CREATE TABLE topics (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    roadmap_id  BIGINT        NOT NULL,
    title       VARCHAR(200)  NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'LOCKED',
    difficulty  INT           NOT NULL DEFAULT 1,
    est_hours   DOUBLE        NOT NULL DEFAULT 1.0,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_topics_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_topics_roadmap ON topics (roadmap_id);

CREATE TABLE resources (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id    BIGINT        NOT NULL,
    roadmap_id  BIGINT,
    topic_id    BIGINT,
    title       VARCHAR(240)  NOT NULL,
    type        VARCHAR(20)   NOT NULL,
    url         VARCHAR(1000),
    rating      DOUBLE        NOT NULL DEFAULT 0,
    bookmarked  BOOLEAN       NOT NULL DEFAULT FALSE,
    duration    VARCHAR(30),
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resources_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_resources_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps (id) ON DELETE SET NULL,
    CONSTRAINT fk_resources_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_resources_owner ON resources (owner_id);
CREATE INDEX idx_resources_type ON resources (type);

CREATE TABLE resource_tags (
    resource_id  BIGINT       NOT NULL,
    tag          VARCHAR(60),
    CONSTRAINT fk_resource_tags_resource FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_resource_tags_resource ON resource_tags (resource_id);

CREATE TABLE notes (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id    BIGINT        NOT NULL,
    roadmap_id  BIGINT,
    title       VARCHAR(200)  NOT NULL,
    content     LONGTEXT,
    word_count  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notes_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_notes_owner ON notes (owner_id);

CREATE TABLE goals (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id        BIGINT        NOT NULL,
    label           VARCHAR(160)  NOT NULL,
    cadence         VARCHAR(20)   NOT NULL,
    target_value    DOUBLE        NOT NULL,
    progress_value  DOUBLE        NOT NULL DEFAULT 0,
    unit            VARCHAR(30),
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_goals_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_goals_owner ON goals (owner_id);

CREATE TABLE certifications (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id          BIGINT        NOT NULL,
    title             VARCHAR(200)  NOT NULL,
    issuer            VARCHAR(160)  NOT NULL,
    issued_date       DATE          NOT NULL,
    expires_date      DATE,
    verification_url  VARCHAR(1000),
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_certifications_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_certifications_owner ON certifications (owner_id);
