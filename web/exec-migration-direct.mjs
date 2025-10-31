#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function executeSQL(sql) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
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
  console.log('=== Step 1: Pre-Migration Verification ===\n');
  
  // Check current schema state
  console.log('1. Checking current schema state...');
  const schemaSQL = `
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name IN ('manager_group_assignments', 'employee_group_members', 'groups')
      AND column_name IN ('tenant_id', 'id', 'group_id')
    ORDER BY table_name, column_name;
  `;
  
  const schemaResult = await executeSQL(schemaSQL);
  if (schemaResult.error) {
    console.error('Schema check failed:', schemaResult.error);
  } else if (schemaResult.data && schemaResult.data.data) {
    console.log('Current schema state:');
    console.table(schemaResult.data.data);
  } else {
    console.log('Schema check result:', schemaResult.data);
  }
  
  // Check existing data relationships
  console.log('\n2. Checking existing data relationships...');
  const relationshipsSQL = `
    SELECT 
      'manager_group_assignments' as table_name,
      COUNT(*) as total_rows,
      COUNT(DISTINCT tenant_id) as unique_tenants
    FROM manager_group_assignments
    UNION ALL
    SELECT 
      'employee_group_members' as table_name,
      COUNT(*) as total_rows,
      COUNT(DISTINCT tenant_id) as unique_tenants
    FROM employee_group_members
    UNION ALL
    SELECT 
      'groups' as table_name,
      COUNT(*) as total_rows,
      COUNT(DISTINCT tenant_id) as unique_tenants
    FROM groups;
  `;
  
  const relationshipsResult = await executeSQL(relationshipsSQL);
  if (relationshipsResult.error) {
    console.error('Relationship check failed:', relationshipsResult.error);
  } else {
    console.log('Data relationships:');
    console.table(relationshipsResult.data);
  }
}

main().catch(console.error);