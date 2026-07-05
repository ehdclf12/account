import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export async function ensureSignedIn(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_SHARED_EMAIL as string,
    password: import.meta.env.VITE_SHARED_PASSWORD as string,
  })
  if (error) throw error
}
