import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthResult = {
  error?: string
  message?: string
  authenticated?: boolean
}

export type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  configured: boolean
  configurationError: string | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }
  return context
}
