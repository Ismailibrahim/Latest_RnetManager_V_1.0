-- SQL script to make company_name nullable in landlords table
-- Run this directly in your MySQL database (via phpMyAdmin, HeidiSQL, or MySQL command line)

-- Check current column definition
SHOW COLUMNS FROM landlords WHERE Field = 'company_name';

-- Make company_name nullable
ALTER TABLE landlords MODIFY COLUMN company_name VARCHAR(255) NULL;

-- Verify the change
SHOW COLUMNS FROM landlords WHERE Field = 'company_name';

