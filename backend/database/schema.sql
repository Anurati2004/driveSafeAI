-- Optional: the app also creates these tables automatically via SQLAlchemy.
CREATE DATABASE IF NOT EXISTS drivesafe_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE drivesafe_ai;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitoring_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  duration INT NOT NULL DEFAULT 0,           -- seconds
  total_blinks INT NOT NULL DEFAULT 0,
  total_alerts INT NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user_start (user_id, start_time)
);

CREATE TABLE IF NOT EXISTS drowsiness_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_time DATETIME NOT NULL,
  eye_aspect_ratio FLOAT NULL,
  FOREIGN KEY (session_id) REFERENCES monitoring_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  ear_threshold FLOAT NOT NULL DEFAULT 0.21,
  alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sensitivity VARCHAR(10) NOT NULL DEFAULT 'medium',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
