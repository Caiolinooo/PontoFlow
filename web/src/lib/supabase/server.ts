import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function getServerSupabase() {
  const cookieStore = await cookies();
  const client = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string) {
        try {
          cookieStore.set(name, value);
        } catch {}
      },
      remove(name: string) {
        try {
          cookieStore.delete(name);
        } catch {}
      }
    }
  });
  return client;
}

/**
 * Get Supabase client with service role key (bypasses RLS)
 * Use only on server-side for admin operations
 */
export function getServiceSupabase() {
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

