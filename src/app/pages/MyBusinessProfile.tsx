import { useNavigate } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  X,
  User,
  Briefcase,
  FileText,
  CreditCard,
  Hash,
  Award,
  Target,
  Clock,
  Camera,
  Upload,
  Linkedin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Share2
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ThemeButton } from '../components/ThemeButton';
import { getFicoBankableStatus } from '../utils/businessData';
import { useBusinessProfile } from '../hooks/useBusinessProfile';

export function MyBusinessProfile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const {
    profile,
    loading,
    saving,
    lastSavedAt,
    error,
    updateProfile,
  } = useBusinessProfile();
  const [businessData, setBusinessData] = useState(profile);
  const ficoStatus = getFicoBankableStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable form state
  const [formData, setFormData] = useState(businessData);

  useEffect(() => {
    setBusinessData(profile);
    if (!isEditing) setFormData(profile);
  }, [isEditing, profile]);

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(businessData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(businessData);
  };

  const handleSave = async () => {
    try {
      const saved = await updateProfile(formData, 'manual');
      setBusinessData(saved);
      setFormData(saved);
      setIsEditing(false);
      toast.success('Business profile saved', {
        description: 'Your changes are now available across Bankable OS.',
      });
    } catch (saveError) {
      toast.error('We could not save your changes', {
        description: saveError instanceof Error ? saveError.message : 'Please try again.',
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  // Photo upload handler
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('File must be an image');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleInputChange('profilePhoto', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = () => {
    handleInputChange('profilePhoto', undefined);
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    const fields = [
      businessData.businessLegalName,
      businessData.contactFirstName,
      businessData.contactLastName,
      businessData.contactEmail,
      businessData.contactPhone,
      businessData.businessAddress,
      businessData.city,
      businessData.state,
      businessData.zipCode,
      businessData.businessType,
      businessData.industry,
      businessData.timeInBusiness,
      businessData.annualRevenue,
      businessData.hasEIN ? businessData.einNumber : null,
      businessData.hasBankAccount,
      businessData.hasBusinessAddress,
      businessData.hasBusinessPhone ? businessData.businessPhoneNumber : null,
      businessData.hasWebsite ? businessData.websiteUrl : null,
    ];
    
    const filledFields = fields.filter(f => f && f !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();
  const bureauScores = [
    businessData.equifaxScore,
    businessData.transunionScore,
    businessData.experianScore,
  ].filter((score): score is number => typeof score === 'number' && score > 0);
  const averageBureauScore = bureauScores.length
    ? Math.round(bureauScores.reduce((total, score) => total + score, 0) / bureauScores.length)
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Loading your business record…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50 overflow-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                My Business Profile
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Complete overview of your business information and verification status
              </p>
              {lastSavedAt && (
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Saved {new Date(lastSavedAt).toLocaleString()}
                </p>
              )}
              {error && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Sync issue: {error.message}
                </p>
              )}
            </div>
            
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={handleEdit}
                className="w-full sm:w-auto min-h-[44px]"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <ThemeButton
                  theme="green"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </ThemeButton>
              </div>
            )}
          </div>

          {/* Profile Completion Bar */}
          <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white border-0 shadow-lg">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold mb-2">Profile Completion</h2>
                  <div className="text-3xl sm:text-4xl font-bold">{completionPercentage}%</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5" />
                    <span className="font-bold text-sm sm:text-base">FICO SBSS Score</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold">{ficoStatus.currentScore}/160</div>
                  <p className="text-xs sm:text-sm opacity-90 mt-1">
                    {ficoStatus.pointsNeeded} points to bankable
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-white/30 rounded-full h-3 sm:h-4 overflow-hidden">
                <div 
                  className="bg-white h-full transition-all duration-500 rounded-full shadow-lg"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              
              {completionPercentage < 100 && (
                <p className="text-xs sm:text-sm mt-3 opacity-90">
                  📝 Complete your profile to unlock all features and maximize your funding potential!
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Business Identity */}
          <Card className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 rounded-lg">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Business Identity</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Core business information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    Legal Business Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.businessLegalName}
                      onChange={(e) => handleInputChange('businessLegalName', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {businessData.businessLegalName || '—'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      Business Type
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.businessType}
                        onChange={(e) => handleInputChange('businessType', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                      >
                        <option value="">Select...</option>
                        <option value="LLC">LLC</option>
                        <option value="Corporation">Corporation</option>
                        <option value="S-Corp">S-Corp</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Sole Proprietor">Sole Proprietor</option>
                      </select>
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 font-medium">
                        {businessData.businessType || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      Industry
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 font-medium">
                        {businessData.industry || '—'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Time in Business
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.timeInBusiness}
                      onChange={(e) => handleInputChange('timeInBusiness', e.target.value)}
                      placeholder="e.g., 2 years, 6 months"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {businessData.timeInBusiness || '—'}
                    </p>
                  )}
                </div>

                {businessData.naicsCode && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      <Hash className="w-3 h-3 inline mr-1" />
                      NAICS Code
                    </label>
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {businessData.naicsCode}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Business Website
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.websiteUrl || ''}
                      onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                      placeholder="https://www.yourbusiness.com"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                    />
                  ) : businessData.websiteUrl ? (
                    <a
                      href={businessData.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm sm:text-base text-blue-600 hover:underline truncate block"
                    >
                      {businessData.websiteUrl}
                    </a>
                  ) : (
                    <p className="text-sm sm:text-base text-gray-500">—</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="border-2 border-gray-200 hover:border-cyan-300 transition-colors">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-lg">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Contact Information</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Primary business contact</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.contactFirstName}
                        onChange={(e) => handleInputChange('contactFirstName', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 font-medium">
                        {businessData.contactFirstName || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.contactLastName}
                        onChange={(e) => handleInputChange('contactLastName', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 font-medium">
                        {businessData.contactLastName || '—'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium break-all">
                      {businessData.contactEmail || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {businessData.contactPhone || '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Business Location */}
          <Card className="border-2 border-gray-200 hover:border-green-300 transition-colors">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3 rounded-lg">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Business Location</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Physical address details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    Street Address
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.businessAddress}
                      onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {businessData.businessAddress || '—'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      City
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 font-medium">
                        {businessData.city || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      State
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        maxLength={2}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base uppercase"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 font-medium">
                        {businessData.state || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                      ZIP Code
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                      />
                    ) : (
                      <p className="text-sm sm:text-base text-gray-900 font-medium">
                        {businessData.zipCode || '—'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Financial Information */}
          <Card className="border-2 border-gray-200 hover:border-purple-300 transition-colors">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Financial Information</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Revenue and finances</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Annual Revenue
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.annualRevenue}
                      onChange={(e) => handleInputChange('annualRevenue', e.target.value)}
                      placeholder="e.g., $100,000 - $500,000"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {businessData.annualRevenue || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    Monthly Revenue
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.monthlyRevenue}
                      onChange={(e) => handleInputChange('monthlyRevenue', e.target.value)}
                      placeholder="e.g., $8,000 - $40,000"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {businessData.monthlyRevenue || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Personal Credit Scores
                  </label>
                  
                  <div className="space-y-3">
                    {/* Equifax */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Equifax</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={formData.equifaxScore || ''}
                            onChange={(e) => handleInputChange('equifaxScore', parseInt(e.target.value) || undefined)}
                            placeholder="300-850"
                            min="300"
                            max="850"
                            className="w-24 px-2 py-1 border-2 border-blue-300 rounded focus:border-blue-500 focus:outline-none text-sm text-center"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-blue-900">
                              {businessData.equifaxScore || '—'}
                            </span>
                            {businessData.equifaxScore && businessData.equifaxScore > 0 && (
                              <Badge 
                                className={
                                  businessData.equifaxScore >= 700 
                                    ? 'bg-green-100 text-green-800 border-green-300' 
                                    : businessData.equifaxScore >= 650
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                    : 'bg-red-100 text-red-800 border-red-300'
                                }
                              >
                                {businessData.equifaxScore >= 700 
                                  ? 'Excellent' 
                                  : businessData.equifaxScore >= 650
                                  ? 'Good'
                                  : 'Fair'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* TransUnion */}
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">TransUnion</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={formData.transunionScore || ''}
                            onChange={(e) => handleInputChange('transunionScore', parseInt(e.target.value) || undefined)}
                            placeholder="300-850"
                            min="300"
                            max="850"
                            className="w-24 px-2 py-1 border-2 border-purple-300 rounded focus:border-purple-500 focus:outline-none text-sm text-center"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-purple-900">
                              {businessData.transunionScore || '—'}
                            </span>
                            {businessData.transunionScore && businessData.transunionScore > 0 && (
                              <Badge 
                                className={
                                  businessData.transunionScore >= 700 
                                    ? 'bg-green-100 text-green-800 border-green-300' 
                                    : businessData.transunionScore >= 650
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                    : 'bg-red-100 text-red-800 border-red-300'
                                }
                              >
                                {businessData.transunionScore >= 700 
                                  ? 'Excellent' 
                                  : businessData.transunionScore >= 650
                                  ? 'Good'
                                  : 'Fair'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Experian */}
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Experian</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={formData.experianScore || ''}
                            onChange={(e) => handleInputChange('experianScore', parseInt(e.target.value) || undefined)}
                            placeholder="300-850"
                            min="300"
                            max="850"
                            className="w-24 px-2 py-1 border-2 border-emerald-300 rounded focus:border-emerald-500 focus:outline-none text-sm text-center"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-emerald-900">
                              {businessData.experianScore || '—'}
                            </span>
                            {businessData.experianScore && businessData.experianScore > 0 && (
                              <Badge 
                                className={
                                  businessData.experianScore >= 700 
                                    ? 'bg-green-100 text-green-800 border-green-300' 
                                    : businessData.experianScore >= 650
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                    : 'bg-red-100 text-red-800 border-red-300'
                                }
                              >
                                {businessData.experianScore >= 700 
                                  ? 'Excellent' 
                                  : businessData.experianScore >= 650
                                  ? 'Good'
                                  : 'Fair'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Average Score Display */}
                  {!isEditing && (businessData.equifaxScore || businessData.transunionScore || businessData.experianScore) && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Average Score</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {averageBureauScore}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Profile Photo */}
          <Card className="border-2 border-gray-200 hover:border-indigo-300 transition-colors">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-lg">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Business Photo</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Logo or profile image</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Photo Display/Upload */}
                <div className="flex flex-col items-center">
                  {(isEditing ? formData.profilePhoto : businessData.profilePhoto) ? (
                    <div className="relative group">
                      <img 
                        src={isEditing ? formData.profilePhoto : businessData.profilePhoto} 
                        alt="Business Profile" 
                        className="w-40 h-40 object-cover rounded-lg border-4 border-gray-200 shadow-lg"
                      />
                      {isEditing && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={triggerFileInput}
                            className="bg-white hover:bg-gray-100 text-gray-900"
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            Change
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={removePhoto}
                            className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-4 border-dashed border-gray-300 flex flex-col items-center justify-center">
                      <Building2 className="w-16 h-16 text-gray-400 mb-2" />
                      {!isEditing ? (
                        <p className="text-xs text-gray-500 text-center px-2">No photo uploaded</p>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={triggerFileInput}
                          className="mt-2"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Upload Photo
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {isEditing && (
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Recommended: Square image, max 5MB (JPG, PNG, GIF)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Social Channels */}
          <Card className="border-2 border-gray-200 hover:border-pink-300 transition-colors">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-3 rounded-lg">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Social Channels</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Online presence and social media</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* LinkedIn */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Linkedin className="w-3 h-3" />
                    LinkedIn
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.linkedInUrl || ''}
                      onChange={(e) => handleInputChange('linkedInUrl', e.target.value)}
                      placeholder="https://linkedin.com/company/..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                  ) : businessData.linkedInUrl ? (
                    <a
                      href={businessData.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block"
                    >
                      {businessData.linkedInUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}
                </div>

                {/* Facebook */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Facebook className="w-3 h-3" />
                    Facebook
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.facebookUrl || ''}
                      onChange={(e) => handleInputChange('facebookUrl', e.target.value)}
                      placeholder="https://facebook.com/..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                  ) : businessData.facebookUrl ? (
                    <a
                      href={businessData.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block"
                    >
                      {businessData.facebookUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}
                </div>

                {/* Twitter */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Twitter className="w-3 h-3" />
                    Twitter/X
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.twitterUrl || ''}
                      onChange={(e) => handleInputChange('twitterUrl', e.target.value)}
                      placeholder="https://twitter.com/..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                  ) : businessData.twitterUrl ? (
                    <a
                      href={businessData.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block"
                    >
                      {businessData.twitterUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}
                </div>

                {/* Instagram */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Instagram className="w-3 h-3" />
                    Instagram
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.instagramUrl || ''}
                      onChange={(e) => handleInputChange('instagramUrl', e.target.value)}
                      placeholder="https://instagram.com/..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                  ) : businessData.instagramUrl ? (
                    <a
                      href={businessData.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block"
                    >
                      {businessData.instagramUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}
                </div>

                {/* YouTube */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Youtube className="w-3 h-3" />
                    YouTube
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.youtubeUrl || ''}
                      onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
                      placeholder="https://youtube.com/@..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                  ) : businessData.youtubeUrl ? (
                    <a
                      href={businessData.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block"
                    >
                      {businessData.youtubeUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}
                </div>

                {/* TikTok */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    TikTok
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.tiktokUrl || ''}
                      onChange={(e) => handleInputChange('tiktokUrl', e.target.value)}
                      placeholder="https://tiktok.com/@..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                  ) : businessData.tiktokUrl ? (
                    <a
                      href={businessData.tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block"
                    >
                      {businessData.tiktokUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">—</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Business Verification Status */}
          <Card className="border-2 border-gray-200 hover:border-orange-300 transition-colors lg:col-span-2">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 rounded-lg">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Verification Status</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Essential business components</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* EIN */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasEIN ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">EIN Number</p>
                    {businessData.hasEIN && businessData.einNumber && (
                      <p className="text-xs text-gray-600 truncate">{businessData.einNumber}</p>
                    )}
                  </div>
                </div>

                {/* Bank Account */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasBankAccount ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm text-gray-900">Bank Account</p>
                  </div>
                </div>

                {/* Business Address */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasBusinessAddress ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm text-gray-900">Business Address</p>
                  </div>
                </div>

                {/* Business Phone */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasBusinessPhone ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">Business Phone</p>
                    {businessData.hasBusinessPhone && businessData.businessPhoneNumber && (
                      <p className="text-xs text-gray-600 truncate">{businessData.businessPhoneNumber}</p>
                    )}
                  </div>
                </div>

                {/* Business Email */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasBusinessEmail ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm text-gray-900">Business Email</p>
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasWebsite ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">Website</p>
                    {businessData.hasWebsite && businessData.websiteUrl && (
                      <a 
                        href={businessData.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block"
                      >
                        {businessData.websiteUrl}
                      </a>
                    )}
                  </div>
                </div>

                {/* Business License */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasBusinessLicense ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm text-gray-900">Business License</p>
                  </div>
                </div>

                {/* DUNS Number */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasDUNS ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">DUNS Number</p>
                    {businessData.hasDUNS && businessData.dunsNumber && (
                      <p className="text-xs text-gray-600 truncate">{businessData.dunsNumber}</p>
                    )}
                  </div>
                </div>

                {/* Business Credit */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {businessData.hasBusinessCredit ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">Business Credit</p>
                    {businessData.hasBusinessCredit && businessData.tradelineCount > 0 && (
                      <p className="text-xs text-gray-600">{businessData.tradelineCount} tradelines</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Metadata */}
          <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-slate-100 lg:col-span-2">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-300">
                <div className="bg-gradient-to-r from-gray-600 to-slate-700 text-white p-3 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Profile Metadata</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Tracking and history information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    Scan Status
                  </label>
                  {businessData.scanCompleted ? (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      Pending
                    </Badge>
                  )}
                </div>

                {businessData.scanCompletedDate && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Scan Date
                    </label>
                    <p className="text-sm text-gray-900 font-medium">
                      {new Date(businessData.scanCompletedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(businessData.lastUpdated).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Created Date
                  </label>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(businessData.createdDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* Quick Actions */}
        <div className="mt-6 sm:mt-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <ThemeButton
                  theme="blue-cyan"
                  onClick={() => navigate('/lender-compliance')}
                  className="w-full justify-center min-h-[44px]"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Lender Compliance
                </ThemeButton>
                
                <ThemeButton
                  theme="green"
                  onClick={() => navigate('/business-success-scan/step-1')}
                  className="w-full justify-center min-h-[44px]"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Business Scan
                </ThemeButton>
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/building-credit')}
                  className="w-full min-h-[44px]"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Build Credit
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full min-h-[44px]"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
