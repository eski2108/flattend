import { useState, useEffect, lazy, Suspense } from "react";
import "@/App.css";
import "@/styles/responsive.css";
import "@/styles/premium-ui.css";
import "@/styles/global-design-system.css";
import "@/styles/global-interactions.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { WalletProvider } from "@/contexts/WalletContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { applySamsungColorFix } from "@/utils/colorFix";
import ErrorBoundary from "@/components/ErrorBoundary";
import './i18n'; // Multi-language support

// Core pages - load immediately
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import WalletPage from "@/pages/WalletPage";
import SpotTrading from "@/pages/SpotTrading";
// Support Chat Widget
import SupportChatWidget from "@/components/SupportChatWidget";

// Auth pages - load immediately (user needs these first)
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AllocationsPageDirect from "@/pages/AllocationsPage";

// Lazy load non-critical pages for better performance
const Transactions = lazy(() => import("@/pages/Transactions"));
const Settings = lazy(() => import("@/pages/Settings"));
const AdminLiquidity = lazy(() => import("@/pages/AdminLiquidity"));
const AdminLiquidityManager = lazy(() => import("@/pages/AdminLiquidityManager"));
const ManagerSettings = lazy(() => import("@/pages/ManagerSettings"));
const MerchantCenter = lazy(() => import("@/pages/MerchantCenter"));
const CreateAd = lazy(() => import("@/pages/CreateAd"));
const PremiumAuth = lazy(() => import("@/pages/PremiumAuth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const TraderBalance = lazy(() => import("@/pages/TraderBalance"));
const MyOrders = lazy(() => import("@/pages/MyOrders"));
const OrderDetails = lazy(() => import("@/pages/OrderDetails"));
const P2POrderPage = lazy(() => import("@/pages/P2POrderPage"));
const OrderPreview = lazy(() => import("@/pages/OrderPreview"));
const PreviewOrder = lazy(() => import("@/pages/PreviewOrder"));
const P2PTrading = lazy(() => import("@/pages/P2PTrading"));
const P2PMarketplace = lazy(() => import("@/pages/P2PMarketplace"));
const P2PTradeDetailDemo = lazy(() => import("@/pages/P2PTradeDetailDemo"));
const DisputeCentre = lazy(() => import("@/pages/DisputeCentre"));
const AdminDisputes = lazy(() => import("@/pages/AdminDisputes"));
const AdminDisputeDetail = lazy(() => import("@/pages/AdminDisputeDetail"));
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const MerchantProfile = lazy(() => import("@/pages/MerchantProfile"));
// SpotTrading moved to core imports above
const AdminProofPage = lazy(() => import("@/pages/AdminProofPage"));
const TradePage = lazy(() => import("@/pages/TradePageNew"));
const CreateOffer = lazy(() => import("@/pages/CreateOffer"));
const OrderConfirmation = lazy(() => import("@/pages/OrderConfirmation"));
const SwapCrypto = lazy(() => import("@/pages/SwapCrypto"));
const InstantBuy = lazy(() => import("@/pages/InstantBuy"));
const P2PExpress = lazy(() => import("@/pages/P2PExpress"));
const Fees = lazy(() => import("@/pages/Fees"));
const PaymentMethods = lazy(() => import("@/pages/PaymentMethods"));
const BuyCrypto = lazy(() => import("@/pages/BuyCrypto"));
const SellCrypto = lazy(() => import("@/pages/SellCrypto"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminBusinessDashboard = lazy(() => import("@/pages/AdminBusinessDashboard"));
const AdminSupport = lazy(() => import("@/pages/AdminSupport"));
const AdminSecurityLogs = lazy(() => import("@/pages/AdminSecurityLogs"));
const AdminEarnings = lazy(() => import("@/pages/AdminEarnings"));
const AdminFees = lazy(() => import("@/pages/AdminFees"));
const AdminUsersManagement = lazy(() => import("@/pages/AdminUsersManagement"));
const ReferralDashboard = lazy(() => import("@/pages/ReferralDashboard"));
const ReferralDashboardNew = lazy(() => import("@/pages/ReferralDashboardNew"));
const ReferralDashboardComprehensive = lazy(() => import("@/pages/ReferralDashboardComprehensive"));
const EnhancedReferralDashboard = lazy(() => import("@/pages/EnhancedReferralDashboard"));
const AdminReferralControl = lazy(() => import("@/pages/AdminReferralControl"));
const AdminRevenueDashboard = lazy(() => import("@/pages/AdminRevenueDashboard"));
const AdminP2PDashboard = lazy(() => import("@/pages/AdminP2PDashboard"));
const AdminSupportSettings = lazy(() => import("@/pages/AdminSupportSettings"));
const ReferralsPage = lazy(() => import("@/pages/ReferralsPage"));
const ReferralsPageNew = lazy(() => import("@/pages/ReferralsPageNew"));
const ReferralLinkGenerator = lazy(() => import("@/pages/ReferralLinkGenerator"));
const SavingsPage = lazy(() => import("@/pages/Savings"));
const PortfolioPage = lazy(() => import("@/pages/PortfolioPageEnhanced"));
const AllocationsPage = lazy(() => import("@/pages/AllocationsPage"));
const AllocationsDemo = lazy(() => import("@/pages/AllocationsDemo"));
const Markets = lazy(() => import("@/pages/Markets"));
const WalletSettings = lazy(() => import("@/pages/WalletSettings"));
const DepositInstructions = lazy(() => import("@/pages/DepositInstructions"));
const WithdrawalRequest = lazy(() => import("@/pages/WithdrawalRequest"));
const KYCVerification = lazy(() => import("@/pages/KYCVerification"));
const AdminCMS = lazy(() => import("@/pages/AdminCMSNew"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const Staking = lazy(() => import("@/pages/Staking"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const OTCDesk = lazy(() => import("@/pages/OTCDesk"));
const Subscriptions = lazy(() => import("@/pages/Subscriptions"));
const Transfer = lazy(() => import("@/pages/Transfer"));
const InstantSell = lazy(() => import("@/pages/InstantSell"));
const UploadAPK = lazy(() => import("@/pages/UploadAPK"));
const EmailVerified = lazy(() => import("@/pages/EmailVerified"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PublicSellerProfile = lazy(() => import("@/pages/PublicSellerProfile"));
const Security = lazy(() => import("@/pages/Security"));
const TwoFactorSetup = lazy(() => import("@/pages/TwoFactorSetup"));
const Verification = lazy(() => import("@/pages/Verification"));
const AccountUpgrade = lazy(() => import("@/pages/AccountUpgrade"));
const P2PBoost = lazy(() => import("@/pages/P2PBoost"));
const PriceAlerts = lazy(() => import("@/pages/PriceAlerts"));
const UIShowcase = lazy(() => import("@/pages/UIShowcase"));
import ChatWidget from "@/components/ChatWidget";
import { Toaster } from "@/components/ui/sonner";
import TestModeBanner from "@/components/TestModeBanner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  // Apply Samsung Browser color fix on mount
  useEffect(() => {
    applySamsungColorFix();
  }, []);

  return (
    <ErrorBoundary>
      <CurrencyProvider>
        <WalletProvider>
          <div className="App">
            <TestModeBanner />
            <Toaster position="top-right" richColors />
            <BrowserRouter>
          <Suspense fallback={
            <div style={{ 
              minHeight: '100vh', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#0B0E13',
              color: '#00F0FF'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <div>Loading...</div>
              </div>
            </div>
          }>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/seller/:sellerId" element={<PublicSellerProfile />} />
            <Route path="/security" element={<Security />} />
            <Route path="/2fa-setup" element={<TwoFactorSetup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth" element={<PremiumAuth />} />
            <Route path="/auth/verify-phone" element={<PremiumAuth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/create-offer" element={<CreateOffer />} />
            <Route path="/buy-crypto" element={<BuyCrypto />} />
            <Route path="/sell-crypto" element={<SellCrypto />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/order-preview/:orderId" element={<OrderPreview />} />
            <Route path="/order-preview" element={<OrderPreview />} />
            <Route path="/trade/:tradeId" element={<TradePage />} />
            <Route path="/p2p" element={<P2PMarketplace />} />
            <Route path="/p2p-marketplace" element={<P2PMarketplace />} />
            <Route path="/disputes/:disputeId" element={<DisputeCentre />} />
            <Route path="/trading" element={<SpotTrading />} />
            <Route path="/spot-trading" element={<SpotTrading />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/swap-crypto" element={<SwapCrypto />} />
            <Route path="/swap/:coin" element={<SwapCrypto />} />
            <Route path="/instant-buy" element={<InstantBuy />} />
            <Route path="/p2p-express" element={<P2PExpress />} />
            <Route path="/referrals" element={<ReferralDashboardComprehensive />} />
            <Route path="/referrals/old" element={<ReferralDashboardNew />} />
            <Route path="/merchant/profile/:userId" element={<MerchantProfile />} />
            <Route path="/referrals/premium" element={<ReferralsPage />} />
            <Route path="/referrals/enhanced" element={<EnhancedReferralDashboard />} />
            <Route path="/referrals/new" element={<ReferralsPageNew />} />
            <Route path="/referrals/old" element={<ReferralDashboard />} />
            <Route path="/admin/referral-control" element={<AdminReferralControl />} />
            <Route path="/admin/revenue" element={<AdminRevenueDashboard />} />
            <Route path="/admin/p2p" element={<AdminP2PDashboard />} />
            <Route path="/admin/support-settings" element={<AdminSupportSettings />} />
            <Route path="/order/:orderId" element={<OrderDetails />} />
            <Route path="/p2p/order/:tradeId" element={<P2POrderPage />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            {/* Portfolio route removed - Dashboard page serves as Portfolio Overview */}
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/allocations" element={<AllocationsPageDirect />} />
            <Route path="/allocations-demo" element={<AllocationsDemo />} />
            <Route path="/trader-balance" element={<TraderBalance />} />
            <Route path="/wallet/settings" element={<WalletSettings />} />
            <Route path="/wallet/deposit" element={<DepositInstructions />} />
            <Route path="/wallet/withdraw" element={<WithdrawalRequest />} />
            {/* Spec-compliant routes for deposit/withdraw */}
            <Route path="/deposit/:coin" element={<DepositInstructions />} />
            <Route path="/withdraw/:coin" element={<WithdrawalRequest />} />
            <Route path="/kyc-verification" element={<KYCVerification />} />
            <Route path="/admin/cms" element={<AdminCMS />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin-liquidity" element={<AdminLiquidity />} />
            <Route path="/admin/liquidity-manager" element={<AdminLiquidityManager />} />
            <Route path="/manager-settings" element={<ManagerSettings />} />
            <Route path="/p2p/merchant" element={<MerchantCenter />} />
            <Route path="/p2p/create-ad" element={<CreateAd />} />
            <Route path="/p2p/trade/:tradeId" element={<P2PTradeDetailDemo />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/business" element={<AdminBusinessDashboard />} />
            <Route path="/admin/disputes" element={<AdminDisputes />} />
            <Route path="/admin/disputes/:disputeId" element={<AdminDisputeDetail />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/merchant/:userId" element={<MerchantProfile />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/admin/earnings" element={<AdminEarnings />} />
            <Route path="/admin/fees" element={<AdminFees />} />
            <Route path="/admin/users" element={<AdminUsersManagement />} />
            <Route path="/admin/security-logs" element={<AdminSecurityLogs />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/staking" element={<Staking />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/otc-desk" element={<OTCDesk />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/instant-sell" element={<InstantSell />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/account/upgrade" element={<AccountUpgrade />} />
            <Route path="/p2p/boost" element={<P2PBoost />} />
            <Route path="/price-alerts" element={<PriceAlerts />} />
            <Route path="/help" element={<FAQ />} />
            <Route path="/upload-apk" element={<UploadAPK />} />
            <Route path="/verify-email" element={<EmailVerified />} />
            <Route path="/ui-showcase" element={<UIShowcase />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          {/* AI + Tawk.to Chat Widget - Shows on ALL pages */}
          <ChatWidget />
        </BrowserRouter>
        
        {/* Support Chat Widget - Shows on all pages */}
        <SupportChatWidget />
      </div>
    </WalletProvider>
    </CurrencyProvider>
    </ErrorBoundary>
  );
}

export default App;