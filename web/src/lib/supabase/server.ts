import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

