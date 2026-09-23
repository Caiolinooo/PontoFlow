import { supabase } from './supabase';

/**
 * API Base URL configuration for mobile environment.
 *
 * Development options:
 *   - Android emulator: http://10.0.2.2:3000/api (special alias to host)
 *   - iOS simulator: http://localhost:3000/api or http://127.0.0.1:3000/api
 *   - Physical device (same WiFi): http://<PC-IP>:3000/api
 *   - Custom URL: Set EXPO_PUBLIC_API_URL env variable
 *
 * Production:
 *   - Set EXPO_PUBLIC_API_URL=https://your-domain.com/api
 */
function getApiBaseUrl(): string {
  // Custom URL takes priority
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Detect platform and use appropriate default
  // Note: process.env.EXPO_OS is inlined by babel-preset-expo at build time
  if (typeof process.env.EXPO_OS !== 'undefined') {
    if (process.env.EXPO_OS === 'android') {
      // Android emulator uses 10.0.2.2 to reach host machine
      return 'http://10.0.2.2:3000/api';
    }
    if (process.env.EXPO_OS === 'ios') {
      // iOS simulator can use localhost
      return 'http://localhost:3000/api';
    }
  }

  // Fallback for unknown environments
  return 'http://localhost:3000/api';
}

const API_BASE_URL = getApiBaseUrl();

/**
 * Universal fetch client that injects the Supabase JWT
 * to communicate seamlessly with the Next.js backend.
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Automatically parse JSON if the response is successful
    if (response.ok) {
      // Some endpoints might return empty responses
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  } catch (error) {
    console.error(`[API Client Error] ${endpoint}:`, error);
    throw error;
  }
}
