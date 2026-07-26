import React, { createContext, useContext, useState, useEffect } from 'react'
import { isSupabaseConfigured } from '../lib/supabase/client'
import { restoreFromDatabase } from '../lib/data-adapter'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip if Supabase not configured
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Check for existing session
    const checkSession = async () => {
      try {
        const { supabase } = await import('../lib/supabase/client')
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        // Restore assessment + badges from DB if DB record is newer than localStorage.
        // Runs before setLoading(false) so ProtectedRoute spinner acts as a gate —
        // no page renders until localStorage is populated.
        if (session?.user) {
          await restoreFromDatabase()
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    let unsubscribe: (() => void) | undefined

    const setupListener = async () => {
      try {
        const { supabase } = await import('../lib/supabase/client')
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            // On explicit sign-in (not boot — checkSession handles that),
            // restore DB data so the user's account follows them across devices
            if (_event === 'SIGNED_IN' && session?.user) {
              await restoreFromDatabase()
            }
          }
        )
        unsubscribe = () => subscription?.unsubscribe()
      } catch (error) {
        console.error('Error setting up auth listener:', error)
      }
    }

    setupListener()

    return () => unsubscribe?.()
  }, [])

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase/client')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })
      if (error) throw error

      // Database triggers create the canonical workspace, membership, business
      // profile, and owner access in one transaction with the auth user.
      if (!data.user) throw new Error('Account creation did not return a user.');
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase/client')
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    try {
      const { supabase } = await import('../lib/supabase/client')
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  const updatePassword = async (password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured')
    }

    try {
      const { supabase } = await import('../lib/supabase/client')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return
    }

    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase/client')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
