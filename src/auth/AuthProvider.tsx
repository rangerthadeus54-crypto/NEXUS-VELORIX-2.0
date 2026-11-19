import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from './AuthContext'
import type { AuthResult, PlayerProfile } from './AuthContext'
import { authConfigurationError, supabaseClient } from './supabase'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The authentication request could not be completed.'
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabaseClient !== null)

  useEffect(() => {
    if (!supabaseClient) return

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabaseClient) return { error: authConfigurationError ?? 'Supabase Auth is unavailable.' }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      setSession(data.session)
      return { authenticated: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }

  const signUp = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    if (!supabaseClient) return { error: authConfigurationError ?? 'Supabase Auth is unavailable.' }

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName.trim() } },
      })

      if (error) return { error: error.message }
      setSession(data.session)

      return data.session
        ? { authenticated: true, message: 'Your account is ready.' }
        : { message: 'Check your email for a verification link to finish creating your account.' }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }

  const signOut = async (): Promise<AuthResult> => {
    if (!supabaseClient) return { error: authConfigurationError ?? 'Supabase Auth is unavailable.' }

    try {
      const { error } = await supabaseClient.auth.signOut()
      return error ? { error: error.message } : {}
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }

  const resetPassword = async (email: string): Promise<AuthResult> => {
    if (!supabaseClient) return { error: authConfigurationError ?? 'Supabase Auth is unavailable.' }

    try {
      const redirectTo = `${window.location.origin}/password-recovery`
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo })
      return error
        ? { error: error.message }
        : { message: 'If an account exists for that email, a password reset link is on its way.' }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }

  const updatePassword = async (password: string): Promise<AuthResult> => {
    if (!supabaseClient) return { error: authConfigurationError ?? 'Supabase Auth is unavailable.' }

    try {
      const { error } = await supabaseClient.auth.updateUser({ password })
      return error ? { error: error.message } : { message: 'Your password has been updated.' }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }

  const updatePlayerProfile = async (profile: PlayerProfile): Promise<AuthResult> => {
    if (!supabaseClient) return { error: authConfigurationError ?? 'Supabase Auth is unavailable.' }

    try {
      const { data, error } = await supabaseClient.auth.updateUser({
        data: {
          display_name: profile.displayName.trim(),
          favorite_games: profile.favoriteGames,
          platform: profile.platform,
          country: profile.country,
        },
      })

      if (error) return { error: error.message }

      setSession((current) => current ? { ...current, user: data.user } : current)
      return { message: 'Your player profile has been saved.' }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        configured: supabaseClient !== null,
        configurationError: authConfigurationError,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updatePlayerProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
