import { createClient } from "@supabase/supabase-js";

/**
 * Official Supabase Client setup for Google OAuth authentication & DB sync.
 * Configured via environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ams-tracker.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
