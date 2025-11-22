-- Simple check: Is payment_method already VARCHAR?
-- This will return 'VARCHAR' if already modified, or 'ENUM' if still needs migration

SELECT 
    CASE 
        WHEN COLUMN_TYPE LIKE 'varchar%' THEN '✅ Already VARCHAR - Migration done!'
        WHEN COLUMN_TYPE LIKE 'enum%' THEN '❌ Still ENUM - Migration needed!'
        ELSE '⚠️  Unknown type: ' || COLUMN_TYPE
    END AS status,
    COLUMN_TYPE as current_type,
    CHARACTER_MAXIMUM_LENGTH as max_length
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'financial_records' 
  AND COLUMN_NAME = 'payment_method';

