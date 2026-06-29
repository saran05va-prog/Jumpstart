CREATE USER IF NOT EXISTS 'jumpstart'@'localhost' IDENTIFIED BY 'jumpstart';
CREATE DATABASE IF NOT EXISTS jumpstart;
GRANT ALL PRIVILEGES ON jumpstart.* TO 'jumpstart'@'localhost';
FLUSH PRIVILEGES;
