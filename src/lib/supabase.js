const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create a client for authenticated users (with RLS)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create an admin client that bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
