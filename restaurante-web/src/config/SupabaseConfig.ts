import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import SecureStorageAdapter from '../utils/SecureStorageAdapter';

// Credentials provided by environment variables
// Remove fallback hardcoded keys for security
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[SupabaseConfig] Missing environment variables for Supabase connection');
}

/**
 * Supabase client with optimized connection pool settings
 * Requirements: 3.1, 3.7
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStorageAdapter, // Use SecureStore on mobile
    autoRefreshToken: true,
    persistSession: true, // Enable persistence with secure storage
    detectSessionInUrl: Platform.OS === 'web',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'restaurante-app',
    },
  },
  // Realtime configuration for optimal performance
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit events to prevent overwhelming the client
    },
  },
});
