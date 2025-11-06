import { getServerSupabase } from '@/lib/supabase/server';

// Cache for BASE_URL to avoid repeated database calls
let baseUrlCache: string | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get the application BASE_URL from the database or fallback to environment variables
 * 
 * This function retrieves the BASE_URL from the app_config table.
 * If the table doesn't exist or there's an error, it falls back to:
 * 1. NEXT_PUBLIC_BASE_URL environment variable
 * 2. http://localhost:3000 (development default)
 * 
 * The result is cached for 5 minutes to reduce database load.
 * 
 * @returns Promise<string> The base URL for the application
 */
export async function getBaseUrl(): Promise<string> {
  // Check cache first
  const now = Date.now();
  if (baseUrlCache && (now - lastFetchTime) < CACHE_DURATION) {
    return baseUrlCache;
  }

  try {
    const supabase = await getServerSupabase();
    
    // Try to fetch from app_config table
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'BASE_URL')
      .single();

    if (!error && data?.value) {
      baseUrlCache = data.value;
      lastFetchTime = now;
      return data.value;
    }
  } catch (error) {
    console.warn('Error fetching BASE_URL from app_config:', error);
  }

  // Fallback to environment variable
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBaseUrl) {
    baseUrlCache = envBaseUrl;
    lastFetchTime = now;
    return envBaseUrl;
  }

  // Final fallback to development default
  const defaultUrl = 'http://localhost:3000';
  baseUrlCache = defaultUrl;
  lastFetchTime = now;
  return defaultUrl;
}

/**
 * Clear the BASE_URL cache (useful for testing or when the value has been updated)
 */
export function clearBaseUrlCache(): void {
  baseUrlCache = null;
  lastFetchTime = 0;
}

/**
 * Get the BASE_URL synchronously (for use in components that don't need await)
 * Note: This will return a default value if the async version hasn't been called yet
 * 
 * @returns string The cached base URL or development default
 */
export function getBaseUrlSync(): string {
  if (baseUrlCache) {
    return baseUrlCache;
  }
  
  // Return environment variable as sync fallback
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}