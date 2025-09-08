-- Simple Log Management Database Schema (KISS Principle)
-- Single source of truth with proper foreign keys

CREATE DATABASE IF NOT EXISTS logdb;
USE logdb;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'tenant') NOT NULL DEFAULT 'tenant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Single logs table (เก็บทุกอย่าง)
CREATE TABLE IF NOT EXISTS logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME,
    tenant_id INT NULL,
    source_id INT NOT NULL,
    log_type NOT NULL,
    event_type VARCHAR(100),
    event_subtype VARCHAR(100),
    severity INT DEFAULT NULL,
    message TEXT,
    src_ip VARCHAR(50),
    dst_ip VARCHAR(50),
    user VARCHAR(100),
    host VARCHAR(100),
    action VARCHAR(50),
    src_port INT,
    dst_port INT,
    protocol VARCHAR(20),
    rule_name VARCHAR(100),
    rule_id VARCHAR(100),
    interface VARCHAR(50),
    mac VARCHAR(50),
    raw_data TEXT,                         -- Original log message                         -- Flexible tags
    cloud JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    
    -- Foreign Keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_timestamp (timestamp),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_source_id (source_id),
    INDEX idx_log_type (log_type),
    INDEX idx_event_type (event_type),
    INDEX idx_src_ip (src_ip)
);

-- Alerts table (simple)
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    ip_address VARCHAR(45),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_alert_type (alert_type),
    INDEX idx_created_at (created_at)
);


-- Insert users with bcrypt hashed passwords
INSERT IGNORE INTO users (username, password, role) VALUES 
('admin', '$2b$10$iYyHY4VXBpUBGEUA1DVT6OW9oyKHu1Cavz0xp2B0pyS4syxHlR9y.', 'admin'),
('demoA', '$2b$10$0kPzHIPcSKr1KR.xO3X89.AmbC9yhzzRM3eWZfV4sjoETBV3ueUKK', 'tenant'),
('demoB', '$2b$10$kx8YY1SEddJBYJub0YnOzOHU2m4e4e4avzejocOSVd7b3YtOGA29i', 'tenant');


