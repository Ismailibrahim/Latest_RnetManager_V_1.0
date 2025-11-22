-- Check if financial_records.payment_method column is already VARCHAR
-- Run this SQL to see the current column type

SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'financial_records' 
  AND COLUMN_NAME = 'payment_method';

-- If the query returns:
-- - COLUMN_TYPE contains 'enum' = Still ENUM, needs migration
-- - COLUMN_TYPE contains 'varchar' = Already VARCHAR, migration done
-- - DATA_TYPE = 'varchar' = Already VARCHAR, migration done

