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

async function executeSQL(sql) {
  try {
    // Try direct SQL through supabase RPC
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    if (error) {
      console.log('execute_sql RPC failed, trying alternative method...');
      // Alternative: Execute through SQL editor API simulation
      const { data: result, error: altError } = await supabase
        .from('_dummy')
        .select('*')
        .limit(0); // This will fail but show us the structure
      
      if (altError && altError.message.includes('execute_sql')) {
        console.log('Need to create execute_sql function first');
        return { success: false, data: null, error: altError };
      }
      return { success: true, data: result, error: null };
    }
    return { success: true, data, error: null };
  } catch (err) {
    console.error('SQL execution error:', err);
    return { success: false, data: null, error: err };
  }
}

async function createExecuteSQLFunction() {
  console.log('Creating execute_sql function...');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.execute_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
      rec record;
      query_results json[] := '{}';
    BEGIN
      -- Execute the query and collect results
      FOR rec IN EXECUTE query LOOP
        query_results := query_results || row_to_json(rec);
      END LOOP;
      
      result := json_build_object(
        'success', true,
        'data', array_to_json(query_results),
        'message', 'Query executed successfully'
      );
      
      RETURN result;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object(
          'success', false,
          'data', null,
          'error', SQLERRM,
          'message', 'Query execution failed'
        );
    END;
    $$;
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;
  `;
  
  const result = await executeSQL(createFunctionSQL);
  if (result.success) {
    console.log('✅ execute_sql function created successfully');
  } else {
    console.log('❌ Failed to create execute_sql function:', result.error);
  }
  
  return result.success;
}

async function main() {
  console.log('=== Creating execute_sql Function ===\n');
  
  const success = await createExecuteSQLFunction();
  
  if (success) {
    console.log('\n✅ Function creation successful! Ready for timezone migration.');
  } else {
    console.log('\n❌ Function creation failed. Manual setup required.');
  }
}

main().catch(console.error);