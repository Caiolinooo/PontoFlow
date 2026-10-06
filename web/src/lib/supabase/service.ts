import {createClient} from '@supabase/supabase-js';

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  // This client is for server-only usage (Edge/Node). Do not expose the service key to the client.
  // fetch com cache desabilitado: o Next.js estende o fetch global e cacheia
  // GETs do PostgREST no Data Cache (.next/cache), o que serviria linhas
  // STALE entre requests/restarts (ex.: tenants.auth_mode recém-alterado).
  const noStoreFetch: typeof fetch = (input, init) =>
    fetch(input, { ...init, cache: 'no-store' });
  return createClient(url, serviceKey, {
    auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: noStoreFetch},
  });
}

