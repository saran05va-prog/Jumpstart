ALTER TABLE notes ADD COLUMN conflict_content LONGTEXT;
ALTER TABLE notes ADD COLUMN conflict_detected_at TIMESTAMP NULL;
