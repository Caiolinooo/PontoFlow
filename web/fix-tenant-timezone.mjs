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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('SQL execution error:', err);
    return { data: null, error: err };
  }
}

async function main() {
  console.log('=== CRITICAL DATABASE SCHEMA FIX ===\n');
  
  // Step 1: Check current tenant table structure
  console.log('1. Checking current tenants table structure...');
  const checkSQL = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'tenants' AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;
  
  const result = await executeSQL(checkSQL);
  if (result.error) {
    console.error('Failed to check table structure:', result.error);
    return;
  }
  
  console.log('Current tenants table columns:');
  console.table(result.data);
  
  // Step 2: Add missing columns
  console.log('\n2. Adding missing columns to tenants table...');
  
  const addColumnsSQL = `
    -- Add timezone column
    ALTER TABLE public.tenants 
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
    
    -- Add work_mode column  
    ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS work_mode VARCHAR(50) DEFAULT 'padrao';
    
    -- Add deadline_day column
    ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS deadline_day INTEGER DEFAULT 16;
    
    -- Add comments for documentation
    COMMENT ON COLUMN public.tenants.timezone IS 'Tenant timezone for date calculations (e.g., America/Sao_Paulo, America/New_York, Europe/London)';
    COMMENT ON COLUMN public.tenants.work_mode IS 'Tenant work mode configuration (e.g., padrao, flexible)';
    COMMENT ON COLUMN public.tenants.deadline_day IS 'Deadline day for timesheet submission (1-28, default: 16)';
  `;
  
  const addResult = await executeSQL(addColumnsSQL);
  if (addResult.error) {
    console.error('Failed to add columns:', addResult.error);
    return;
  }
  
  console.log('✓ Successfully added missing columns');
  
  // Step 3: Update existing tenants with default values
  console.log('\n3. Updating existing tenants with default values...');
  
  const updateSQL = `
    UPDATE public.tenants 
    SET 
      timezone = COALESCE(timezone, 'America/Sao_Paulo'),
      work_mode = COALESCE(work_mode, 'padrao'), 
      deadline_day = COALESCE(deadline_day, 16)
    WHERE 
      timezone IS NULL OR 
      work_mode IS NULL OR 
      deadline_day IS NULL;
  `;
  
  const updateResult = await executeSQL(updateSQL);
  if (updateResult.error) {
    console.error('Failed to update existing tenants:', updateResult.error);
    return;
  }
  
  console.log('✓ Successfully updated existing tenants with default values');
  
  // Step 4: Verify the fix
  console.log('\n4. Verifying the fix...');
  
  const verifySQL = `
    SELECT 
      id,
      name,
      timezone,
      work_mode,
      deadline_day
    FROM public.tenants 
    LIMIT 5;
  `;
  
  const verifyResult = await executeSQL(verifySQL);
  if (verifyResult.error) {
    console.error('Failed to verify fix:', verifyResult.error);
    return;
  }
  
  console.log('✓ Database schema fix completed successfully!');
  console.log('Sample tenants with new columns:');
  console.table(verifyResult.data);
  
  console.log('\n=== VERIFICATION COMPLETE ===');
  console.log('✓ timezone column: ADDED');
  console.log('✓ work_mode column: ADDED'); 
  console.log('✓ deadline_day column: ADDED');
  console.log('✓ Existing tenants: UPDATED with defaults');
  console.log('\nConfiguration page should now work correctly.');
}

main().catch(console.error);