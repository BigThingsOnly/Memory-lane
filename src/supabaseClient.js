import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly and clearly instead of a cryptic network error deep in the app —
  // see README.md Part 2, step 3-4 for how to set these.
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env and fill in ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project settings.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
