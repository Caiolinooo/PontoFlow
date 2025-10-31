import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStatusConstraint() {
  console.log('🔍 Checking current status constraint...\n');

  try {
    // Step 1: Check current distinct status values
    console.log('1. Checking existing status values in timesheets table...');
    const { data: statusData, error: statusError } = await supabase
      .from('timesheets')
      .select('status');
    
    if (statusError) {
      console.error('Error fetching status values:', statusError);
    } else {
      const uniqueStatuses = [...new Set(statusData.map(t => t.status))];
      console.log('   Found status values:', uniqueStatuses);
    }

    // Step 2: Drop the existing constraint
    console.log('\n2. Dropping existing constraint...');
    const dropQuery = `
      ALTER TABLE public.timesheets 
      DROP CONSTRAINT IF EXISTS timesheets_status_check;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { query: dropQuery });
    
    if (dropError) {
      console.error('   Error dropping constraint:', dropError);
      console.log('   Trying alternative method...');
      
      // Try direct query
      const { error: dropError2 } = await supabase
        .from('_sql')
        .insert({ query: dropQuery });
      
      if (dropError2) {
        console.error('   Alternative method also failed:', dropError2);
        console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
        console.log(dropQuery);
        console.log('\n   Then run:');
        console.log(`
ALTER TABLE public.timesheets 
ADD CONSTRAINT timesheets_status_check 
CHECK (status IN ('rascunho','enviado','aprovado','recusado','bloqueado'));
        `);
        return;
      }
    }
    
    console.log('   ✅ Constraint dropped');

    // Step 3: Create new constraint with Portuguese values
    console.log('\n3. Creating new constraint with Portuguese values...');
    const createQuery = `
      ALTER TABLE public.timesheets 
      ADD CONSTRAINT timesheets_status_check 
      CHECK (status IN ('rascunho','enviado','aprovado','recusado','bloqueado'));
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { query: createQuery });
    
    if (createError) {
      console.error('   Error creating constraint:', createError);
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
      console.log(createQuery);
      return;
    }
    
    console.log('   ✅ New constraint created');

    // Step 4: Test the constraint
    console.log('\n4. Testing the constraint...');
    console.log('   Testing valid value "recusado"...');
    
    // Get a test timesheet
    const { data: testTs } = await supabase
      .from('timesheets')
      .select('id, status')
      .limit(1)
      .single();
    
    if (testTs) {
      const originalStatus = testTs.status;
      
      // Try to update to 'recusado'
      const { error: testError } = await supabase
        .from('timesheets')
        .update({ status: 'recusado' })
        .eq('id', testTs.id);
      
      if (testError) {
        console.error('   ❌ Test failed:', testError.message);
      } else {
        console.log('   ✅ Test passed - "recusado" is accepted');
        
        // Restore original status
        await supabase
          .from('timesheets')
          .update({ status: originalStatus })
          .eq('id', testTs.id);
        
        console.log('   ✅ Original status restored');
      }
    }

    console.log('\n✅ Status constraint fix completed!');
    console.log('\nValid status values:');
    console.log('  - rascunho (draft)');
    console.log('  - enviado (submitted)');
    console.log('  - aprovado (approved)');
    console.log('  - recusado (rejected)');
    console.log('  - bloqueado (blocked)');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

fixStatusConstraint();

