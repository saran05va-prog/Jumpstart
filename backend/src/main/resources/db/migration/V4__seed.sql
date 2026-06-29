-- V4__seed.sql
-- Optional demo data so a freshly-deployed instance isn't empty.
-- Safe to delete this file before your first production deploy if you don't want it.
--
-- Demo login:
--   email:    demo@jumpstart.dev
--   password: Password123!

INSERT INTO users (id, name, email, password_hash, role, email_verified, created_at, updated_at)
VALUES (1, 'Asha Raman', 'demo@jumpstart.dev', '$2b$10$PCgnGtMR10ceoIWi0T.BnuT5sC6wpQboSdPPnw5lVsR..XF4KBzrm', 'STUDENT', TRUE, NOW(), NOW());

INSERT INTO roadmaps (id, owner_id, title, description, tag, color_theme, archived, created_at, updated_at)
VALUES (1, 1, 'Backend Systems Engineering', 'From HTTP fundamentals to distributed systems and queues.', 'Engineering', 'MOSS', FALSE, NOW(), NOW());

INSERT INTO topics (roadmap_id, title, status, difficulty, est_hours, sort_order, created_at, updated_at) VALUES
(1, 'HTTP & REST Fundamentals', 'DONE', 1, 4, 0, NOW(), NOW()),
(1, 'Relational Database Design', 'DONE', 2, 8, 1, NOW(), NOW()),
(1, 'Authentication & Sessions', 'DONE', 2, 6, 2, NOW(), NOW()),
(1, 'Caching Strategies', 'CURRENT', 2, 5, 3, NOW(), NOW()),
(1, 'Message Queues', 'UPCOMING', 3, 7, 4, NOW(), NOW()),
(1, 'Distributed Consensus', 'LOCKED', 3, 10, 5, NOW(), NOW());

INSERT INTO resources (owner_id, roadmap_id, title, type, url, rating, bookmarked, duration, created_at, updated_at) VALUES
(1, 1, 'Caching at Scale - Redis Deep Dive', 'VIDEO', 'https://example.com/redis-deep-dive', 4.8, TRUE, '38m', NOW(), NOW()),
(1, 1, 'OAuth2 in Production', 'DOC', 'https://example.com/oauth2-prod', 4.6, TRUE, '20m', NOW(), NOW());

INSERT INTO notes (owner_id, roadmap_id, title, content, word_count, created_at, updated_at)
VALUES (1, 1, 'Cache invalidation strategies', 'Write-through vs write-around vs write-back - tradeoffs for our checkout service.', 14, NOW(), NOW());

INSERT INTO goals (owner_id, label, cadence, target_value, progress_value, unit, created_at, updated_at) VALUES
(1, 'Focused study hours', 'WEEKLY', 14, 11.5, 'hrs', NOW(), NOW()),
(1, 'Topics completed', 'MONTHLY', 10, 7, 'topics', NOW(), NOW());

INSERT INTO certifications (owner_id, title, issuer, issued_date, expires_date, verification_url, created_at, updated_at)
VALUES (1, 'AWS Certified Solutions Architect', 'Amazon Web Services', '2025-03-01', '2028-03-01', 'https://example.com/verify/aws-csa', NOW(), NOW());
