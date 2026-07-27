import assert from 'node:assert/strict';
import {
  databaseToProfile,
  mergeCanonicalProfile,
  profileHasCanonicalChanges,
  profileToDatabase,
} from '../src/app/lib/canonical-business-profile';
import type { BusinessProfile } from '../src/app/utils/businessData';

const emptyProfile: BusinessProfile = {
  businessLegalName: '',
  contactFirstName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
  businessAddress: '',
  city: '',
  state: '',
  zipCode: '',
  businessType: '',
  industry: '',
  timeInBusiness: '',
  annualRevenue: '',
  monthlyRevenue: '',
  hasEIN: false,
  hasBankAccount: false,
  hasBusinessAddress: false,
  hasBusinessPhone: false,
  hasBusinessEmail: false,
  hasWebsite: false,
  hasBusinessLicense: false,
  personalCreditScore: 0,
  hasBusinessCredit: false,
  tradelineCount: 0,
  hasDUNS: false,
  scanCompleted: false,
  lastUpdated: '2026-01-01T00:00:00.000Z',
  createdDate: '2026-01-01T00:00:00.000Z',
};

const onboardingProfile: BusinessProfile = {
  ...emptyProfile,
  businessLegalName: 'Murphy Capital LLC',
  contactFirstName: 'Kevin',
  contactEmail: 'kevin@example.com',
  hasEIN: true,
  einNumber: '12-3456789',
  annualRevenue: '$500K',
};

const databaseRow = {
  id: 'profile-1',
  user_id: 'user-1',
  business_legal_name: 'Murphy Capital LLC',
  contact_first_name: 'Kevin',
  contact_email: 'kevin@example.com',
  has_ein: true,
  ein_number: '12-3456789',
  annual_revenue: '$500K',
  updated_at: '2026-07-27T00:00:00.000Z',
  created_at: '2026-07-26T00:00:00.000Z',
};

const mapped = databaseToProfile(databaseRow, emptyProfile);
assert.equal(mapped.businessLegalName, 'Murphy Capital LLC');
assert.equal(mapped.hasEIN, true);
assert.equal(mapped.lastUpdated, '2026-07-27T00:00:00.000Z');

const serialized = profileToDatabase(onboardingProfile, 'user-1', 'onboarding');
assert.equal(serialized.business_legal_name, 'Murphy Capital LLC');
assert.equal(serialized.has_ein, true);
assert.equal(serialized.updated_by_source, 'onboarding');
assert.equal(serialized.lastUpdated, undefined);

const canonical = mergeCanonicalProfile(
  databaseToProfile(
    {
      ...databaseRow,
      annual_revenue: null,
      business_type: 'LLC',
    },
    emptyProfile,
  ),
  onboardingProfile,
);
assert.equal(canonical.annualRevenue, '$500K');
assert.equal(canonical.businessType, 'LLC');

const completeCanonicalRow = profileToDatabase(onboardingProfile, 'user-1', 'onboarding');
assert.equal(profileHasCanonicalChanges(completeCanonicalRow, onboardingProfile), false);
assert.equal(
  profileHasCanonicalChanges(databaseRow, {
    ...onboardingProfile,
    annualRevenue: '$1M',
  }),
  true,
);

console.log('Canonical business profile tests passed.');
