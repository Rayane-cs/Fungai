-- Fix database schema for FUNGAI
-- Run this in phpMyAdmin to update existing tables

-- Check current columns
SHOW COLUMNS FROM scans;

-- Update image columns to LONGTEXT to support full base64 images
ALTER TABLE scans MODIFY original_image_base64 LONGTEXT;
ALTER TABLE scans MODIFY annotated_image_base64 LONGTEXT;

-- Verify the change
SHOW COLUMNS FROM scans;

-- If you need to recreate the table fresh (WARNING: deletes all data!):
-- DROP TABLE IF EXISTS scans;
-- CREATE TABLE scans (
--     id VARCHAR(36) PRIMARY KEY,
--     user_id VARCHAR(36) NOT NULL,
--     filename VARCHAR(500) NOT NULL,
--     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
--     result_json JSON,
--     original_image_base64 LONGTEXT,
--     annotated_image_base64 LONGTEXT
-- );
