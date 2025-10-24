import {createClient} from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  // Intentionally do not throw to allow builds in environments without the key.
  // The cron endpoint will respond with 500 if invoked without a service key.
}

export function getServiceSupabase() {
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  // This client is for server-only usage (Edge/Node). Do not expose the service key to the client.
  return createClient(url, serviceKey, {
    auth: {persistSession: false, autoRefreshToken: false}
  });
}

