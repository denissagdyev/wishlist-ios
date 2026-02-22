// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xjbnhcxmjtrrtpvjnbgv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ajO3I1Y4QIM61d5wJD48Qg_L6DSsSEj';

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: {
        getItem: (key) => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: (key) => AsyncStorage.removeItem(key),
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // в React Native нет URL
    },
  }
);