import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

console.log(import.meta.env.SUPABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseKey);
