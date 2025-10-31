require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking profiles table structure...');

  // Get all profiles to see structure
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log('Sample profile:', JSON.stringify(profiles, null, 2));
  }
})().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

