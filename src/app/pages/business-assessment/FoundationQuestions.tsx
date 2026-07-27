// ════════════════════════════════════════════════════════════════════════════════
// FUNDREADY™ — Foundation Questions (Q_F1–Q_F11)
// These 11 questions replace ALL of BSS Steps 1-3
// Smart grouping, combined fields, zero redundancy
// ════════════════════════════════════════════════════════════════════════════════

import { motion } from 'motion/react';
import { UnifiedAnswers } from './types';
import { Info } from 'lucide-react';

interface FoundationQuestionProps {
  step: number;
  data: UnifiedAnswers;
  updateData: (updates: Partial<UnifiedAnswers>) => void;
  onNext: () => void;
  onBack: () => void;
  currentQuestionNumber?: number;
  totalQuestions?: number;
}

export function FoundationQuestion({ step, data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions }: FoundationQuestionProps) {
  const questions = [
    QuestionF1, QuestionF2, QuestionF3, QuestionF4, QuestionF5,
    QuestionF6, QuestionF7, QuestionF8, QuestionF9, QuestionF_DSCR,
    QuestionF10, QuestionF11_Capital, QuestionF12_Eligibility,
  ];

  const CurrentQuestion = questions[step];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
      <CurrentQuestion 
        data={data} 
        updateData={updateData} 
        onNext={onNext} 
        onBack={onBack} 
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
        step={step}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════════════════════════════════

function QuestionHeader({ number, title, why, currentQuestionNumber, totalQuestions }: { number: number; title: string; why: string; currentQuestionNumber?: number; totalQuestions?: number }) {
  return (
    <>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          marginBottom: '16px',
        }}
      >
        Question {currentQuestionNumber || number} of {totalQuestions || 25}
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '24px',
          lineHeight: 1.3,
        }}
      >
        {title}
      </h2>

      <div
        style={{
          background: 'var(--primary-alpha)',
          border: '1px solid var(--primary)',
          borderLeft: '3px solid var(--primary)',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            fontStyle: 'italic',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          {why}
        </div>
      </div>
    </>
  );
}

function NavigationButtons({ onNext, onBack, disabled, step }: any) {
  return (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '40px' }}>
      {step > 0 && (
        <button
          onClick={onBack}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            padding: '12px 24px',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      )}

      <button
        onClick={onNext}
        disabled={disabled}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          fontWeight: 600,
          padding: '12px 32px',
          background: disabled ? 'var(--bg-surface-2)' : 'var(--primary)',
          border: 'none',
          borderRadius: '8px',
          color: disabled ? 'var(--text-disabled)' : 'var(--bg-base)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          marginLeft: 'auto',
        }}
      >
        Continue →
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F1: Owner Contact Info
// ════════════════════════════════════════════════════════════════════════════════

function QuestionF1({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const isValid = (data.ownerFirstName || '').trim() && 
                  (data.ownerLastName || '').trim() && 
                  (data.ownerEmail || '').trim() && 
                  (data.ownerPhone || '').trim();

  return (
    <>
      <QuestionHeader
        number={1}
        title="Let's start with who's behind this business"
        why="Every funding profile starts with the business owner. This helps us personalize your capital readiness assessment and ensures we can reach you with important insights."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '8px' }}>
        {/* First Name */}
        <div>
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            First Name
          </label>
          <input
            type="text"
            value={data.ownerFirstName || ''}
            onChange={(e) => updateData({ ownerFirstName: e.target.value })}
            placeholder="John"
            style={{
              width: '100%',
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              padding: '14px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Last Name */}
        <div>
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            Last Name
          </label>
          <input
            type="text"
            value={data.ownerLastName || ''}
            onChange={(e) => updateData({ ownerLastName: e.target.value })}
            placeholder="Smith"
            style={{
              width: '100%',
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              padding: '14px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Email */}
        <div>
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            Email Address
          </label>
          <input
            type="email"
            value={data.ownerEmail || ''}
            onChange={(e) => updateData({ ownerEmail: e.target.value })}
            placeholder="john.smith@example.com"
            style={{
              width: '100%',
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              padding: '14px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Phone */}
        <div>
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            Phone Number
          </label>
          <input
            type="tel"
            value={data.ownerPhone || ''}
            onChange={(e) => updateData({ ownerPhone: e.target.value })}
            placeholder="(555) 123-4567"
            style={{
              width: '100%',
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              padding: '14px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!isValid} step={0} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F2: Business Name + Entity Type
// ════════════════════════════════════════════════════════════════════════════════

const HIGH_RISK_WORDS = [
  'adult','alcohol','ammo','auction','bail','banking','billing','beer','booking',
  'broker','cannabis','capital','cashing','check','cigarette','collection','credit',
  'dating','dealer','debt','dropship','fantasy','financial','financing','firearm',
  'fitness','gambling','gun','gym','insurance','lending','liquor','loan','media',
  'mortgage','pawn','psychic','realtor','repair','smoking','telemarket','tobacco',
  'travel','vape','vending','warrant','wine',
];

function getHighRiskWord(name: string): string | null {
  const lower = name.toLowerCase();
  return HIGH_RISK_WORDS.find(w => lower.includes(w)) || null;
}

function QuestionF2({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const entityTypes = [
    { value: 'sole_prop', label: 'Sole Proprietorship', sub: 'No legal separation' },
    { value: 'llc_single', label: 'LLC (Single-Member)', sub: 'Basic liability protection' },
    { value: 'llc_multi', label: 'LLC (Multi-Member) / Partnership', sub: 'Shared ownership structure' },
    { value: 'corp', label: 'S-Corp or C-Corp', sub: 'Strongest legal structure' },
  ];

  const isValid = (data.businessName || '').trim() && data.entityType;
  const highRiskWord = getHighRiskWord(data.businessName || '');

  return (
    <>
      <QuestionHeader
        number={2}
        title="Tell us about your business structure"
        why="Lenders verify legal names against state records and EIN databases. Entity type is the strongest structural signal — it shapes how lenders evaluate your liability separation and business maturity."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Business Name */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Business Legal Name
        </label>
        <input
          type="text"
          value={data.businessName || ''}
          onChange={(e) => updateData({ businessName: e.target.value })}
          placeholder="Enter your legal business name"
          style={{
            width: '100%',
            fontFamily: 'var(--font-body)',
            fontSize: '16px',
            padding: '14px 16px',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
          }}
        />
        {/* High-risk name warning */}
        {highRiskWord && (
          <div style={{ marginTop: '10px', padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '2px' }}>
                "{highRiskWord}" may trigger lender auto-declines
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#78350f', lineHeight: 1.5 }}>
                Lenders use automated underwriting that flags certain keywords in business names. This doesn't disqualify you, but it reduces your approved options. Consider a DBA (doing business as) name if possible.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entity Type */}
      <div style={{ marginBottom: '8px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Entity Type
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
        {entityTypes.map((type) => (
          <motion.div
            key={type.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateData({ entityType: type.value as any })}
            style={{
              background: data.entityType === type.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
              border: data.entityType === type.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}
            >
              {type.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 300,
                color: 'var(--text-secondary)',
              }}
            >
              {type.sub}
            </div>
            {data.entityType === type.value && (
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--bg-base)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Sole prop upgrade notice with referral */}
      {data.entityType === 'sole_prop' && (
        <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#1d4ed8', marginBottom: '4px' }}>
            Sole proprietors access 10× fewer capital products
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#1e40af', lineHeight: 1.5, marginBottom: '8px' }}>
            An LLC or Corp creates the legal separation lenders require. It also protects your personal assets. You can form one in as little as 24 hours.
          </div>
          <a
            href="https://www.zenbusiness.com/?utm_source=bankableiq"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none', background: 'rgba(59,130,246,0.1)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.25)' }}
          >
            Form your LLC with ZenBusiness → <span style={{ fontSize: '10px', opacity: 0.7 }}>starts at $0 + state fee</span>
          </a>
        </div>
      )}

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!isValid} step={1} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════���═════════
// Q_F3: Start Date + Industry
// ════════════════════════════════════════════════════════════════════════════════

function QuestionF3({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const industries = [
    'Accounting, Tax Preparation, Bookkeeping',
    'Advertising, Marketing, Public Relations',
    'Agriculture, Farming, Ranching',
    'Architecture, Engineering, Surveying',
    'Automotive Sales, Service, Repair',
    'Beauty Salon, Barbershop, Spa, Cosmetics',
    'Childcare, Daycare Services',
    'Cleaning Services (Commercial or Residential)',
    'Computer Services, IT, Software Development',
    'Construction, Contracting, Remodeling',
    'Consulting, Business Services',
    'Dental Practice',
    'E-commerce, Online Retail',
    'Education, Tutoring, Training',
    'Entertainment, Events, Production',
    'Financial Services, Insurance',
    'Fitness Center, Gym, Personal Training',
    'Food & Beverage Manufacturing',
    'Freight, Trucking, Logistics',
    'Healthcare, Medical Practice',
    'Home Services (Plumbing, Electrical, HVAC)',
    'Hospitality, Hotels, Lodging',
    'Landscaping, Lawn Care, Tree Service',
    'Legal Services, Law Firm',
    'Manufacturing, Production',
    'Pet Services, Veterinary',
    'Photography, Videography',
    'Property Management, Real Estate',
    'Restaurant, Food Service, Catering',
    'Retail Store (Brick & Mortar)',
    'Security Services',
    'Technology, Telecommunications',
    'Transportation, Taxi, Rideshare',
    'Wholesale, Distribution',
    'Other',
  ];

  // Calculate business age
  const now = new Date();
  const ageMonths = data.startDate.year && data.startDate.month
    ? (now.getFullYear() - data.startDate.year) * 12 + (now.getMonth() + 1 - data.startDate.month)
    : 0;
  const ageYears = Math.floor(ageMonths / 12);
  const ageRemainder = ageMonths % 12;

  const isValid = data.startDate.year && data.startDate.month && data.industry;

  return (
    <>
      <QuestionHeader
        number={3}
        title="When did your business begin, and what industry are you in?"
        why="Business age is one of the first filters lenders apply — and one they cannot override. Industry determines the risk lens applied to your profile, as some sectors face additional scrutiny regardless of financials."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Start Date */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Business Start Date
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={data.startDate.month}
            onChange={(e) => updateData({ startDate: { ...data.startDate, month: parseInt(e.target.value) } })}
            style={{
              flex: 1,
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              padding: '14px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="">Month</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={data.startDate.year}
            onChange={(e) => updateData({ startDate: { ...data.startDate, year: parseInt(e.target.value) } })}
            style={{
              flex: 1,
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              padding: '14px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="">Year</option>
            {[...Array(30)].map((_, i) => {
              const year = now.getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        {ageMonths > 0 && (
          <div
            style={{
              marginTop: '12px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--primary)',
            }}
          >
            {ageYears > 0 && `${ageYears} year${ageYears !== 1 ? 's' : ''}`}
            {ageYears > 0 && ageRemainder > 0 && ', '}
            {ageRemainder > 0 && `${ageRemainder} month${ageRemainder !== 1 ? 's' : ''}`}
            {' in operation'}
          </div>
        )}
      </div>

      {/* Industry */}
      <div style={{ marginBottom: '8px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Major Industry Focus
        </label>
        <select
          value={data.industry}
          onChange={(e) => updateData({ industry: e.target.value })}
          style={{
            width: '100%',
            fontFamily: 'var(--font-body)',
            fontSize: '16px',
            padding: '14px 16px',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <option value="">Select your industry</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!isValid} step={2} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F4: EIN + Website
// ════════════════════════════════════════════════════════════════════════════════

function QuestionF4({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  return (
    <>
      <QuestionHeader
        number={4}
        title="What is your EIN, and do you have a business website?"
        why="EIN is required for SBA and most institutional lenders — it separates business from personal tax identity. A verifiable web presence is one of the first things lenders check for legitimacy."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* EIN Status */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Do you have an EIN (Employer Identification Number)?
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { value: true, label: 'Yes, I have an EIN' },
            { value: false, label: 'No EIN yet' },
          ].map((opt) => (
            <motion.div
              key={String(opt.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ hasEIN: opt.value, einNumber: opt.value ? data.einNumber : undefined })}
              style={{
                flex: 1,
                background: data.hasEIN === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.hasEIN === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {opt.label}
            </motion.div>
          ))}
        </div>

        {data.hasEIN && (
          <input
            type="text"
            value={data.einNumber || ''}
            onChange={(e) => updateData({ einNumber: e.target.value })}
            placeholder="XX-XXXXXXX (optional)"
            style={{
              width: '100%',
              marginTop: '12px',
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              padding: '14px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          />
        )}
      </div>

      {/* Website */}
      <div style={{ marginBottom: '8px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Do you have a business website?
        </label>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map((opt) => (
            <motion.div
              key={String(opt.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ hasWebsite: opt.value, websiteUrl: opt.value ? data.websiteUrl : undefined })}
              style={{
                flex: 1,
                background: data.hasWebsite === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.hasWebsite === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {opt.label}
            </motion.div>
          ))}
        </div>

        {data.hasWebsite && (
          <input
            type="url"
            value={data.websiteUrl || ''}
            onChange={(e) => updateData({ websiteUrl: e.target.value })}
            placeholder="https://your-business.com"
            style={{
              width: '100%',
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              padding: '14px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          />
        )}
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={false} step={3} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F5: Monthly Revenue + CC Sales (SLIDERS)
// ════════════════════════════════════════════════════════════════════════════════

function QuestionF5({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <>
      <QuestionHeader
        number={5}
        title="What is your average monthly revenue, and do you accept credit cards?"
        why="Monthly revenue sets your maximum borrowing power. Credit card sales are the primary qualification factor for Merchant Cash Advance — the fastest-funding product in the market."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Monthly Revenue - BUTTON SELECT */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Average Gross Monthly Revenue
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'under_5k', label: 'Under $5,000' },
            { value: '5k_15k', label: '$5,000 - $15,000' },
            { value: '15k_40k', label: '$15,000 - $40,000' },
            { value: '40k_100k', label: '$40,000 - $100,000' },
            { value: 'over_100k', label: 'Over $100,000' },
          ].map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ monthlyRevenue: option.value as any })}
              style={{
                background: '#131510',
                border: data.monthlyRevenue === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                color: data.monthlyRevenue === option.value ? '#8ab820' : '#e4e8d8',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e: any) => {
                if (data.monthlyRevenue !== option.value) {
                  e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (data.monthlyRevenue !== option.value) {
                  e.currentTarget.style.borderColor = '#6b7258';
                }
              }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* CC Sales - BUTTON SELECT */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Total Monthly Credit Card Sales
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'no_cards', label: 'I do not accept credit cards' },
            { value: 'under_5k', label: 'Under $5,000' },
            { value: '5k_15k', label: '$5,000 - $15,000' },
            { value: '15k_50k', label: '$15,000 - $50,000' },
            { value: 'over_50k', label: 'Over $50,000' },
          ].map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ ccSales: option.value as any })}
              style={{
                background: '#131510',
                border: data.ccSales === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                color: data.ccSales === option.value ? '#8ab820' : '#e4e8d8',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e: any) => {
                if (data.ccSales !== option.value) {
                  e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (data.ccSales !== option.value) {
                  e.currentTarget.style.borderColor = '#6b7258';
                }
              }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={false} step={4} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F6: Banking (3 sub-fields)
// ════════════════════════════════════════════════════════════════════════════════

function QuestionF6({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const accountTypes = [
    { value: 'dedicated', label: 'Dedicated Business Account', sub: 'Strongest signal' },
    { value: 'personal', label: 'Personal Account for Business', sub: 'Acceptable but weaker' },
    { value: 'none', label: 'No Bank Account', sub: 'Hard stop for most lenders' },
  ];

  const accountAges = [
    { value: '0_6mo', label: '0–6 months' },
    { value: '6_12mo', label: '6–12 months' },
    { value: '12_24mo', label: '12–24 months' },
    { value: '24plus', label: '24+ months' },
  ];

  const balances = [
    { value: 'near_zero', label: 'Near zero' },
    { value: '500_2k', label: '$500–$2K' },
    { value: '2k_10k', label: '$2K–$10K' },
    { value: '10k_25k', label: '$10K–$25K' },
    { value: '25k_plus', label: '$25K+' },
  ];

  const isValid = data.bankAccount && (data.bankAccount === 'none' || (data.bankAge && data.avgDailyBalance));

  return (
    <>
      <QuestionHeader
        number={6}
        title="Tell us about your business banking situation."
        why="Lenders read 12 months of bank statements like a report card. Your account type, age, and average balance are verified against stated income. NSFs are flagged automatically."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Account Type */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Bank Account Type
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accountTypes.map((type) => (
            <motion.div
              key={type.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => updateData({ bankAccount: type.value as any })}
              style={{
                background: data.bankAccount === type.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.bankAccount === type.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px 20px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                }}
              >
                {type.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                }}
              >
                {type.sub}
              </div>
              {data.bankAccount === type.value && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '20px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bg-base)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Account Age - ONLY SHOW if Bank Account is NOT 'none' */}
      {data.bankAccount !== 'none' && (
        <div style={{ marginBottom: '32px' }}>
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}
          >
            Account Age
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {accountAges.map((age) => (
              <motion.div
                key={age.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => updateData({ bankAge: age.value as any })}
                style={{
                  background: data.bankAge === age.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                  border: data.bankAge === age.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {age.label}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Average Daily Balance - ONLY SHOW if Bank Account is NOT 'none' */}
      {data.bankAccount !== 'none' && (
        <div style={{ marginBottom: '8px' }}>
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}
          >
            Average Daily Balance
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {balances.map((bal) => (
              <motion.div
                key={bal.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => updateData({ avgDailyBalance: bal.value as any })}
                style={{
                  background: data.avgDailyBalance === bal.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                  border: data.avgDailyBalance === bal.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {bal.label}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!isValid} step={5} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F7: NSFs + Assets (SLIDERS FOR MONEY FIELDS!)
// ════════════════════════════════════════════════════════════════════════════════

function QuestionF7({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const nsfOptions = [
    { value: 'zero', label: 'Zero', sub: 'Strongest signal' },
    { value: '1_2', label: '1–2', sub: 'Acceptable' },
    { value: '3_5', label: '3–5', sub: 'Concerning' },
    { value: 'over_5', label: '5+', sub: 'Red flag' },
  ];

  const propertyOptions = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'planning', label: 'Planning to acquire' },
  ];

  const formatCurrency = (val: number) => val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${val.toLocaleString()}`;

  return (
    <>
      <QuestionHeader
        number={7}
        title="Any overdrafts or NSFs in the last 12 months? And what other business assets do you have?"
        why="NSF events are flagged in lender reviews — even 2–3 per year changes your story. Outstanding invoices, equipment, and purchase orders each unlock different funding products."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* NSF Count */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Overdrafts/NSFs in Last 12 Months
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {nsfOptions.map((opt) => (
            <motion.div
              key={opt.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ nsfCount: opt.value as any })}
              style={{
                background: data.nsfCount === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.nsfCount === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                }}
              >
                {opt.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                }}
              >
                {opt.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Assets - SLIDERS */}
      <div
        style={{
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '16px',
          }}
        >
          Business Assets (Optional)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Accounts Receivable - BUTTON SELECT */}
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '12px',
              }}
            >
              Amount Owed to You by Other Businesses
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { value: 'none', label: 'None / Not applicable' },
                { value: 'under_10k', label: 'Under $10,000' },
                { value: '10k_50k', label: '$10,000 - $50,000' },
                { value: '50k_250k', label: '$50,000 - $250,000' },
                { value: 'over_250k', label: 'Over $250,000' },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateData({ arBalance: option.value as any })}
                  style={{
                    background: '#131510',
                    border: data.arBalance === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                    color: data.arBalance === option.value ? '#8ab820' : '#e4e8d8',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e: any) => {
                    if (data.arBalance !== option.value) {
                      e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (data.arBalance !== option.value) {
                      e.currentTarget.style.borderColor = '#6b7258';
                    }
                  }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Equipment Value - BUTTON SELECT */}
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '12px',
              }}
            >
              Total Value of Equipment Owned Outright
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { value: 'none', label: 'None / No equipment' },
                { value: 'under_10k', label: 'Under $10,000' },
                { value: '10k_50k', label: '$10,000 - $50,000' },
                { value: '50k_250k', label: '$50,000 - $250,000' },
                { value: 'over_250k', label: 'Over $250,000' },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateData({ equipmentValue: option.value as any })}
                  style={{
                    background: '#131510',
                    border: data.equipmentValue === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                    color: data.equipmentValue === option.value ? '#8ab820' : '#e4e8d8',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e: any) => {
                    if (data.equipmentValue !== option.value) {
                      e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (data.equipmentValue !== option.value) {
                      e.currentTarget.style.borderColor = '#6b7258';
                    }
                  }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Purchase Orders - BUTTON SELECT */}
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '12px',
              }}
            >
              Current Amount of Purchase Orders
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { value: 'none', label: 'None / No open POs' },
                { value: 'under_10k', label: 'Under $10,000' },
                { value: '10k_50k', label: '$10,000 - $50,000' },
                { value: '50k_250k', label: '$50,000 - $250,000' },
                { value: 'over_250k', label: 'Over $250,000' },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateData({ poBalance: option.value as any })}
                  style={{
                    background: '#131510',
                    border: data.poBalance === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                    color: data.poBalance === option.value ? '#8ab820' : '#e4e8d8',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e: any) => {
                    if (data.poBalance !== option.value) {
                      e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (data.poBalance !== option.value) {
                      e.currentTarget.style.borderColor = '#6b7258';
                    }
                  }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
            <div
              style={{
                marginTop: '12px',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              Actual open business purchase orders, not contracts
            </div>
          </div>

          {/* Property */}
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Own Investment Property?
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {propertyOptions.map((opt) => (
                <motion.div
                  key={opt.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateData({ ownsProperty: opt.value as any })}
                  style={{
                    flex: 1,
                    background: data.ownsProperty === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-1)',
                    border: data.ownsProperty === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  {opt.label}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!data.nsfCount} step={6} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F8: Personal Credit (3 Bureaus)
// ════════════════════════════════════════════════════════════════════════════════

function QuestionF8({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const scores = [
    data.experian || 680,
    data.transunion || 680,
    data.equifax || 680,
  ].sort((a, b) => a - b);
  const composite = scores[1]; // Middle score

  return (
    <>
      <QuestionHeader
        number={8}
        title="How would you describe your personal credit profile across the three bureaus?"
        why="Personal credit is the first signal every lender evaluates — before anything else about the business. The middle score is what most lenders use to make initial decisions."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Experian - BUTTON SELECT */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Experian
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'exceptional', label: 'Exceptional (800-850)' },
            { value: 'very_good', label: 'Very Good (740-799)' },
            { value: 'good', label: 'Good (670-739)' },
            { value: 'fair', label: 'Fair (580-669)' },
            { value: 'poor', label: 'Poor (300-579)' },
            { value: 'unknown', label: 'I don\'t know my score' },
          ].map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ experian: option.value as any })}
              style={{
                background: '#131510',
                border: data.experian === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                color: data.experian === option.value ? '#8ab820' : '#e4e8d8',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e: any) => {
                if (data.experian !== option.value) {
                  e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (data.experian !== option.value) {
                  e.currentTarget.style.borderColor = '#6b7258';
                }
              }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* TransUnion - BUTTON SELECT */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          TransUnion
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'exceptional', label: 'Exceptional (800-850)' },
            { value: 'very_good', label: 'Very Good (740-799)' },
            { value: 'good', label: 'Good (670-739)' },
            { value: 'fair', label: 'Fair (580-669)' },
            { value: 'poor', label: 'Poor (300-579)' },
            { value: 'unknown', label: 'I don\'t know my score' },
          ].map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ transunion: option.value as any })}
              style={{
                background: '#131510',
                border: data.transunion === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                color: data.transunion === option.value ? '#8ab820' : '#e4e8d8',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e: any) => {
                if (data.transunion !== option.value) {
                  e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (data.transunion !== option.value) {
                  e.currentTarget.style.borderColor = '#6b7258';
                }
              }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Equifax - BUTTON SELECT */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Equifax
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'exceptional', label: 'Exceptional (800-850)' },
            { value: 'very_good', label: 'Very Good (740-799)' },
            { value: 'good', label: 'Good (670-739)' },
            { value: 'fair', label: 'Fair (580-669)' },
            { value: 'poor', label: 'Poor (300-579)' },
            { value: 'unknown', label: 'I don\'t know my score' },
          ].map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ equifax: option.value as any })}
              style={{
                background: '#131510',
                border: data.equifax === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                color: data.equifax === option.value ? '#8ab820' : '#e4e8d8',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e: any) => {
                if (data.equifax !== option.value) {
                  e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (data.equifax !== option.value) {
                  e.currentTarget.style.borderColor = '#6b7258';
                }
              }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Composite Score */}
      <div
        style={{
          background: 'var(--primary-alpha)',
          border: '2px solid var(--primary)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: '8px',
          }}
        >
          Composite Score (Middle)
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '48px',
            fontWeight: 800,
            color: 'var(--primary)',
          }}
        >
          {composite}
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={false} step={7} />
    </>
  );
}

// Q_F9, Q_F10, Q_F11 remain unchanged from previous implementation
// (Utilization + Income, Bankruptcy + Derogatories, Business Credit + Inquiries)

function QuestionF9({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const incomeRanges = [
    { value: 'under_35k', label: 'Under $35K' },
    { value: '35_75k', label: '$35K–$75K' },
    { value: '75_125k', label: '$75K–$125K' },
    { value: '125_250k', label: '$125K–$250K' },
    { value: 'over_250k', label: 'Over $250K' },
  ];

  return (
    <>
      <QuestionHeader
        number={9}
        title="How much of your available credit are you using, and what is your annual personal income?"
        why="Utilization is the second most impactful FICO factor — above 30% is a pattern that actively suppresses scores. Personal income is evaluated for credit card stacking strategies ($75K minimum) — a fast capital path for qualified owners."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Utilization */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Credit Utilization
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'under_10', label: 'Under 10%' },
            { value: '10_30', label: '10% - 30%' },
            { value: '30_50', label: '30% - 50%' },
            { value: '50_75', label: '50% - 75%' },
            { value: 'over_75', label: 'Over 75%' },
          ].map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ utilization: option.value as any })}
              style={{
                background: '#131510',
                border: data.utilization === option.value ? '2px solid #8ab820' : '1px solid #6b7258',
                color: data.utilization === option.value ? '#8ab820' : '#e4e8d8',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e: any) => {
                if (data.utilization !== option.value) {
                  e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (data.utilization !== option.value) {
                  e.currentTarget.style.borderColor = '#6b7258';
                }
              }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
        {data.utilization && (data.utilization === '50_75' || data.utilization === 'over_75') && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'rgba(200, 144, 32, 0.1)',
              border: '1px solid #c89020',
              borderRadius: '8px',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: '#c89020',
            }}
          >
            Above 30% actively hurts your FICO score
          </div>
        )}
      </div>

      {/* Income */}
      <div style={{ marginBottom: '8px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Annual Personal Income
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {incomeRanges.map((range) => (
            <motion.div
              key={range.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ personalIncome: range.value as any })}
              style={{
                background: data.personalIncome === range.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.personalIncome === range.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {range.label}
            </motion.div>
          ))}
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!data.personalIncome} step={8} />
    </>
  );
}

function QuestionF_DSCR({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const noiOptions = [
    { value: 'under_25k',   label: 'Under $25K',      sub: 'Low operating profit margin' },
    { value: '25k_75k',     label: '$25K – $75K',     sub: 'Early-stage profitable operations' },
    { value: '75k_200k',    label: '$75K – $200K',    sub: 'Growing business, healthy margin' },
    { value: '200k_500k',   label: '$200K – $500K',   sub: 'Established profitable operations' },
    { value: 'over_500k',   label: 'Over $500K',      sub: 'High-revenue, efficient operations' },
  ];

  const debtOptions = [
    { value: 'under_10k',  label: 'Under $10K',      sub: 'Minimal debt obligations' },
    { value: '10k_30k',    label: '$10K – $30K',     sub: 'Light debt load' },
    { value: '30k_75k',    label: '$30K – $75K',     sub: 'Moderate debt payments' },
    { value: '75k_200k',   label: '$75K – $200K',    sub: 'Significant debt service' },
    { value: 'over_200k',  label: 'Over $200K',      sub: 'Heavy debt obligations' },
  ];

  const isValid = data.annualNOI && data.annualDebtService;

  return (
    <>
      <QuestionHeader
        number={10}
        title="What is your annual net operating income, and what are your total annual debt payments?"
        why="DSCR — Debt Service Coverage Ratio — is the most critical factor in commercial loan underwriting. Lenders require DSCR ≥ 1.25x: your business must generate $1.25 for every $1.00 in debt payments. This single metric is the most common reason commercial applications are declined. NOI = revenue minus operating expenses (before loan payments)."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Annual NOI */}
      <div style={{ marginBottom: '28px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '12px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          Annual Net Operating Income (NOI)
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {noiOptions.map((opt) => (
            <motion.button
              key={opt.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ annualNOI: opt.value as any })}
              style={{
                background: '#131510',
                border: data.annualNOI === opt.value ? '2px solid #8ab820' : '1px solid #6b7258',
                color: data.annualNOI === opt.value ? '#8ab820' : '#e4e8d8',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left' as const,
                width: '100%',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e: any) => {
                if (data.annualNOI !== opt.value) {
                  e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (data.annualNOI !== opt.value) {
                  e.currentTarget.style.borderColor = '#6b7258';
                }
              }}
            >
              <span>{opt.label}</span>
              <span style={{ fontSize: '11px', opacity: 0.7, fontWeight: 400 }}>{opt.sub}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Annual Debt Service */}
      <div style={{ marginBottom: '8px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '12px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          Total Annual Debt Service (all loan payments — principal + interest)
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {debtOptions.map((opt) => (
            <motion.button
              key={opt.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ annualDebtService: opt.value as any })}
              style={{
                background: '#131510',
                border: data.annualDebtService === opt.value ? '2px solid #8ab820' : '1px solid #6b7258',
                color: data.annualDebtService === opt.value ? '#8ab820' : '#e4e8d8',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left' as const,
                width: '100%',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e: any) => {
                if (data.annualDebtService !== opt.value) {
                  e.currentTarget.style.borderColor = 'rgba(138, 184, 32, 0.6)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (data.annualDebtService !== opt.value) {
                  e.currentTarget.style.borderColor = '#6b7258';
                }
              }}
            >
              <span>{opt.label}</span>
              <span style={{ fontSize: '11px', opacity: 0.7, fontWeight: 400 }}>{opt.sub}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!isValid} step={step} />
    </>
  );
}

function QuestionF10({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const bankruptcyAges = [
    { value: 'under_2yr', label: 'Under 2 years ago' },
    { value: '2_7yr', label: '2–7 years ago' },
    { value: 'over_7yr', label: 'Over 7 years ago' },
  ];

  const derogItems = [
    { key: 'hasCollections', label: 'Collections' },
    { key: 'hasChargeoffs', label: 'Charge-offs' },
    { key: 'hasLatePay', label: 'Late Payments (60+ days)' },
    { key: 'hasTaxLiens', label: 'Tax Liens' },
    { key: 'noDerogItems', label: 'No derogatory items (clean)' },
  ];

  const handleDerogToggle = (key: string) => {
    if (key === 'noDerogItems') {
      updateData({
        hasCollections: false,
        hasChargeoffs: false,
        hasLatePay: false,
        hasTaxLiens: false,
        noDerogItems: true,
      });
    } else {
      updateData({
        [key]: !data[key],
        noDerogItems: false,
      });
    }
  };

  return (
    <>
      <QuestionHeader
        number={10}
        title="Are there any major derogatory items on your personal credit report?"
        why="Lenders review the full credit report. Bankruptcy timing, collections, charge-offs — each has specific recovery windows that open or close product access. Understanding these patterns helps map the clearest path forward."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Bankruptcy */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Bankruptcy History
        </label>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map((opt) => (
            <motion.div
              key={String(opt.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ hasBankruptcy: opt.value, bankruptcyAge: opt.value ? data.bankruptcyAge : undefined })}
              style={{
                flex: 1,
                background: data.hasBankruptcy === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.hasBankruptcy === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {opt.label}
            </motion.div>
          ))}
        </div>

        {data.hasBankruptcy && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bankruptcyAges.map((age) => (
              <motion.div
                key={age.value}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => updateData({ bankruptcyAge: age.value as any })}
                style={{
                  background: data.bankruptcyAge === age.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                  border: data.bankruptcyAge === age.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {age.label}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Judgments/Liens */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Judgments or Liens?
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map((opt) => (
            <motion.div
              key={String(opt.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ hasJudgments: opt.value })}
              style={{
                flex: 1,
                background: data.hasJudgments === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.hasJudgments === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {opt.label}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Other Derogatories */}
      <div style={{ marginBottom: '8px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Other Derogatory Items (select all that apply)
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {derogItems.map((item) => (
            <motion.div
              key={item.key}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleDerogToggle(item.key)}
              style={{
                background: data[item.key] ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data[item.key] ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px 16px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                position: 'relative',
              }}
            >
              {item.label}
              {data[item.key] && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '16px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bg-base)',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={false} step={9} />
    </>
  );
}

function QuestionF11({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const bizCreditOptions = [
    { value: 'paydex_80plus', label: 'Yes — Paydex 80+ or Intelliscore 76+', sub: 'Strong business credit' },
    { value: 'below_80', label: 'Yes — but score is below those thresholds', sub: 'Building business credit' },
    { value: 'building', label: "I've started building it", sub: 'Early stage' },
    { value: 'none', label: 'No business credit file', sub: 'Very common' },
  ];

  const inquiryOptions = [
    { value: '0', label: '0' },
    { value: '1_2', label: '1–2' },
    { value: '3_4', label: '3–4' },
    { value: '5plus', label: '5+' },
    { value: 'unknown', label: "Don't know" },
  ];

  return (
    <>
      <QuestionHeader
        number={11}
        title="Do you have a business credit file? And how many hard inquiries in the last 30 days?"
        why="Business credit (D&B Paydex, Experian Intelliscore) is completely separate from your personal score. Most small business owners have no file — and don't know it's costing them. Inquiry count signals credit-seeking behavior that lenders flag."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Business Credit File */}
      <div style={{ marginBottom: '32px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Business Credit File Status
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bizCreditOptions.map((opt) => (
            <motion.div
              key={opt.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => updateData({ bizCreditFile: opt.value as any })}
              style={{
                background: data.bizCreditFile === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.bizCreditFile === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px 20px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                }}
              >
                {opt.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                }}
              >
                {opt.sub}
              </div>
              {data.bizCreditFile === opt.value && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '20px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bg-base)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Inquiries */}
      <div style={{ marginBottom: '8px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Hard Inquiries in Last 30 Days
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {inquiryOptions.map((opt) => (
            <motion.div
              key={opt.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ inquiries30d: opt.value as any })}
              style={{
                background: data.inquiries30d === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.inquiries30d === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {opt.label}
            </motion.div>
          ))}
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!data.bizCreditFile || !data.inquiries30d} step={10} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F11 (Capital Request): How much do you need + what for?
// ════════════════════════════════════════════════════════════════════════════════

const LOAN_AMOUNTS = [
  { value: 'under_25k',   label: 'Under $25K',      sub: 'Starter & working capital' },
  { value: '25k_100k',    label: '$25K – $100K',     sub: 'Growth & equipment' },
  { value: '100k_250k',   label: '$100K – $250K',    sub: 'Expansion capital' },
  { value: '250k_500k',   label: '$250K – $500K',    sub: 'Scale operations' },
  { value: '500k_1m',     label: '$500K – $1M',      sub: 'Major growth round' },
  { value: 'over_1m',     label: '$1M+',             sub: 'Enterprise / real estate' },
];

const LOAN_PURPOSES = [
  { value: 'working_capital', label: 'Working Capital',    icon: '💵', sub: 'Day-to-day operations, cash flow' },
  { value: 'equipment',       label: 'Equipment Purchase', icon: '🔧', sub: 'Machinery, vehicles, tech' },
  { value: 'real_estate',     label: 'Real Estate',        icon: '🏢', sub: 'Buy, build, or renovate' },
  { value: 'expansion',       label: 'Business Expansion', icon: '📈', sub: 'New location, market entry' },
  { value: 'payroll',         label: 'Payroll & Staff',    icon: '👥', sub: 'Hire, retain, scale team' },
  { value: 'acquisition',     label: 'Buy a Business',     icon: '🤝', sub: 'Acquire existing business' },
  { value: 'other',           label: 'Other',              icon: '✦',  sub: 'Debt consolidation, other' },
];

function QuestionF11_Capital({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const isValid = data.loanAmount && data.loanPurpose;

  return (
    <>
      <QuestionHeader
        number={11}
        title="How much capital are you looking for, and what's it for?"
        why="The amount you need and its purpose determine which funding products fit your situation. A $25K working capital need has completely different solutions than a $500K real estate play. We use this to build your personalized roadmap."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      {/* Loan Amount */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
          Capital Amount Needed
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {LOAN_AMOUNTS.map((opt) => (
            <motion.div
              key={opt.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateData({ loanAmount: opt.value as any })}
              style={{
                background: data.loanAmount === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.loanAmount === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '14px 16px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{opt.label}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>{opt.sub}</div>
              {data.loanAmount === opt.value && (
                <div style={{ position: 'absolute', top: '10px', right: '12px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-base)', fontSize: '11px', fontWeight: 700 }}>✓</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Loan Purpose */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Primary Use of Funds
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {LOAN_PURPOSES.map((opt) => (
            <motion.div
              key={opt.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => updateData({ loanPurpose: opt.value as any })}
              style={{
                background: data.loanPurpose === opt.value ? 'var(--primary-alpha)' : 'var(--bg-surface-2)',
                border: data.loanPurpose === opt.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '22px', flexShrink: 0 }}>{opt.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{opt.label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>{opt.sub}</div>
              </div>
              {data.loanPurpose === opt.value && (
                <div style={{ position: 'absolute', top: '10px', right: '12px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-base)', fontSize: '11px', fontWeight: 700 }}>✓</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={!isValid} step={step} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Q_F12 (Eligibility Check): Restricted / ineligible business types
// ════════════════════════════════════════════════════════════════════════════════

const INELIGIBLE_TYPES = [
  { value: 'cannabis',     label: 'Cannabis / Marijuana',           impact: 'Blocked from all SBA + bank products' },
  { value: 'gambling',     label: 'Gambling / Casino',              impact: 'SBA ineligible; very limited bank options' },
  { value: 'lending',      label: 'Money Lending / Finance Co.',    impact: 'SBA ineligible by law' },
  { value: 'nonprofit',    label: 'Non-Profit Organization',        impact: 'SBA and most commercial products not available' },
  { value: 'adult',        label: 'Adult Entertainment',            impact: 'Blocked from most mainstream lenders' },
  { value: 'life_ins',     label: 'Life Insurance Sales',           impact: 'SBA ineligible' },
  { value: 'firearms',     label: 'Firearms Dealer',                impact: 'Restricted lender pool' },
  { value: 'pyramid',      label: 'MLM / Pyramid Scheme',           impact: 'SBA ineligible; major lender flags' },
  { value: 'crypto_spec',  label: 'Crypto / Speculative Investment', impact: 'SBA ineligible; most banks decline' },
  { value: 'political',    label: 'Political / Lobbying Org.',      impact: 'SBA ineligible' },
  { value: 'foreign',      label: 'Foreign-Owned (non-US)',         impact: 'SBA ineligible; limited bank access' },
];

function QuestionF12_Eligibility({ data, updateData, onNext, onBack, currentQuestionNumber, totalQuestions, step }: any) {
  const selected: string[] = data.ineligibleBizTypes || [];

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    updateData({ ineligibleBizTypes: next, isIneligibleBizType: next.length > 0 });
  };

  const noneApply = selected.length === 0;

  return (
    <>
      <QuestionHeader
        number={12}
        title="Does your business operate in any restricted categories?"
        why="Federal law and lender policies block certain business types from SBA loans, bank financing, and most commercial products. Knowing this upfront lets us route you to the funding options that actually apply to your business — and saves you weeks of wasted applications."
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
      />

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select all that apply to your business (leave blank if none apply)
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {INELIGIBLE_TYPES.map((type) => {
            const isChecked = selected.includes(type.value);
            return (
              <motion.div
                key={type.value}
                whileHover={{ x: 3 }}
                onClick={() => toggle(type.value)}
                style={{
                  background: isChecked ? 'rgba(239,68,68,0.06)' : 'var(--bg-surface-2)',
                  border: isChecked ? '2px solid rgba(239,68,68,0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                  background: isChecked ? '#ef4444' : 'var(--bg-base)',
                  border: isChecked ? '2px solid #ef4444' : '2px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '12px', fontWeight: 700,
                }}>
                  {isChecked ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{type.label}</div>
                  {isChecked && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>{type.impact}</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Ineligible warning */}
      {selected.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
            Restricted category detected — your options are narrowed
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#7f1d1d', lineHeight: 1.6 }}>
            We'll remove ineligible products from your roadmap and focus you on funding paths that work for your business type. You can still access alternative capital, equipment financing, and select commercial lenders.
          </div>
        </div>
      )}

      {/* None apply — positive confirmation */}
      {noneApply && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>✓</span>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#065f46' }}>
            No restricted categories selected — you have access to the full funding landscape including SBA and bank products.
          </div>
        </div>
      )}

      <NavigationButtons onNext={onNext} onBack={onBack} disabled={false} step={step} />
    </>
  );
}
