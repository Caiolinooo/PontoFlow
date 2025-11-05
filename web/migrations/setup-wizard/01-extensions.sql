-- ==========================================
-- Database Setup Wizard - Layer 1: Extensions
-- ==========================================
-- Purpose: Install required PostgreSQL extensions
-- Dependencies: None
-- Order: 1 (Must run first)
-- ==========================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
  ) AND EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE NOTICE '✅ Extensions installed successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to install extensions';
  END IF;
END $$;

-- Comments
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for password hashing and token generation';

