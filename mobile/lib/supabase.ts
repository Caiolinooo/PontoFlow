import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Environment configuration with validation
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] ERROR: Missing required environment variables!');
  console.error('[Supabase] Please create a .env file in the mobile/ directory with:');
  console.error('[Supabase]   EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>');
  console.error('[Supabase]   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>');
  throw new Error(
    'Missing Supabase credentials. Please check the console for setup instructions.'
  );
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  console.error('[Supabase] ERROR: SUPABASE_URL must start with https://');
  throw new Error('Invalid Supabase URL format. Must start with https://');
}

// Validate key format (basic check)
if (supabaseAnonKey.length < 10) {
  console.error('[Supabase] ERROR: SUPABASE_ANON_KEY appears to be invalid');
  throw new Error('Invalid Supabase anon key format');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Add realtime options for future use
  realtime: {
    params: {
      headers: {
        apikey: supabaseAnonKey,
      },
    },
  },
});

// Export environment info for debugging (never log keys in production)
export const getEnvironmentInfo = () => ({
  supabaseUrl: supabaseUrl.replace(/:\/\/.*:/, '://***:***@'),
  hasAnonKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0,
});
