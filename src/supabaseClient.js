import { createClient } from "@supabase/supabase-js";

// Read from Vite env vars (provided by Cloudflare at build time)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Optional safety check – helps catch config mistakes
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
