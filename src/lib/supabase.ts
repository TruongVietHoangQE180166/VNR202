/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

console.log('Supabase URL configured:', supabaseUrl !== 'https://placeholder.supabase.co' ? 'Yes' : 'No');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
