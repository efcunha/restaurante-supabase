import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Credentials provided by user
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ykalocfhnetxenvmtlcn.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

/**
 * Supabase client with optimized connection pool settings
 * Requirements: 3.1, 3.7
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: false,   // Disable auto-login - require authentication every time
    detectSessionInUrl: false,
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
