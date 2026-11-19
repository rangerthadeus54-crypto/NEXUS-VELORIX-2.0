import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  } catch {
    return false
  }
}

export const authConfigurationError = !supabaseUrl || !supabaseAnonKey
  ? 'Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local environment to enable account features.'
  : !isValidSupabaseUrl(supabaseUrl)
    ? 'Supabase Auth is unavailable because VITE_SUPABASE_URL is not a valid HTTPS URL.'
    : null

export const supabaseClient = authConfigurationError === null && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null

export async function getCurrentAccessToken(): Promise<string | null> {
  if (!supabaseClient) return null

  const { data, error } = await supabaseClient.auth.getSession()
  if (error) throw error
  return data.session?.access_token ?? null
}
