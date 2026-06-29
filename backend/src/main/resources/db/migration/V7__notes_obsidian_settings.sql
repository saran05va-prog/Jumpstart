-- V7__notes_obsidian_settings.sql
-- Notes improvements + Obsidian + User Settings

ALTER TABLE notes ADD COLUMN obsidian_file VARCHAR(255);

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  obsidian_vault_name VARCHAR(100),
  daily_study_hours INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
