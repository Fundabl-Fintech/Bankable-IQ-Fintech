import type { BusinessProfile } from '../utils/businessData';

export type ProfileSaveSource =
  | 'manual'
  | 'onboarding'
  | 'assessment'
  | 'integration'
  | 'import';

export interface DatabaseBusinessProfile {
  id?: string;
  user_id?: string;
  tenant_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by_source?: ProfileSaveSource | null;
  [key: string]: unknown;
}

export const BUSINESS_PROFILE_FIELD_MAP = {
  businessLegalName: 'business_legal_name',
  contactFirstName: 'contact_first_name',
  contactLastName: 'contact_last_name',
  contactEmail: 'contact_email',
  contactPhone: 'contact_phone',
  businessAddress: 'business_address',
  city: 'city',
  state: 'state',
  zipCode: 'zip_code',
  businessType: 'business_type',
  industry: 'industry',
  naicsCode: 'naics_code',
  timeInBusiness: 'time_in_business',
  annualRevenue: 'annual_revenue',
  monthlyRevenue: 'monthly_revenue',
  hasEIN: 'has_ein',
  einNumber: 'ein_number',
  hasBankAccount: 'has_bank_account',
  hasBusinessAddress: 'has_business_address',
  hasBusinessPhone: 'has_business_phone',
  businessPhoneNumber: 'business_phone_number',
  hasBusinessEmail: 'has_business_email',
  hasWebsite: 'has_website',
  websiteUrl: 'website_url',
  hasBusinessLicense: 'has_business_license',
  personalCreditScore: 'personal_credit_score',
  equifaxScore: 'equifax_score',
  transunionScore: 'transunion_score',
  experianScore: 'experian_score',
  hasBusinessCredit: 'has_business_credit',
  tradelineCount: 'tradeline_count',
  hasDUNS: 'has_duns',
  dunsNumber: 'duns_number',
  profilePhoto: 'profile_photo',
  linkedInUrl: 'linkedin_url',
  facebookUrl: 'facebook_url',
  twitterUrl: 'twitter_url',
  instagramUrl: 'instagram_url',
  youtubeUrl: 'youtube_url',
  tiktokUrl: 'tiktok_url',
  ethnicity: 'ethnicity',
  annualHouseholdIncome: 'annual_household_income',
  primaryLanguage: 'primary_language',
  householdSize: 'household_size',
  comfortableWithEnglishCoaching: 'comfortable_with_english_coaching',
  livesInRuralArea: 'lives_in_rural_area',
  gender: 'gender',
  referralSource: 'referral_source',
  birthday: 'birthday',
  bankingPartner: 'banking_partner',
  scanCompleted: 'scan_completed',
  scanCompletedDate: 'scan_completed_date',
} as const satisfies Partial<Record<keyof BusinessProfile, string>>;

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'boolean') return value;
  return value !== null && value !== undefined;
}

export function profileToDatabase(
  profile: BusinessProfile,
  userId: string,
  source: ProfileSaveSource,
): DatabaseBusinessProfile {
  const row: DatabaseBusinessProfile = {
    user_id: userId,
    updated_by_source: source,
    updated_at: new Date().toISOString(),
  };

  for (const [profileKey, databaseKey] of Object.entries(BUSINESS_PROFILE_FIELD_MAP)) {
    const value = profile[profileKey as keyof BusinessProfile];
    row[databaseKey] = value === undefined ? null : value;
  }

  return row;
}

export function databaseToProfile(
  row: DatabaseBusinessProfile,
  fallback: BusinessProfile,
): BusinessProfile {
  const profile = { ...fallback };

  for (const [profileKey, databaseKey] of Object.entries(BUSINESS_PROFILE_FIELD_MAP)) {
    const value = row[databaseKey];
    if (value !== null && value !== undefined) {
      (profile as Record<string, unknown>)[profileKey] = value;
    }
  }

  profile.createdDate = row.created_at ?? fallback.createdDate;
  profile.lastUpdated = row.updated_at ?? fallback.lastUpdated;
  return profile;
}

/**
 * Database values are authoritative. Local values only fill fields that have
 * never been populated in the canonical row, which preserves onboarding and
 * assessment answers captured before account creation.
 */
export function mergeCanonicalProfile(
  databaseProfile: BusinessProfile,
  localProfile: BusinessProfile,
): BusinessProfile {
  const merged = { ...databaseProfile };

  for (const profileKey of Object.keys(BUSINESS_PROFILE_FIELD_MAP) as Array<
    keyof typeof BUSINESS_PROFILE_FIELD_MAP
  >) {
    const databaseValue = databaseProfile[profileKey];
    const localValue = localProfile[profileKey];
    if (!hasMeaningfulValue(databaseValue) && hasMeaningfulValue(localValue)) {
      (merged as Record<string, unknown>)[profileKey] = localValue;
    }
  }

  merged.createdDate = databaseProfile.createdDate || localProfile.createdDate;
  merged.lastUpdated = databaseProfile.lastUpdated || localProfile.lastUpdated;
  return merged;
}

export function profileHasCanonicalChanges(
  row: DatabaseBusinessProfile,
  profile: BusinessProfile,
): boolean {
  return Object.entries(BUSINESS_PROFILE_FIELD_MAP).some(([profileKey, databaseKey]) => {
    const profileValue = profile[profileKey as keyof BusinessProfile] ?? null;
    const databaseValue = row[databaseKey] ?? null;
    return profileValue !== databaseValue;
  });
}
