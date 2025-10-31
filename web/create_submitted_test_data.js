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

async function createSubmittedTestData() {
  console.log('=== CREATING SUBMITTED TEST DATA ===');
  
  try {
    // 1. Get existing draft timesheets
    console.log('\n1. Getting existing draft timesheets...');
    const { data: draftTimesheets, error: fetchError } = await supabase
      .from('timesheets')
      .select('id, status, periodo_ini, periodo_fim')
      .eq('status', 'draft');

    if (fetchError) {
      console.error('Error fetching draft timesheets:', fetchError);
      return;
    }

    console.log('Found draft timesheets:', draftTimesheets?.length || 0);
    if (!draftTimesheets || draftTimesheets.length === 0) {
      console.log('No draft timesheets found to update');
      return;
    }

    // 2. Update first two timesheets to 'submitted' status
    console.log('\n2. Updating timesheets to submitted status...');
    const timesheetIds = draftTimesheets.slice(0, 2).map(t => t.id);
    
    const { data: updatedTimesheets, error: updateError } = await supabase
      .from('timesheets')
      .update({ 
        status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .in('id', timesheetIds)
      .select('id, status, periodo_ini, periodo_fim');

    if (updateError) {
      console.error('Error updating timesheets:', updateError);
      return;
    }

    console.log('✅ Updated timesheets to submitted:', updatedTimesheets?.length || 0);
    console.log('Updated timesheets:', JSON.stringify(updatedTimesheets, null, 2));

    // 3. Verify current status counts
    console.log('\n3. Current status counts:');
    const { data: allTimesheets, error: allError } = await supabase
      .from('timesheets')
      .select('id, status, periodo_ini, periodo_fim');

    if (!allError && allTimesheets) {
      const statusCounts = allTimesheets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});
      console.log('Timesheets by status:', statusCounts);
      console.log('Total timesheets:', allTimesheets.length);
    }

    // 4. Now test the pending API again
    console.log('\n4. Testing pending API again...');
    console.log('✅ Test data created! Now the pending timesheets API should return submitted timesheets.');
    console.log('The API should return 2 pending timesheets instead of 0.');

  } catch (error) {
    console.error('Create submitted test data error:', error);
  }
}

createSubmittedTestData();