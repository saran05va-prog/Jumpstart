-- V12__vault_sync_streaks_achievements.sql
-- Obsidian vault sync, streak tracking, XP achievements, sync log

-- Extend user_settings for full vault path and sync config
ALTER TABLE user_settings ADD COLUMN obsidian_vault_path VARCHAR(1000);
ALTER TABLE user_settings ADD COLUMN sync_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN last_sync_at TIMESTAMP NULL;

-- Extend notes for sync tracking
ALTER TABLE notes ADD COLUMN vault_path VARCHAR(1000);
ALTER TABLE notes ADD COLUMN checksum VARCHAR(64);
ALTER TABLE notes ADD COLUMN last_synced_at TIMESTAMP NULL;
ALTER TABLE notes ADD COLUMN sync_status VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE notes MODIFY COLUMN content LONGTEXT;

-- Sync log
CREATE TABLE IF NOT EXISTS sync_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  note_id BIGINT,
  direction VARCHAR(10) NOT NULL COMMENT 'UPLOAD or DOWNLOAD',
  status VARCHAR(20) NOT NULL COMMENT 'SUCCESS, FAILED, CONFLICT',
  file_path VARCHAR(1000),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Streaks
CREATE TABLE IF NOT EXISTS streaks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  weekly_streak INT DEFAULT 0,
  monthly_streak INT DEFAULT 0,
  perfect_weeks INT DEFAULT 0,
  perfect_months INT DEFAULT 0,
  last_activity_date DATE,
  week_start_date DATE,
  month_start_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- XP transactions
CREATE TABLE IF NOT EXISTS xp_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  amount INT NOT NULL,
  reason VARCHAR(100) NOT NULL,
  reference_type VARCHAR(50),
  reference_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- User XP totals
CREATE TABLE IF NOT EXISTS user_xp (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(30),
  xp_reward INT DEFAULT 0,
  criteria_json TEXT COMMENT 'JSON conditions to earn this achievement'
) ENGINE=InnoDB;

-- User badges (earned achievements)
CREATE TABLE IF NOT EXISTS user_badges (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  achievement_code VARCHAR(50) NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_achievement (user_id, achievement_code),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Insert default achievements
INSERT INTO achievements (code, title, description, icon, category, xp_reward, criteria_json) VALUES
('FIRST_NOTE', 'First Note', 'Create your first note', '📝', 'notes', 50, '{"type":"note_count","count":1}'),
('NOTE_COLLECTOR_10', 'Note Collector', 'Create 10 notes', '📚', 'notes', 100, '{"type":"note_count","count":10}'),
('NOTE_COLLECTOR_50', 'Notable Achievement', 'Create 50 notes', '🏆', 'notes', 250, '{"type":"note_count","count":50}'),
('FIRST_GOAL', 'Goal Setter', 'Create your first goal', '🎯', 'goals', 50, '{"type":"goal_count","count":1}'),
('GOAL_COMPLETE_5', 'Goal Crusher', 'Complete 5 goals', '✅', 'goals', 150, '{"type":"goal_complete","count":5}'),
('STREAK_3', 'Getting Started', '3-day study streak', '🔥', 'streaks', 50, '{"type":"streak","days":3}'),
('STREAK_7', 'Week Warrior', '7-day study streak', '🔥', 'streaks', 100, '{"type":"streak","days":7}'),
('STREAK_14', 'Fortnight Focus', '14-day study streak', '🔥', 'streaks', 200, '{"type":"streak","days":14}'),
('STREAK_30', 'Monthly Master', '30-day study streak', '🔥', 'streaks', 500, '{"type":"streak","days":30}'),
('STREAK_100', 'Century Club', '100-day study streak', '💯', 'streaks', 2000, '{"type":"streak","days":100}'),
('FIRST_RESOURCE', 'Resourceful', 'Add your first resource', '📄', 'resources', 25, '{"type":"resource_count","count":1}'),
('RESOURCE_COMPLETE_10', 'Diligent Learner', 'Complete 10 resources', '📖', 'resources', 100, '{"type":"resource_complete","count":10}'),
('RESOURCE_COMPLETE_50', 'Knowledge Seeker', 'Complete 50 resources', '📚', 'resources', 300, '{"type":"resource_complete","count":50}'),
('FIRST_TOPIC', 'Topic Explorer', 'Complete your first topic', '🗺️', 'topics', 75, '{"type":"topic_complete","count":1}'),
('PERFECT_WEEK', 'Perfect Week', 'Complete all daily goals for a week', '⭐', 'goals', 200, '{"type":"perfect_week","count":1}'),
('PERFECT_MONTH', 'Perfect Month', 'Complete all daily goals for a month', '🌟', 'goals', 500, '{"type":"perfect_month","count":1}'),
('VAULT_CONNECTED', 'Vault Dweller', 'Connect your Obsidian vault', '🏛️', 'sync', 100, '{"type":"vault_connected"}'),
('FIRST_SYNC', 'Synced', 'First successful sync with Obsidian', '🔄', 'sync', 50, '{"type":"first_sync"}'),
('SCHEDULE_SET', 'Planner', 'Create your first study schedule', '📅', 'schedule', 50, '{"type":"schedule_count","count":1}'),
('FOCUS_HOURS_10', 'Focused', 'Log 10 hours of focused study', '⏱️', 'focus', 100, '{"type":"focus_hours","hours":10}'),
('FOCUS_HOURS_50', 'Deep Work', 'Log 50 hours of focused study', '⏱️', 'focus', 300, '{"type":"focus_hours","hours":50}'),
('WELCOME', 'Welcome to Jumpstart', 'Begin your learning journey', '🎉', 'milestone', 25, '{"type":"welcome"}');
