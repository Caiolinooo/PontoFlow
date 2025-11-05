-- Drop the existing constraint
ALTER TABLE users_unified DROP CONSTRAINT IF EXISTS users_unified_role_check;

-- Add the new constraint with the updated values, including 'USER' for compatibility
ALTER TABLE users_unified ADD CONSTRAINT users_unified_role_check
CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE', 'MANAGER_TIMESHEET', 'USER'));