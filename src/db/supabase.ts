import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(
  "https://upegfchzvcnmoxfwamod.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZWdmY2h6dmNubW94ZndhbW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODMxNzAsImV4cCI6MjA2OTk1OTE3MH0.SJKn6b9823OIpJbmaIe4lP45WO1zwM6ZMxnSmFahYms"
);

// Admin əməliyyatları üçün service role client
export const supabaseAdmin = supabaseServiceKey
  ? createClient("https://upegfchzvcnmoxfwamod.supabase.co", supabaseServiceKey)
  : supabase;
