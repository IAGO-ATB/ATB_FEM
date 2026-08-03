import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Strip trailing slashes and /rest/v1 suffix which the SDK adds automatically
const supabaseUrl = rawUrl.replace(/\/$/, '').replace(/\/rest\/v1$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if keys are present and NOT placeholders from .env.example
const isValidConfig = (url?: string, key?: string) => {
  if (!url || !key) return false;
  if (url.includes('your-project') || key.includes('your-anon-key')) return false;
  return true;
};

// Lazy client creation to prevent crash on module load if keys are missing
export const getSupabase = () => {
  if (!isValidConfig(supabaseUrl, supabaseAnonKey)) {
    throw new Error('Supabase URL and Anon Key are required. Please configure them in the Secrets panel.');
  }
  return createClient(supabaseUrl!, supabaseAnonKey!);
};

export const supabase = isValidConfig(supabaseUrl, supabaseAnonKey) 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null;
