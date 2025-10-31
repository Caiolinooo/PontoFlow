const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
const supabase = createClient(
  'https://arzvingdtnttiejcvucs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function testStatusValues() {
  console.log('=== TESTING STATUS VALUES ===');
  
  try {
    // 1. Get existing draft timesheets
    console.log('\n1. Getting existing draft timesheets...');
    const { data: draftTimesheets, error: fetchError } = await supabase
      .from('timesheets')
      .select('id, status, periodo_ini, periodo_fim')
      .eq('status', 'draft')
      .limit(3);

    if (fetchError) {
      console.error('Error fetching draft timesheets:', fetchError);
      return;
    }

    console.log('Found draft timesheets:', draftTimesheets?.length || 0);
    if (!draftTimesheets || draftTimesheets.length === 0) {
      console.log('No draft timesheets found');
      return;
    }

    // 2. Test different status values
    const statusTests = ['submitted', 'pending', 'approved', 'rejected', 'enviado', 'submetido', 'pendente'];
    
    for (const statusValue of statusTests) {
      console.log(`\n2. Testing status: "${statusValue}"`);
      
      try {
        const { data: updateResult, error: updateError } = await supabase
          .from('timesheets')
          .update({ status: statusValue })
          .eq('id', draftTimesheets[0].id)
          .select('id, status');

        if (updateError) {
          console.log(`❌ "${statusValue}" failed: ${updateError.message}`);
        } else {
          console.log(`✅ "${statusValue}" succeeded!`);
          console.log('Updated timesheet:', updateResult);
          
          // Reset back to draft for next test
          await supabase
            .from('timesheets')
            .update({ status: 'draft' })
            .eq('id', draftTimesheets[0].id);
        }
      } catch (e) {
        console.log(`❌ "${statusValue}" error: ${e.message}`);
      }
    }

    // 3. Check what the current valid statuses are by looking at the database schema
    console.log('\n3. Checking database for status enum/constraints...');
    
    // Try a simple query to see if we can get column information
    const { data: columnInfo, error: columnError } = await supabase
      .from('timesheets')
      .select('*')
      .limit(1);

    if (!columnError) {
      console.log('Timesheets table structure accessible');
    }

  } catch (error) {
    console.error('Test status values error:', error);
  }
}

testStatusValues();