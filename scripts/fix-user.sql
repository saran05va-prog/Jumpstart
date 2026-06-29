-- Fix for missing jumpstart user in MySQL
-- Run this on the MySQL container or local MySQL

-- Create the jumpstart user if not exists
CREATE USER IF NOT EXISTS 'jumpstart'@'%' IDENTIFIED BY 'jumpstart';

-- Grant all privileges on the jumpstart database
GRANT ALL PRIVILEGES ON jumpstart.* TO 'jumpstart'@'%';

-- Also grant for localhost
CREATE USER IF NOT EXISTS 'jumpstart'@'localhost' IDENTIFIED BY 'jumpstart';
GRANT ALL PRIVILEGES ON jumpstart.* TO 'jumpstart'@'localhost';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;