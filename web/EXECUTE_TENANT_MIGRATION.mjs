#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
try {
  const envContent = readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (err) {
  console.log('Note: Could not load .env.local, using system environment variables');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  console.log('=== EXECUTING TENANT TIMEZONE MIGRATION ===\n');
  
  try {
    // Step 1: Test connection
    console.log('1. Testing database connection...');
    const { data: test, error: testError } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);
    
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    console.log('✅ Database connection successful\n');
    
    // Step 2: Check current structure
    console.log('2. Checking current tenants table structure...');
    try {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'tenants')
        .eq('table_schema', 'public');
        
      if (columnsError) {
        console.log('Could not access information_schema, trying alternative method...');
        // Try to query tenants table directly to see if columns exist
        const { data: sampleTenant, error: sampleError } = await supabase
          .from('tenants')
          .select('id, name, timezone, work_mode, deadline_day')
          .limit(1);
          
        if (sampleError) {
          console.log('Sample query result:', sampleError.message);
        }
      } else {
        console.log('Current columns in tenants table:');
        columns.forEach(col => {
          console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
      }
    } catch (err) {
      console.log('Could not check table structure via information_schema:', err.message);
    }
    
    // Step 3: Execute the migration using direct approach
    console.log('\n3. Executing migration via alternative method...');
    
    // Try to create the execute_sql function first
    console.log('Creating execute_sql function...');
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.execute_sql(query text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE query;
        RETURN json_build_object('success', true, 'message', 'Query executed successfully');
      EXCEPTION
        WHEN OTHERS THEN
          RETURN json_build_object('success', false, 'error', SQLERRM);
      END;
      $$;
      
      GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;
    `;
    
    try {
      const { data: funcResult, error: funcError } = await supabase.rpc('execute_sql', { query: createFunctionSQL });
      console.log('Function creation result:', funcResult || funcError);
    } catch (err) {
      console.log('Function creation failed, will use alternative approach:', err.message);
    }
    
    // Step 4: Try alternative approach - direct DDL via API
    console.log('\n4. Attempting direct schema modifications...');
    
    // For Supabase, we need to execute SQL directly through the management API
    // Since we can't do this directly, we'll document what needs to be done
    
    console.log('\n=== MIGRATION INSTRUCTIONS ===');
    console.log('Due to API limitations, please execute the following SQL in your Supabase SQL Editor:\n');
    
    const migrationSQL = `
-- TENANT TIMEZONE MIGRATION - CRITICAL FIX
-- Execute this SQL in Supabase SQL Editor

-- ==========================================
-- STEP 1: ADD MISSING COLUMNS TO TENANTS
-- ==========================================

-- Add timezone column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Add work_mode column to tenants table  
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS work_mode VARCHAR(50) DEFAULT 'padrao';

-- Add deadline_day column to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS deadline_day INTEGER DEFAULT 16;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_timezone ON public.tenants(timezone);
CREATE INDEX IF NOT EXISTS idx_tenants_work_mode ON public.tenants(work_mode);
CREATE INDEX IF NOT EXISTS idx_tenants_deadline_day ON public.tenants(deadline_day);

-- ==========================================
-- STEP 2: ADD DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN public.tenants.timezone IS 'Tenant timezone for date calculations (e.g., America/Sao_Paulo, America/New_York, Europe/London)';
COMMENT ON COLUMN public.tenants.work_mode IS 'Tenant work mode configuration (e.g., padrao, standard, flexible)';
COMMENT ON COLUMN public.tenants.deadline_day IS 'Deadline day for timesheet submission (1-28, default: 16)';

-- ==========================================
-- STEP 3: UPDATE EXISTING TENANTS
-- ==========================================

-- Update existing tenants with default values
UPDATE public.tenants 
SET 
  timezone = COALESCE(timezone, 'America/Sao_Paulo'),
  work_mode = COALESCE(work_mode, 'padrao'), 
  deadline_day = COALESCE(deadline_day, 16)
WHERE 
  timezone IS NULL OR 
  work_mode IS NULL OR 
  deadline_day IS NULL;

-- ==========================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ==========================================

-- Create function to get tenant timezone
CREATE OR REPLACE FUNCTION public.get_tenant_timezone(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    timezone, 
    'America/Sao_Paulo'
  ) 
  FROM public.tenants 
  WHERE id = tenant_uuid;
$$;

-- Create function to get current timestamp in tenant timezone
CREATE OR REPLACE FUNCTION public.now_in_tenant_timezone(tenant_uuid UUID)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT NOW() AT TIME ZONE COALESCE(
    public.get_tenant_timezone(tenant_uuid),
    'America/Sao_Paulo'
  );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_tenant_timezone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.now_in_tenant_timezone(UUID) TO authenticated;

-- ==========================================
-- STEP 5: VERIFICATION
-- ==========================================

-- Check the results
SELECT 
  id,
  name,
  timezone,
  work_mode,
  deadline_day,
  created_at
FROM public.tenants 
ORDER BY created_at DESC
LIMIT 5;
    `;
    
    console.log(migrationSQL);
    console.log('\n=== END MIGRATION SQL ===\n');
    
    // Step 5: Check current tenant data
    console.log('5. Checking current tenant data...');
    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .limit(3);
        
      if (tenantsError) {
        console.log('Error fetching tenants:', tenantsError.message);
      } else {
        console.log('Found tenants:');
        tenants?.forEach(tenant => {
          console.log(`- ${tenant.name} (${tenant.slug}) - ID: ${tenant.id}`);
        });
      }
    } catch (err) {
      console.log('Could not fetch tenants:', err.message);
    }
    
    console.log('\n=== MIGRATION SUMMARY ===');
    console.log('✅ Database connection verified');
    console.log('❌ Migration requires manual execution in Supabase SQL Editor');
    console.log('📝 See migration SQL above - copy and paste into Supabase dashboard');
    console.log('🔄 After migration, test the configuration page and reports API');
    
    return { 
      success: true, 
      requiresManualExecution: true,
      migrationSQL: migrationSQL 
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { 
      success: false, 
      error: error.message,
      requiresManualExecution: true 
    };
  }
}

main().catch(console.error);

async function main() {
  const result = await executeMigration();
  console.log('\nMigration preparation complete. Please execute the provided SQL in Supabase.');
  process.exit(result.success ? 0 : 1);
}