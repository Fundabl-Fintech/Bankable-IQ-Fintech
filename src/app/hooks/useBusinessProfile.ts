import { useState, useCallback, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase/client'
import {
  getBusinessProfile,
  updateBusinessProfile,
  type BusinessProfile,
} from '../utils/businessData'
import {
  databaseToProfile,
  mergeCanonicalProfile,
  profileHasCanonicalChanges,
  profileToDatabase,
  type DatabaseBusinessProfile,
  type ProfileSaveSource,
} from '../lib/canonical-business-profile'

export function useBusinessProfile() {
  const [profile, setProfile] = useState<BusinessProfile>(() => getBusinessProfile())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProfile(getBusinessProfile())
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: fetchError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError) throw fetchError

      const localProfile = getBusinessProfile()
      if (!data) {
        const { data: created, error: createError } = await supabase
          .from('business_profiles')
          .upsert(profileToDatabase(localProfile, user.id, 'onboarding'), {
            onConflict: 'user_id',
          })
          .select()
          .single()

        if (createError) throw createError
        const canonical = databaseToProfile(created as DatabaseBusinessProfile, localProfile)
        updateBusinessProfile(canonical)
        setProfile(canonical)
        setLastSavedAt(canonical.lastUpdated)
        return
      }

      const databaseRow = data as DatabaseBusinessProfile
      const databaseProfile = databaseToProfile(databaseRow, localProfile)
      const canonical = mergeCanonicalProfile(databaseProfile, localProfile)

      if (profileHasCanonicalChanges(databaseRow, canonical)) {
        const { data: backfilled, error: backfillError } = await supabase
          .from('business_profiles')
          .update(profileToDatabase(canonical, user.id, 'onboarding'))
          .eq('id', databaseRow.id)
          .select()
          .single()

        if (backfillError) throw backfillError
        const saved = databaseToProfile(backfilled as DatabaseBusinessProfile, canonical)
        updateBusinessProfile(saved)
        setProfile(saved)
        setLastSavedAt(saved.lastUpdated)
        return
      }

      updateBusinessProfile(canonical)
      setProfile(canonical)
      setLastSavedAt(canonical.lastUpdated)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (
    updates: Partial<BusinessProfile>,
    source: ProfileSaveSource = 'manual',
  ) => {
    const nextProfile: BusinessProfile = {
      ...profile,
      ...updates,
      lastUpdated: new Date().toISOString(),
    }

    if (!isSupabaseConfigured) {
      updateBusinessProfile(nextProfile)
      setProfile(nextProfile)
      setLastSavedAt(nextProfile.lastUpdated)
      return nextProfile
    }
    
    try {
      setSaving(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: updateError } = await supabase
        .from('business_profiles')
        .upsert(profileToDatabase(nextProfile, user.id, source), {
          onConflict: 'user_id',
        })
        .select()
        .single()

      if (updateError) throw updateError

      const saved = databaseToProfile(data as DatabaseBusinessProfile, nextProfile)
      updateBusinessProfile(saved)
      setProfile(saved)
      setLastSavedAt(saved.lastUpdated)
      return saved
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error('Unknown error')
      setError(saveError)
      throw saveError
    } finally {
      setSaving(false)
    }
  }, [profile])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    loading,
    saving,
    lastSavedAt,
    error,
    updateProfile,
    refetch: fetchProfile,
  }
}
