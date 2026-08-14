import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense } from 'react';
import { RootLayout } from './layout/RootLayout';
import { AdminRoute } from './components/AdminRoute';

// Lazy load all page components
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const FoundationFirstDashboard = lazy(() => import('./pages/FoundationFirst/Dashboard').then(m => ({ default: m.Dashboard })));
const IntegrateReports = lazy(() => import('./pages/IntegrateReports').then(m => ({ default: m.IntegrateReports })));
const StatusReports = lazy(() => import('./pages/StatusReports').then(m => ({ default: m.StatusReports })));
const AICoach = lazy(() => import('./pages/AICoach').then(m => ({ default: m.AICoach })));
const GHLSnapshot = lazy(() => import('./pages/GHLSnapshot').then(m => ({ default: m.GHLSnapshot })));
const BankableStatus = lazy(() => import('./pages/StatusReports/BankableStatus').then(m => ({ default: m.BankableStatus })));
const BusinessFICO = lazy(() => import('./pages/StatusReports/BusinessFICO').then(m => ({ default: m.BusinessFICO })));
const EstimatedFunding = lazy(() => import('./pages/StatusReports/EstimatedFunding').then(m => ({ default: m.EstimatedFunding })));
const OwnersCredit = lazy(() => import('./pages/StatusReports/OwnersCredit').then(m => ({ default: m.OwnersCredit })));
const PersonalCreditReport = lazy(() => import('./pages/StatusReports/PersonalCreditReport').then(m => ({ default: m.PersonalCreditReport })));
const AccessFundingPage = lazy(() => import('./pages/AccessFundingMain').then(m => ({ default: m.AccessFunding })));
const BusinessCreditCards = lazy(() => import('./pages/AccessFunding/BusinessCreditCards').then(m => ({ default: m.BusinessCreditCards })));
const BusinessCreditLine = lazy(() => import('./pages/AccessFunding/BusinessCreditLine').then(m => ({ default: m.BusinessCreditLine })));
const BusinessTermLoan = lazy(() => import('./pages/AccessFunding/BusinessTermLoan').then(m => ({ default: m.BusinessTermLoan })));
const CreditUnionLoans = lazy(() => import('./pages/AccessFunding/CreditUnionLoans').then(m => ({ default: m.CreditUnionLoans })));
const EquipmentFinancing = lazy(() => import('./pages/AccessFunding/EquipmentFinancing').then(m => ({ default: m.EquipmentFinancing })));
const MerchantAdvance = lazy(() => import('./pages/AccessFunding/MerchantAdvance').then(m => ({ default: m.MerchantAdvance })));
const PersonalCreditCards = lazy(() => import('./pages/AccessFunding/PersonalCreditCards').then(m => ({ default: m.PersonalCreditCards })));
const ReceivableFactoring = lazy(() => import('./pages/AccessFunding/ReceivableFactoring').then(m => ({ default: m.ReceivableFactoring })));
const RevenueBasedLoan = lazy(() => import('./pages/AccessFunding/RevenueBasedLoan').then(m => ({ default: m.RevenueBasedLoan })));
const WorkingCapitalLoans = lazy(() => import('./pages/AccessFunding/WorkingCapitalLoans').then(m => ({ default: m.WorkingCapitalLoans })));
const SBABusinessLoan = lazy(() => import('./pages/AccessFunding/SBABusinessLoan').then(m => ({ default: m.SBABusinessLoan })));
const AccountsReceivableFinance = lazy(() => import('./pages/AccessFunding/AccountsReceivableFinance').then(m => ({ default: m.AccountsReceivableFinance })));
const PurchaseOrderFinance = lazy(() => import('./pages/AccessFunding/PurchaseOrderFinance').then(m => ({ default: m.PurchaseOrderFinance })));
const InventoryLineOfCredit = lazy(() => import('./pages/AccessFunding/InventoryLineOfCredit').then(m => ({ default: m.InventoryLineOfCredit })));
const BridgeLoans = lazy(() => import('./pages/AccessFunding/BridgeLoans').then(m => ({ default: m.BridgeLoans })));
const DSCRLoans = lazy(() => import('./pages/AccessFunding/DSCRLoans').then(m => ({ default: m.DSCRLoans })));
const ConstructionLoans = lazy(() => import('./pages/AccessFunding/ConstructionLoans').then(m => ({ default: m.ConstructionLoans })));
const StartupEquipment = lazy(() => import('./pages/AccessFunding/StartupEquipment').then(m => ({ default: m.StartupEquipment })));
const TruckUtilityVehicles = lazy(() => import('./pages/AccessFunding/TruckUtilityVehicles').then(m => ({ default: m.TruckUtilityVehicles })));
const DocumentCollection = lazy(() => import('./pages/DocumentCollection').then(m => ({ default: m.DocumentCollection })));
const LenderCompliance = lazy(() => import('./pages/LenderCompliance').then(m => ({ default: m.LenderCompliance })));
const BuildingCredit = lazy(() => import('./pages/BuildingCredit').then(m => ({ default: m.BuildingCredit })));
const OptimizeReporting = lazy(() => import('./pages/OptimizeReporting').then(m => ({ default: m.OptimizeReporting })));
const OnlineAnalysis = lazy(() => import('./pages/OnlineAnalysis').then(m => ({ default: m.OnlineAnalysis })));
const OrganizeFinancials = lazy(() => import('./pages/OrganizeFinancials').then(m => ({ default: m.OrganizeFinancials })));
const UnifiedAssessment = lazy(() => import('./pages/business-assessment/UnifiedAssessment'));
const UnifiedResults = lazy(() => import('./pages/business-assessment/Results').then(m => ({ default: m.Results })));
const MyBusinessProfile = lazy(() => import('./pages/MyBusinessProfile').then(m => ({ default: m.MyBusinessProfile })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const TemplatesAndResources = lazy(() => import('./pages/TemplatesAndResources').then(m => ({ default: m.TemplatesAndResources })));
const ResourceDetail = lazy(() => import('./pages/ResourceDetail').then(m => ({ default: m.ResourceDetail })));
const CapitalAccessMap = lazy(() => import('./pages/CapitalAccessMap').then(m => ({ default: m.CapitalAccessMap })));
const DenialDiagnosis = lazy(() => import('./pages/DenialDiagnosis'));
const CapitalGlossary = lazy(() => import('./pages/CapitalGlossary').then(m => ({ default: m.CapitalGlossary })));
const MyProgress = lazy(() => import('./pages/MyProgress').then(m => ({ default: m.MyProgress })));
const GettingStarted = lazy(() => import('./pages/GettingStarted').then(m => ({ default: m.GettingStarted })));
const CreditPath = lazy(() => import('./pages/CreditPath').then(m => ({ default: m.CreditPath })));
const Finances = lazy(() => import('./pages/Finances').then(m => ({ default: m.Finances })));
const LenderPortal = lazy(() => import('./pages/admin/LenderPortal').then(m => ({ default: m.LenderPortal })));
const EntityFilings = lazy(() => import('./pages/LenderCompliance/EntityFilings').then(m => ({ default: m.EntityFilings })));

// LenderCompliance sub-pages
const BusinessLocation = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.BusinessLocation })));
const Phones411 = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.Phones411 })));
const WebsiteEmail = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.WebsiteEmail })));
const EINLicenses = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.EINLicenses })));
const BusinessBanking = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.BusinessBanking })));
const AgenciesNAICS = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.AgenciesNAICS })));
const BusinessPlan = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.BusinessPlan })));
const AssetsUCC = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.AssetsUCC })));
const CorpOnlyFacts = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.CorpOnlyFacts })));
const BankRating = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.BankRating })));
const ComparableCredit = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.ComparableCredit })));
const CDBusinessLoan = lazy(() => import('./pages/LenderCompliance/index').then(m => ({ default: m.CDBusinessLoan })));

// Loading fallback
const Loading = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
  </div>
);

// Wrapper for lazy components
const LazyComponent = ({ Component, ...props }: { Component: React.LazyExoticComponent<any>, [key: string]: any }) => (
  <Suspense fallback={<Loading />}>
    <Component {...props} />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: 'fundscore-assessment',
    element: <Navigate to="/app/business-assessment" replace />,
  },
  // App routes with RootLayout (sidebar, topnav) - PROTECTED routes
  // Only auth-required routes go here
  {
    path: '/app',
    Component: RootLayout,
    children: [
      {
        index: true,
        element: <LazyComponent Component={Dashboard} />,
      },
      {
        path: 'dashboard',
        element: <LazyComponent Component={Dashboard} />,
      },
      {
        path: 'capital-dashboard',
        element: <LazyComponent Component={Dashboard} />,
      },
      {
        path: 'denial-diagnosis',
        element: <LazyComponent Component={DenialDiagnosis} />,
      },
      {
        path: 'integrate-reports',
        element: <LazyComponent Component={IntegrateReports} />,
      },
      {
        path: 'settings',
        element: <LazyComponent Component={Settings} />,
      },
      {
        path: 'settings/my-business-profile',
        element: <LazyComponent Component={MyBusinessProfile} />,
      },
      {
        path: 'my-business-profile',
        element: <Navigate to="/app/settings/my-business-profile" replace />,
      },
      {
        path: 'ai-coach',
        element: <LazyComponent Component={AICoach} />,
      },
      {
        path: 'ghl-snapshot',
        element: <LazyComponent Component={GHLSnapshot} />,
      },
      {
        path: 'status-reports',
        element: <LazyComponent Component={StatusReports} />,
      },
      {
        path: 'status-reports/bankable-status',
        element: <LazyComponent Component={BankableStatus} />,
      },
      {
        path: 'status-reports/business-fico',
        element: <LazyComponent Component={BusinessFICO} />,
      },
      {
        path: 'status-reports/estimated-funding',
        element: <LazyComponent Component={EstimatedFunding} />,
      },
      {
        path: 'status-reports/personal-credit',
        element: <LazyComponent Component={PersonalCreditReport} />,
      },
      {
        path: 'status-reports/owners-credit',
        element: <Navigate to="/app/status-reports/personal-credit" replace />,
      },
      {
        path: 'access-funding',
        element: <LazyComponent Component={AccessFundingPage} />,
        children: [
          { path: 'business-credit-cards', element: <LazyComponent Component={BusinessCreditCards} /> },
          { path: 'business-credit-line', element: <LazyComponent Component={BusinessCreditLine} /> },
          { path: 'business-term-loan', element: <LazyComponent Component={BusinessTermLoan} /> },
          { path: 'credit-union-loans', element: <LazyComponent Component={CreditUnionLoans} /> },
          { path: 'equipment-financing', element: <LazyComponent Component={EquipmentFinancing} /> },
          { path: 'merchant-advance', element: <LazyComponent Component={MerchantAdvance} /> },
          { path: 'personal-credit-cards', element: <LazyComponent Component={PersonalCreditCards} /> },
          { path: 'receivable-factoring', element: <LazyComponent Component={ReceivableFactoring} /> },
          { path: 'revenue-based-loan', element: <LazyComponent Component={RevenueBasedLoan} /> },
          { path: 'working-capital-loans', element: <LazyComponent Component={WorkingCapitalLoans} /> },
          { path: 'sba-business-loan', element: <LazyComponent Component={SBABusinessLoan} /> },
          { path: 'accounts-receivable-finance', element: <LazyComponent Component={AccountsReceivableFinance} /> },
          { path: 'startup-equipment', element: <LazyComponent Component={StartupEquipment} /> },
          { path: 'truck-utility-vehicles', element: <LazyComponent Component={TruckUtilityVehicles} /> },
          { path: 'purchase-order-finance', element: <LazyComponent Component={PurchaseOrderFinance} /> },
          { path: 'inventory-line-of-credit', element: <LazyComponent Component={InventoryLineOfCredit} /> },
          { path: 'bridge-loans', element: <LazyComponent Component={BridgeLoans} /> },
          { path: 'dscr-loans', element: <LazyComponent Component={DSCRLoans} /> },
          { path: 'construction-loans', element: <LazyComponent Component={ConstructionLoans} /> },
        ],
      },
      {
        path: 'document-collection',
        element: <LazyComponent Component={DocumentCollection} />,
      },
      {
        path: 'lender-compliance',
        element: <LazyComponent Component={LenderCompliance} />,
      },
      {
        path: 'capital-access-map',
        element: <LazyComponent Component={CapitalAccessMap} />,
      },
      {
        path: 'lender-compliance/entity-filings',
        element: <LazyComponent Component={EntityFilings} />,
      },
      {
        path: 'lender-compliance/entity-filings-user-friendly',
        element: <LazyComponent Component={EntityFilings} />,
      },
      {
        path: 'lender-compliance/business-location',
        element: <LazyComponent Component={BusinessLocation} />,
      },
      {
        path: 'lender-compliance/phones-411',
        element: <LazyComponent Component={Phones411} />,
      },
      {
        path: 'lender-compliance/website-email',
        element: <LazyComponent Component={WebsiteEmail} />,
      },
      {
        path: 'lender-compliance/ein-licenses',
        element: <LazyComponent Component={EINLicenses} />,
      },
      {
        path: 'lender-compliance/business-banking',
        element: <LazyComponent Component={BusinessBanking} />,
      },
      {
        path: 'lender-compliance/agencies-naics',
        element: <LazyComponent Component={AgenciesNAICS} />,
      },
      {
        path: 'lender-compliance/business-plan',
        element: <LazyComponent Component={BusinessPlan} />,
      },
      {
        path: 'lender-compliance/assets-ucc',
        element: <LazyComponent Component={AssetsUCC} />,
      },
      {
        path: 'lender-compliance/corp-only-facts',
        element: <LazyComponent Component={CorpOnlyFacts} />,
      },
      {
        path: 'lender-compliance/bank-rating',
        element: <LazyComponent Component={BankRating} />,
      },
      {
        path: 'lender-compliance/comparable-credit',
        element: <LazyComponent Component={ComparableCredit} />,
      },
      {
        path: 'lender-compliance/cd-business-loan',
        element: <LazyComponent Component={CDBusinessLoan} />,
      },
      {
        path: 'optimize-reporting',
        element: <LazyComponent Component={OptimizeReporting} />,
      },
      {
        path: 'online-analysis',
        element: <LazyComponent Component={OnlineAnalysis} />,
      },
      {
        path: 'building-credit',
        element: <LazyComponent Component={BuildingCredit} />,
      },
      {
        path: 'organize-financials',
        element: <LazyComponent Component={OrganizeFinancials} />,
      },
      {
        path: 'become-bankable',
        element: <Navigate to="/app/lender-compliance" replace />,
      },
      {
        path: 'bankable-roadmap',
        element: <Navigate to="/lender-compliance" replace />,
      },
      {
        path: 'business-education',
        element: <Navigate to="/app/getting-started" replace />,
      },
      {
        path: 'help-desk',
        element: <Navigate to="/app/getting-started" replace />,
      },
      {
        path: 'credit-path',
        element: <LazyComponent Component={CreditPath} />,
      },
      {
        path: 'my-progress',
        element: <LazyComponent Component={MyProgress} />,
      },
      {
        path: 'getting-started',
        element: <LazyComponent Component={GettingStarted} />,
      },
      {
        path: 'finances',
        element: <LazyComponent Component={Finances} />,
      },
      {
        path: 'admin/lender-portal',
        element: <AdminRoute><LazyComponent Component={LenderPortal} /></AdminRoute>,
      },
      {
        path: 'capital-glossary',
        element: <LazyComponent Component={CapitalGlossary} />,
      },
      {
        path: 'templates-resources',
        element: <LazyComponent Component={TemplatesAndResources} />,
      },
      {
        path: 'templates-resources/:id',
        element: <LazyComponent Component={ResourceDetail} />,
      },
      {
        path: 'foundation-first',
        element: <Navigate to="/foundation-first/dashboard" replace />,
      },
      {
        path: 'foundation-first/dashboard',
        element: <LazyComponent Component={FoundationFirstDashboard} />,
      },
      {
        path: 'foundation-first/financial-profile',
        element: <Navigate to="/app/foundation-first/dashboard" replace />,
      },
      {
        path: 'foundation-first/income-savings',
        element: <Navigate to="/app/foundation-first/dashboard" replace />,
      },
      {
        path: 'foundation-first/assets-debt',
        element: <Navigate to="/app/foundation-first/dashboard" replace />,
      },
      {
        path: 'foundation-first/risk-management',
        element: <Navigate to="/app/foundation-first/dashboard" replace />,
      },
      {
        path: 'foundation-first/retirement-planning',
        element: <Navigate to="/app/foundation-first/dashboard" replace />,
      },
      {
        path: 'foundation-first/settings',
        element: <Navigate to="/app/foundation-first/dashboard" replace />,
      },
    ],
  },
  // Auth pages (no sidebar/layout)
  {
    path: '/login',
    element: <LazyComponent Component={LoginPage} />,
  },
  {
    path: '/signup',
    element: <LazyComponent Component={SignupPage} />,
  },
  {
    path: '/forgot-password',
    element: <LazyComponent Component={ForgotPasswordPage} />,
  },
  {
    path: '/reset-password',
    element: <LazyComponent Component={ResetPasswordPage} />,
  },
  // PUBLIC ASSESSMENT ROUTES - NO AUTH REQUIRED
  // Lead generation funnel - anyone can take assessment
  {
    path: '/business-assessment',
    element: <LazyComponent Component={UnifiedAssessment} />,
  },
  {
    path: '/business-assessment/results',
    element: <LazyComponent Component={UnifiedResults} />,
  },
  // Landing page
  {
    path: '/',
    element: <LazyComponent Component={LandingPage} />,
  },
  // Catch all - redirect to landing
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
