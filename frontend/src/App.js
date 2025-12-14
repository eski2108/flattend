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
import SpotTradingPro from "@/pages/SpotTradingPro";
import MobileMarketSelection from "@/pages/MobileMarketSelection";
import MobileTradingPage from "@/pages/MobileTradingPage";
import SendPage from "@/pages/SendPage";
import ReceivePage from "@/pages/ReceivePage";
import BridgePage from "@/pages/BridgePage";
import NFTsPage from "@/pages/NFTsPage";
import DeFiPage from "@/pages/DeFiPage";
import AssetDetailPage from "@/pages/AssetDetailPage";

// Layout
import MainLayout from "@/layouts/MainLayout";

// Auth pages - load immediately (user needs these first)
import Login from "@/pages/Login";
import Register from "@/pages/Register";

// Cache bypass duplicates - NEW ROUTES TO FORCE FRESH BUILDS
import Login2 from "@/pages/Login2";
import Register2 from "@/pages/Register2";
// Removed old trading page imports
import AllocationsPageDirect from "@/pages/AllocationsPage";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

// Lazy load non-critical pages for better performance
const Transactions = lazy(() => import("@/pages/Transactions"));
import Settings from "@/pages/Settings";
const AdminLiquidity = lazy(() => import("@/pages/AdminLiquidity"));
const AdminLiquidityManager = lazy(() => import("@/pages/AdminLiquidityManager"));
const AdminLiquidityManagement = lazy(() => import("@/pages/AdminLiquidityManagement"));
const ManagerSettings = lazy(() => import("@/pages/ManagerSettings"));
import MerchantCenter from "@/pages/MerchantCenter";
import AddPaymentMethod from "@/pages/AddPaymentMethod";
import CreateAd from "@/pages/CreateAd";
const PremiumAuth = lazy(() => import("@/pages/PremiumAuth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const TraderBalance = lazy(() => import("@/pages/TraderBalance"));
import MyOrders from "@/pages/MyOrders";
const OrderDetails = lazy(() => import("@/pages/OrderDetails"));
const P2POrderPage = lazy(() => import("@/pages/P2POrderPage"));
const OrderPreview = lazy(() => import("@/pages/OrderPreview"));
const PreviewOrder = lazy(() => import("@/pages/PreviewOrder"));
const P2PTrading = lazy(() => import("@/pages/P2PTrading"));
import P2PMarketplace from "@/pages/P2PMarketplace";
const P2PTradeDetailDemo = lazy(() => import("@/pages/P2PTradeDetailDemo"));
const DisputeCentre = lazy(() => import("@/pages/DisputeCentre"));
const AdminDisputes = lazy(() => import("@/pages/AdminDisputes"));
import AdminDisputeDetail from "@/pages/AdminDisputeDetail";
import EmailDisputeEntry from "@/pages/EmailDisputeEntry";
const BlockedUsers = lazy(() => import("@/pages/BlockedUsers"));
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const MerchantProfile = lazy(() => import("@/pages/MerchantProfile"));
// SpotTrading moved to core imports above
const AdminProofPage = lazy(() => import("@/pages/AdminProofPage"));
const TradePage = lazy(() => import("@/pages/TradePageNew"));
const CreateOffer = lazy(() => import("@/pages/CreateOffer"));
const MobileAppPage = lazy(() => import("@/pages/MobileAppPage"));
const ChartTest = lazy(() => import("@/pages/ChartTest"));
const OrderConfirmation = lazy(() => import("@/pages/OrderConfirmation"));
import SwapCrypto from "@/pages/SwapCrypto";
import InstantBuy from "@/pages/InstantBuy";
import P2PExpress from "@/pages/P2PExpress";
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
import ReferralDashboardComprehensive from "@/pages/ReferralDashboardComprehensive";
const EnhancedReferralDashboard = lazy(() => import("@/pages/EnhancedReferralDashboard"));
const AdminReferralControl = lazy(() => import("@/pages/AdminReferralControl"));
const AdminRevenueDashboard = lazy(() => import("@/pages/AdminRevenueDashboard"));
const AdminP2PDashboard = lazy(() => import("@/pages/AdminP2PDashboard"));
const AdminSupportSettings = lazy(() => import("@/pages/AdminSupportSettings"));
import ReferralsPage from "@/pages/ReferralsPage";
import ReferralsPageNew from "@/pages/ReferralsPageNew";
const ReferralLinkGenerator = lazy(() => import("@/pages/ReferralLinkGenerator"));
const SavingsPage = lazy(() => import("@/pages/Savings"));
const PortfolioPage = lazy(() => import("@/pages/PortfolioPageEnhanced"));
const AllocationsPage = lazy(() => import("@/pages/AllocationsPage"));
const AllocationsDemo = lazy(() => import("@/pages/AllocationsDemo"));
const Markets = lazy(() => import("@/pages/Markets"));
const WalletSettings = lazy(() => import("@/pages/WalletSettings"));
import DepositInstructions from "@/pages/DepositInstructions";
import SimpleDeposit from "@/pages/SimpleDeposit";
const WithdrawalRequest = lazy(() => import("@/pages/WithdrawalRequest"));
const KYCVerification = lazy(() => import("@/pages/KYCVerification"));
const AdminCMS = lazy(() => import("@/pages/AdminCMSNew"));
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
import ProtectedRoute from "@/components/ProtectedRoute";

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
            {/* EMAIL ENTRY ROUTE - HARD REDIRECT TO BYPASS CACHE */}
            <Route path="/email/dispute/:disputeId" element={<EmailDisputeEntry />} />
            
            {/* ADMIN DISPUTE ROUTES - PUBLIC ACCESS FOR EMAIL LINKS */}
            <Route path="/admin/disputes/:disputeId" element={<AdminDisputeDetail />} />
            <Route path="/dispute-view/:disputeId" element={<AdminDisputeDetail />} />
            
            {/* PUBLIC ROUTES - NO SIDEBAR */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth" element={<PremiumAuth />} />
            <Route path="/auth/verify-phone" element={<PremiumAuth />} />
            <Route path="/seller/:sellerId" element={<PublicSellerProfile />} />
            
            {/* Cache bypass routes */}
            <Route path="/login2" element={<Login2 />} />
            <Route path="/register2" element={<Register2 />} />
            
            {/* AUTHENTICATED ROUTES - WITH SIDEBAR IN MAINLAYOUT */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/send/:currency" element={<SendPage />} />
              <Route path="/receive" element={<ReceivePage />} />
              <Route path="/bridge" element={<BridgePage />} />
              <Route path="/nfts" element={<NFTsPage />} />
              <Route path="/defi" element={<DeFiPage />} />
              <Route path="/asset/:symbol" element={<AssetDetailPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              {/* Mobile Trading Routes - PRIMARY */}
              <Route path="/markets" element={<MobileMarketSelection />} />
              <Route path="/trading/:symbol" element={<MobileTradingPage />} />
              {/* Main trading route - redirect to markets on mobile */}
              <Route path="/trading" element={<MobileMarketSelection />} />
              {/* Desktop Legacy Routes */}
              <Route path="/spot-trading" element={<SpotTradingPro />} />
              <Route path="/spot-trading-pro" element={<SpotTradingPro />} />
              {/* Removed old trading page route */}
              <Route path="/p2p" element={<P2PMarketplace />} />
              <Route path="/p2p-marketplace" element={<P2PMarketplace />} />
              <Route path="/p2p-express" element={<P2PExpress />} />
              <Route path="/swap-crypto" element={<SwapCrypto />} />
              <Route path="/swap/:coin" element={<SwapCrypto />} />
              <Route path="/instant-buy" element={<InstantBuy />} />
              <Route path="/referrals" element={<ReferralDashboardComprehensive />} />
              <Route path="/referrals/old" element={<ReferralDashboardNew />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Settings />} />
              <Route path="/security" element={<Security />} />
              <Route path="/2fa-setup" element={<TwoFactorSetup />} />
              <Route path="/markets" element={<Markets />} />
              <Route path="/create-offer" element={<CreateOffer />} />
              <Route path="/buy-crypto" element={<BuyCrypto />} />
              <Route path="/sell-crypto" element={<SellCrypto />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/order-preview/:orderId" element={<OrderPreview />} />
              <Route path="/order-preview" element={<OrderPreview />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/trade/:tradeId" element={<TradePage />} />
              <Route path="/disputes/:disputeId" element={<DisputeCentre />} />
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
              <Route path="/deposit/:coin" element={<SimpleDeposit />} />
              <Route path="/withdraw/:coin" element={<WithdrawalRequest />} />
              <Route path="/kyc-verification" element={<KYCVerification />} />
              <Route path="/admin/cms" element={<AdminCMS />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Settings />} />
              <Route path="/settings/blocked" element={<BlockedUsers />} />
              <Route path="/mobile-app" element={<MobileAppPage />} />
              <Route path="/chart-test" element={<ChartTest />} />
              <Route path="/admin-liquidity" element={<AdminLiquidity />} />
              <Route path="/admin/liquidity-manager" element={<AdminLiquidityManager />} />
              <Route path="/admin/liquidity" element={<AdminLiquidityManagement />} />
              <Route path="/manager-settings" element={<ManagerSettings />} />
              <Route path="/p2p/merchant" element={<MerchantCenter />} />
              <Route path="/p2p/add-payment-method" element={<AddPaymentMethod />} />
              <Route path="/p2p/create-ad" element={<CreateAd />} />
              <Route path="/p2p/trade/:tradeId" element={<P2PTradeDetailDemo />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/business" element={<AdminBusinessDashboard />} />
              <Route path="/admin/disputes" element={<AdminDisputes />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/merchant/:userId" element={<MerchantProfile />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/earnings" element={<AdminEarnings />} />
              <Route path="/admin/fees" element={<AdminFees />} />
              <Route path="/admin/users" element={<AdminUsersManagement />} />
              <Route path="/admin/security-logs" element={<AdminSecurityLogs />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          {/* AI Chat Widget - Shows on ALL pages */}
          <ChatWidget />
        </BrowserRouter>
      </div>
    </WalletProvider>
    </CurrencyProvider>
    </ErrorBoundary>
  );
}

export default App;