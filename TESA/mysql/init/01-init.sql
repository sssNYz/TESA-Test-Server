-- MySQL initialization script for TESA project
-- This script runs when MySQL container starts for the first time

-- Create TESA database (already created by environment variable, but ensuring it exists)
CREATE DATABASE IF NOT EXISTS TESA;
USE TESA;

-- Grant privileges to root user
GRANT ALL PRIVILEGES ON TESA.* TO 'root'@'%';
GRANT ALL PRIVILEGES ON TESA.* TO 'root'@'localhost';



-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show databases to confirm
SHOW DATABASES;
