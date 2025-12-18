import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IoCash, IoCloudDownload, IoLogOut, IoPeople, IoSearch, IoShield, IoTrendingUp, IoWarning } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import AdminPlatformWallet from './AdminPlatformWallet';
import AdminSupportChat from './AdminSupportChat';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [recentSignups, setRecentSignups] = useState([]);
  const [customerInvestments, setCustomerInvestments] = useState([]);
  const [unifiedPlatformData, setUnifiedPlatformData] = useState(null);
  const [unifiedUsersData, setUnifiedUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformConfig, setPlatformConfig] = useState(null);
  const [editingCommission, setEditingCommission] = useState(null);
  const [referralConfig, setReferralConfig] = useState(null);
  const [referralEarnings, setReferralEarnings] = useState([]);
  const [activeTab, setActiveTab] = useState('unified');
  const [disputes, setDisputes] = useState([]);
  const [disputeFilter, setDisputeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [liquidityWallets, setLiquidityWallets] = useState([]);
  const [addLiquidityModal, setAddLiquidityModal] = useState(false);
  const [newLiquidity, setNewLiquidity] = useState({ currency: 'BTC', amount: '' });
  const [withdrawalAddresses, setWithdrawalAddresses] = useState({
    BTC: '',
    ETH: '',
    USDT: ''
  });
  const [feeBalances, setFeeBalances] = useState([]);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [liquidityHistory, setLiquidityHistory] = useState([]);
  const [showDepositModal, setShowDepositModal] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState({ title: '', content: '', send_email: false });
  const [customerAnalytics, setCustomerAnalytics] = useState(null);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [showFeeSettings, setShowFeeSettings] = useState(false);
  const [tradingLiquidity, setTradingLiquidity] = useState([]);
  const [tradingLiquidityModal, setTradingLiquidityModal] = useState({ show: false, type: 'add', currency: 'BTC', amount: '' });
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [revenueTransactions, setRevenueTransactions] = useState([]);
  const [supportedCoins, setSupportedCoins] = useState([]);
  const [editingCoin, setEditingCoin] = useState(null);
  const [addCoinModal, setAddCoinModal] = useState(false);
  const [newCoin, setNewCoin] = useState({ symbol: '', name: '', nowpay_wallet_id: '' });

  const [revenuePeriod, setRevenuePeriod] = useState('day');
  const [revenueFilter, setRevenueFilter] = useState('all');
  const [monetizationBreakdown, setMonetizationBreakdown] = useState(null);
  const [showMonetizationModal, setShowMonetizationModal] = useState(false);
  
  // Dynamic coin list for dropdowns
  const [availableCoinSymbols, setAvailableCoinSymbols] = useState(['BTC', 'ETH', 'USDT']);
  
  // Monetization Settings
  const [monetizationSettings, setMonetizationSettings] = useState(null);
  const [editingMonetization, setEditingMonetization] = useState(false);
  
  // Promo Banners
  const [banners, setBanners] = useState([]);
  const [editingBanner, setEditingBanner] = useState(null);
  const [bannerModal, setBannerModal] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title: '',
    message: '',
    type: 'info',
    link: '',
    link_text: '',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    is_active: true
  });

  useEffect(() => {
    const adminData = localStorage.getItem('admin_user');
    if (!adminData) {
      navigate('/admin/login');
      return;
    }
    setAdmin(JSON.parse(adminData));
    fetchData();
    fetchAvailableCoinSymbols();
  }, [navigate]);
  
  const fetchAvailableCoinSymbols = async () => {
    try {
      const response = await axios.get(`${API}/api/coins/enabled`);
      if (response.data.success && response.data.symbols.length > 0) {
        setAvailableCoinSymbols(response.data.symbols);
      }
    } catch (error) {
      console.error('Error fetching available coins:', error);
      // Keep default fallback
    }
  };


  // Golden Referral Functions
  window.activateGoldenReferral = async (userId) => {
    try {
      const adminId = JSON.parse(localStorage.getItem('admin_user'))?.admin_id || 'admin';
      const response = await axios.post(`${API}/api/admin/golden-referral/activate`, {
        user_id: userId,
        admin_id: adminId
      });
      
      if (response.data.success) {
        toast.success('Golden Referral VIP activated! User now earns 50% commission.');
        // Refresh search results
        document.getElementById('golden-search-input').value = '';
        document.getElementById('golden-search-results').style.display = 'none';
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast.error('Failed to activate Golden Referral');
    }
  };

  window.deactivateGoldenReferral = async (userId) => {
    if (!confirm('Are you sure you want to deactivate Golden VIP tier for this user?')) {
      return;
    }
    
    try {
      const adminId = JSON.parse(localStorage.getItem('admin_user'))?.admin_id || 'admin';
      const response = await axios.post(`${API}/api/admin/golden-referral/deactivate`, {
        user_id: userId,
        admin_id: adminId,
        reason: 'Admin deactivation'
      });
      
      if (response.data.success) {
        toast.success('Golden Referral VIP deactivated. User reverted to standard 20% commission.');
        // Reload the list
        document.querySelector('#golden-users-list').closest('div').querySelector('button').click();
      }
    } catch (error) {
      console.error('Deactivation error:', error);
      toast.error('Failed to deactivate Golden Referral');
    }
  };


  const fetchLiquidity = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/liquidity/balances`);
      if (response.data.success) {
        setLiquidityWallets(response.data.wallets);
      }
    } catch (error) {
      console.error('Error fetching liquidity:', error);
    }
  };

  const fetchFeeBalances = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/internal-balances`);
      if (response.data.success) {
        setFeeBalances(response.data.balances);
      }
    } catch (error) {
      console.error('Error fetching fee balances:', error);
    }
  };

  const fetchLiquidityHistory = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/liquidity/history`);
      if (response.data.success) {
        setLiquidityHistory(response.data.history);
      }
    } catch (error) {
      console.error('Error fetching liquidity history:', error);
    }
  };

  const fetchCustomerAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/customer-analytics`);
      if (response.data.success) {
        setCustomerAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
    }
  };

  const fetchTradingLiquidity = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/trading-liquidity`);
      if (response.data.success) {
        setTradingLiquidity(response.data.liquidity);
      }
    } catch (error) {
      console.error('Error fetching trading liquidity:', error);
      toast.error('Failed to fetch trading liquidity');
    }
  };

  const fetchRevenueSummary = async (period = 'day') => {
    try {
      // Use comprehensive dashboard API
      const response = await axios.get(`${API}/api/admin/revenue/dashboard?timeframe=${period}`);
      if (response.data.success) {
        // Map the new API response to existing state structure
        const data = response.data;
        setRevenueSummary({
          total_profit: data.summary.net_revenue_gbp, // Net revenue after referrals
          revenue_breakdown: {
            total_revenue: data.summary.total_revenue_gbp,
            referral_commissions: data.summary.referral_commissions_paid_gbp,
            // Map by fee type to breakdown
            ...data.by_fee_type.reduce((acc, fee) => {
              acc[fee.fee_type] = fee.total_revenue;
              return acc;
            }, {})
          },
          fee_wallet_breakdown: data.by_currency.reduce((acc, curr) => {
            acc[curr.currency] = {
              total_fees: curr.total_revenue,
              net_revenue: curr.net_revenue,
              referral_paid: curr.referral_paid,
              gbp_value: curr.total_revenue
            };
            return acc;
          }, {}),
          total_fee_wallet_gbp: data.summary.total_revenue_gbp
        });
        
        // Also set transactions
        setRevenueTransactions(data.recent_transactions || []);
      }
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
      toast.error('Failed to fetch revenue summary');
    }
  };

  const fetchRevenueTransactions = async (period = 'day', type = 'all') => {
    try {
      // This is now handled by fetchRevenueSummary
      // But keep the function for compatibility
      const response = await axios.get(`${API}/api/admin/revenue/dashboard?timeframe=${period}`);
      if (response.data.success && response.data.recent_transactions) {
        let transactions = response.data.recent_transactions;
        if (type !== 'all') {
          transactions = transactions.filter(tx => tx.fee_type === type);
        }
        setRevenueTransactions(transactions);
      }
    } catch (error) {
      console.error('Error fetching revenue transactions:', error);
      toast.error('Failed to fetch revenue transactions');
    }
  };

  const fetchMonetizationSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/monetization/settings`);
      if (response.data.success) {
        setMonetizationSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching monetization settings:', error);
      toast.error('Failed to load monetization settings');
    }
  };

  const updateMonetizationSettings = async (updates) => {
    try {
      const response = await axios.post(`${API}/api/admin/monetization/settings`, updates);
      if (response.data.success) {
        toast.success('Monetization settings updated successfully!');
        setMonetizationSettings(response.data.settings);
        setEditingMonetization(false);
      }
    } catch (error) {
      console.error('Error updating monetization settings:', error);
      toast.error('Failed to update monetization settings');
    }
  };

  const sendBroadcastMessage = async () => {
    if (!broadcastMessage.title || !broadcastMessage.content) {
      toast.error('Please enter title and message');
      return;
    }

    try {
      const response = await axios.post(`${API}/api/admin/broadcast-message`, broadcastMessage);
      if (response.data.success) {
        toast.success(`Message sent to ${response.data.messages_created} users!`);
        setShowBroadcastModal(false);
        setBroadcastMessage({ title: '', content: '', send_email: false });
      }
    } catch (error) {
      toast.error('Failed to send broadcast message');
      console.error('Error sending broadcast:', error);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/platform-settings`);
      if (response.data.success) {
        setPlatformSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    }
  };

  const updatePlatformSettings = async (newSettings) => {
    try {
      const response = await axios.post(`${API}/api/admin/platform-settings`, newSettings);
      if (response.data.success) {
        toast.success('Fee settings updated successfully!');
        fetchPlatformSettings();
        setShowFeeSettings(false);
      }
    } catch (error) {
      toast.error('Failed to update settings');
      console.error('Error updating settings:', error);
    }
  };

  const fetchData = async () => {

  const fetchSupportedCoins = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/cms/coins`);
      if (response.data.success) {
        setSupportedCoins(response.data.coins);
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
      toast.error('Failed to load coins');
    }
  };

  const toggleCoinStatus = async (symbol, enabled) => {
    try {
      const response = await axios.post(`${API}/api/admin/cms/coins/toggle`, { symbol, enabled });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchSupportedCoins();
      }
    } catch (error) {
      console.error('Error toggling coin:', error);
      toast.error('Failed to update coin status');
    }
  };

  const updateCoinConfig = async (symbol, updates) => {
    try {
      const response = await axios.post(`${API}/api/admin/cms/coins/update`, { symbol, ...updates });
      if (response.data.success) {
        toast.success(response.data.message);
        setEditingCoin(null);
        fetchSupportedCoins();
      }
    } catch (error) {
      console.error('Error updating coin:', error);
      toast.error('Failed to update coin configuration');
    }
  };

  const addNewCoin = async () => {
    try {
      if (!newCoin.symbol || !newCoin.name) {
        toast.error('Symbol and name are required');
        return;
      }
      const response = await axios.post(`${API}/api/admin/cms/coins/add`, newCoin);
      if (response.data.success) {
        toast.success(response.data.message);
        setAddCoinModal(false);
        setNewCoin({ symbol: '', name: '', nowpay_wallet_id: '' });
        fetchSupportedCoins();
      }
    } catch (error) {
      console.error('Error adding coin:', error);
      toast.error(error.response?.data?.detail || 'Failed to add coin');
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/banners`);
      if (response.data.success) {
        setBanners(response.data.banners);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast.error('Failed to load banners');
    }
  };

  const saveBanner = async () => {
    try {
      if (!newBanner.title || !newBanner.message) {
        toast.error('Title and message are required');
        return;
      }

      if (editingBanner) {
        const response = await axios.put(`${API}/api/admin/banners/${editingBanner.banner_id}`, newBanner);
        if (response.data.success) {
          toast.success('Banner updated successfully');
          setEditingBanner(null);
          setBannerModal(false);
          fetchBanners();
        }
      } else {
        const response = await axios.post(`${API}/api/admin/banners`, newBanner);
        if (response.data.success) {
          toast.success('Banner created successfully');
          setBannerModal(false);
          setNewBanner({
            title: '',
            message: '',
            type: 'info',
            link: '',
            link_text: '',
            start_date: new Date().toISOString().slice(0, 16),
            end_date: '',
            is_active: true
          });
          fetchBanners();
        }
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Failed to save banner');
    }
  };

  const deleteBanner = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      const response = await axios.delete(`${API}/api/admin/banners/${bannerId}`);
      if (response.data.success) {
        toast.success('Banner deleted successfully');
        fetchBanners();
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Failed to delete banner');
    }
  };

  const editBanner = (banner) => {
    setEditingBanner(banner);
    setNewBanner({
      title: banner.title,
      message: banner.message,
      type: banner.type,
      link: banner.link || '',
      link_text: banner.link_text || '',
      start_date: banner.start_date ? banner.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      end_date: banner.end_date ? banner.end_date.slice(0, 16) : '',
      is_active: banner.is_active
    });
    setBannerModal(true);
  };

    try {
      const [statsResp, customersResp, configResp, refConfigResp, refEarningsResp, disputesResp, signupsResp] = await Promise.all([
        axios.get(`${API}/api/admin/dashboard-stats`),
        axios.get(`${API}/api/admin/customers`),
        axios.get(`${API}/api/admin/platform-config`),
        axios.get(`${API}/api/admin/referral-config`),
        axios.get(`${API}/api/admin/referral-earnings`),
        axios.get(`${API}/api/admin/disputes/all`),
        axios.get(`${API}/api/admin/recent-signups?limit=20`)
      ]);
      
      fetchLiquidity();
      fetchFeeBalances();
      fetchLiquidityHistory();
      fetchCustomerAnalytics();
      fetchPlatformSettings();
      fetchTradingLiquidity();
      
      if (signupsResp.data.success) {
        setRecentSignups(signupsResp.data.signups);
      }
      
      // Fetch customer investments
      try {
        const investResp = await axios.get(`${API}/api/admin/customer-investments?limit=20`);
        if (investResp.data.success) {
          setCustomerInvestments(investResp.data.customers);
        }
      } catch (err) {
        console.log('Customer investments not available yet');
      }
      
      // UNIFIED DATA - Load progressively, not blocking
      // Platform summary first (fast, critical)
      axios.get(`${API}/api/unified/platform-summary`)
        .then(resp => {
          if (resp.data.success) {
            setUnifiedPlatformData(resp.data.data);
            console.log(`✅ Platform data loaded in ${resp.data.data.response_time_ms}ms`);
          }
        })
        .catch(err => console.error('Platform summary error:', err));
      
      // Users breakdown second (paginated, limit 20)
      axios.get(`${API}/api/unified/all-users-breakdown?limit=20`)
        .then(resp => {
          if (resp.data.success) {
            setUnifiedUsersData(resp.data.data);
            console.log(`✅ Users breakdown loaded in ${resp.data.response_time_ms}ms`);
          }
        })
        .catch(err => console.error('Users breakdown error:', err));
      fetchBanners();

      if (statsResp.data.success) {
        setStats(statsResp.data.stats);
      }

      if (customersResp.data.success) {
        setCustomers(customersResp.data.customers);
      }

      if (configResp.data.success) {
        setPlatformConfig(configResp.data);
      }

      if (refConfigResp.data.success) {
        setReferralConfig(refConfigResp.data.config);
      }

      if (refEarningsResp.data.success) {
        setReferralEarnings(refEarningsResp.data.earnings);
      }

      if (disputesResp.data.success) {
        setDisputes(disputesResp.data.disputes);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_user');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const handleUpdateCommission = async (settingKey, newValue) => {
    try {
      const resp = await axios.post(`${API}/api/admin/update-commission`, {
        setting_key: settingKey,
        new_value: parseFloat(newValue)
      });

      if (resp.data.success) {
        toast.success(resp.data.message);
        // Refresh config
        const configResp = await axios.get(`${API}/api/admin/platform-config`);
        if (configResp.data.success) {
          setPlatformConfig(configResp.data);
        }
        setEditingCommission(null);
      }
    } catch (error) {
      console.error('Error updating commission:', error);
      toast.error(error.response?.data?.detail || 'Failed to update commission');
    }
  };

  const handleUpdateReferralConfig = async (updates) => {
    try {
      const resp = await axios.post(`${API}/api/admin/update-referral-config`, updates);
      if (resp.data.success) {
        toast.success('Referral configuration updated successfully');
        setReferralConfig(resp.data.config);
      }
    } catch (error) {
      console.error('Error updating referral config:', error);
      toast.error(error.response?.data?.detail || 'Failed to update referral config');
    }
  };

  const handleMarkPaid = async (userId, amount) => {
    try {
      const resp = await axios.post(`${API}/api/admin/mark-referral-paid`, {
        user_id: userId,
        amount_paid: parseFloat(amount)
      });
      if (resp.data.success) {
        toast.success(resp.data.message);
        // Refresh earnings
        const refEarningsResp = await axios.get(`${API}/api/admin/referral-earnings`);
        if (refEarningsResp.data.success) {
          setReferralEarnings(refEarningsResp.data.earnings);
        }
      }
    } catch (error) {
      console.error('Error marking paid:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark as paid');
    }
  };

  const handleResolveDispute = async (disputeId, resolution) => {
    if (!window.confirm(`Are you sure you want to ${resolution === 'release_to_buyer' ? 'release crypto to buyer' : 'return crypto to seller'}?`)) {
      return;
    }

    const notes = prompt('Admin notes (optional):');
    
    try {
      const resp = await axios.post(`${API}/api/admin/resolve-dispute-final`, {
        dispute_id: disputeId,
        resolution: resolution,
        admin_notes: notes || ''
      });
      if (resp.data.success) {
        toast.success(resp.data.message);
        // Refresh disputes
        const disputesResp = await axios.get(`${API}/api/admin/disputes/all`);
        if (disputesResp.data.success) {
          setDisputes(disputesResp.data.disputes);
        }
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error(error.response?.data?.detail || 'Failed to resolve dispute');
    }
  };

  const handleSearch = async (type, query) => {
    try {
      if (type === 'users') {
        const resp = await axios.get(`${API}/api/admin/search/users?q=${query}`);
        if (resp.data.success) {
          setCustomers(resp.data.users);
        }
      } else if (type === 'trades') {
        const resp = await axios.get(`${API}/api/admin/search/trades?q=${query}`);
        if (resp.data.success) {
          // Handle trades display
          console.log('Trades:', resp.data.trades);
        }
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Search failed');
    }
  };

  const exportCustomers = () => {
    const csv = [
      ['Email', 'Name', 'Wallet', 'Balance', 'Deposited', 'Borrowed', 'Earned', 'Transactions', 'Created'].join(','),
      ...filteredCustomers.map(c => [
        c.email,
        c.full_name,
        c.wallet_address || 'N/A',
        c.wallet_balance,
        c.total_deposited,
        c.total_borrowed,
        c.total_earned,
        c.transaction_count,
        new Date(c.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Customers exported successfully');
  };

  const filteredCustomers = customers.filter(c =>
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-brand">
            <IoShield size={32} className="admin-icon" />
            <div>
              <h1 className="admin-brand-title">Admin Dashboard</h1>
              <p className="admin-brand-subtitle">Business Owner Portal</p>
            </div>
          </div>
          <div className="admin-actions">
            <Button 
              onClick={() => navigate('/admin/support')} 
              style={{
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                color: '#000',
                fontWeight: '700',
                padding: '0.75rem 1.5rem',
                marginRight: '1rem',
                cursor: 'pointer',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              💬 Support Chats
            </Button>
            <span className="admin-user-name">{admin?.full_name || admin?.email}</span>
            <Button variant="outline" onClick={handleLogout} className="logout-btn-admin">
              <IoLogOut size={20} />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="admin-content">
        {/* Stats Cards */}
        <div className="admin-stats-grid">
          <Card className="admin-stat-card">
            <div className="stat-card-content">
              <div className="stat-icon-admin users-icon">
                <IoPeople size={28} />
              </div>
              <div className="stat-details-admin">
                <p className="stat-label-admin">Total Customers</p>
                <p className="stat-value-admin">{stats?.users?.total_users || 0}</p>
                <p className="stat-change-admin">
                  {stats?.users?.total_registered || 0} registered + {stats?.users?.wallet_only || 0} wallet-only
                </p>
              </div>
            </div>
          </Card>

          <Card className="admin-stat-card">
            <div className="stat-card-content">
              <div className="stat-icon-admin volume-icon">
                <IoCash size={28} />
              </div>
              <div className="stat-details-admin">
                <p className="stat-label-admin">Total Volume</p>
                <p className="stat-value-admin">${(stats?.transactions?.total_volume || 0).toLocaleString()}</p>
                <p className="stat-change-admin">{stats?.transactions?.total_count || 0} transactions</p>
              </div>
            </div>
          </Card>

          <Card className="admin-stat-card">
            <div className="stat-card-content">
              <div className="stat-icon-admin revenue-icon">
                <IoTrendingUp size={28} />
              </div>
              <div className="stat-details-admin">
                <p className="stat-label-admin">Platform Revenue</p>
                <p className="stat-value-admin">${(stats?.revenue?.platform_fees || 0).toLocaleString()}</p>
                <p className="stat-change-admin positive">From fees & spreads</p>
              </div>
            </div>
          </Card>

          <Card className="admin-stat-card">
            <div className="stat-card-content">
              <div className="stat-icon-admin disputes-icon">
                <IoWarning size={28} />
              </div>
              <div className="stat-details-admin">
                <p className="stat-label-admin">Active Disputes</p>
                <p className="stat-value-admin">{stats?.disputes?.open_disputes || 0}</p>
                <p className="stat-change-admin">{stats?.disputes?.total_disputes || 0} total disputes</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Signups Section */}
        <Card style={{ 
          background: 'linear-gradient(135deg, #0A1929 0%, #1a2744 100%)', 
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '700', margin: 0 }}>
              🆕 Recent Signups
            </h2>
            <span style={{ color: '#8F9BB3', fontSize: '14px' }}>
              {recentSignups.length} latest users
            </span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>CLIENT ID</th>
                  <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>NAME</th>
                  <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>EMAIL</th>
                  <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>PHONE</th>
                  <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>VERIFIED</th>
                  <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>SIGNED UP</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.slice(0, 10).map((signup, index) => (
                  <tr key={signup.user_id} style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: index % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent'
                  }}>
                    <td style={{ color: '#FFA500', padding: '12px 8px', fontSize: '13px', fontWeight: '600' }}>
                      {signup.client_id}
                    </td>
                    <td style={{ color: '#E0E0E0', padding: '12px 8px', fontSize: '13px' }}>
                      {signup.full_name || 'N/A'}
                    </td>
                    <td style={{ color: '#E0E0E0', padding: '12px 8px', fontSize: '13px' }}>
                      {signup.email}
                    </td>
                    <td style={{ color: '#E0E0E0', padding: '12px 8px', fontSize: '13px' }}>
                      {signup.phone_number || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{ 
                          background: signup.email_verified ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: signup.email_verified ? '#22C55E' : '#EF4444',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {signup.email_verified ? '✓ Email' : '✗ Email'}
                        </span>
                        <span style={{ 
                          background: signup.phone_verified ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: signup.phone_verified ? '#22C55E' : '#EF4444',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {signup.phone_verified ? '✓ Phone' : '✗ Phone'}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: '#8F9BB3', padding: '12px 8px', fontSize: '12px' }}>
                      {signup.signup_timestamp ? new Date(signup.signup_timestamp).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {recentSignups.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8F9BB3' }}>
              No signups yet. New users will appear here.
            </div>
          )}
        </Card>

        {/* Customer Investments Section */}
        <Card style={{ 
          background: 'linear-gradient(135deg, #0A1929 0%, #1a2744 100%)', 
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ color: '#22C55E', fontSize: '20px', fontWeight: '700', margin: 0 }}>
              💰 Customer Investments
            </h2>
            <span style={{ color: '#8F9BB3', fontSize: '14px' }}>
              Total balance & deposits per customer
            </span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ color: '#22C55E', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>CLIENT ID</th>
                  <th style={{ color: '#22C55E', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>NAME</th>
                  <th style={{ color: '#22C55E', padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>EMAIL</th>
                  <th style={{ color: '#22C55E', padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>BALANCE (USD)</th>
                  <th style={{ color: '#22C55E', padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>DEPOSITED</th>
                  <th style={{ color: '#22C55E', padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>TRADES</th>
                </tr>
              </thead>
              <tbody>
                {customerInvestments.slice(0, 15).map((customer, index) => (
                  <tr key={customer.user_id} style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: index % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent'
                  }}>
                    <td style={{ color: '#FFA500', padding: '12px 8px', fontSize: '13px', fontWeight: '600' }}>
                      {customer.client_id}
                    </td>
                    <td style={{ color: '#E0E0E0', padding: '12px 8px', fontSize: '13px' }}>
                      {customer.full_name || 'N/A'}
                    </td>
                    <td style={{ color: '#E0E0E0', padding: '12px 8px', fontSize: '13px' }}>
                      {customer.email}
                    </td>
                    <td style={{ color: '#22C55E', padding: '12px 8px', fontSize: '13px', textAlign: 'right', fontWeight: '600' }}>
                      ${customer.total_balance_usd?.toLocaleString() || '0.00'}
                    </td>
                    <td style={{ color: '#00F0FF', padding: '12px 8px', fontSize: '13px', textAlign: 'right' }}>
                      ${customer.total_deposited?.toLocaleString() || '0.00'}
                    </td>
                    <td style={{ color: '#A855F7', padding: '12px 8px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>
                      {customer.total_trades || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {customerInvestments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8F9BB3' }}>
              No customer investment data yet.
            </div>
          )}
        </Card>

        {/* UNIFIED PLATFORM DATA - Single Source of Truth */}
        {unifiedPlatformData && (
          <Card style={{ 
            background: 'linear-gradient(135deg, #0A1929 0%, #1a2744 100%)', 
            border: '2px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#A855F7', fontSize: '22px', fontWeight: '700', margin: 0 }}>
                📊 Unified Platform Data (Single Source of Truth)
              </h2>
              <span style={{ 
                background: 'rgba(34, 197, 94, 0.2)', 
                color: '#22C55E', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '12px',
                fontWeight: '600'
              }}>
                ✓ LOCKED & SYNCED
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                <p style={{ color: '#8F9BB3', fontSize: '12px', marginBottom: '4px' }}>TOTAL USERS</p>
                <p style={{ color: '#00F0FF', fontSize: '28px', fontWeight: '700', margin: 0 }}>{unifiedPlatformData.users?.total || 0}</p>
                <p style={{ color: '#22C55E', fontSize: '11px', marginTop: '4px' }}>{unifiedPlatformData.users?.verified_email || 0} verified</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <p style={{ color: '#8F9BB3', fontSize: '12px', marginBottom: '4px' }}>TOTAL PLATFORM VALUE</p>
                <p style={{ color: '#22C55E', fontSize: '28px', fontWeight: '700', margin: 0 }}>${unifiedPlatformData.total_platform_usd?.toLocaleString() || '0'}</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 165, 0, 0.2)' }}>
                <p style={{ color: '#8F9BB3', fontSize: '12px', marginBottom: '4px' }}>TOTAL DEPOSITS</p>
                <p style={{ color: '#FFA500', fontSize: '28px', fontWeight: '700', margin: 0 }}>${unifiedPlatformData.volume?.total_deposits_usd?.toLocaleString() || '0'}</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ color: '#8F9BB3', fontSize: '12px', marginBottom: '4px' }}>TOTAL WITHDRAWALS</p>
                <p style={{ color: '#EF4444', fontSize: '28px', fontWeight: '700', margin: 0 }}>${unifiedPlatformData.volume?.total_withdrawals_usd?.toLocaleString() || '0'}</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <p style={{ color: '#8F9BB3', fontSize: '12px', marginBottom: '4px' }}>FEES COLLECTED</p>
                <p style={{ color: '#A855F7', fontSize: '28px', fontWeight: '700', margin: 0 }}>${unifiedPlatformData.volume?.total_fees_collected_usd?.toLocaleString() || '0'}</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                <p style={{ color: '#8F9BB3', fontSize: '12px', marginBottom: '4px' }}>P2P TRADES</p>
                <p style={{ color: '#00F0FF', fontSize: '28px', fontWeight: '700', margin: 0 }}>{unifiedPlatformData.p2p?.total_trades || 0}</p>
                <p style={{ color: '#FFA500', fontSize: '11px', marginTop: '4px' }}>{unifiedPlatformData.p2p?.active_trades || 0} active</p>
              </div>
            </div>
            
            <p style={{ color: '#8F9BB3', fontSize: '11px', textAlign: 'center', margin: 0 }}>
              Data source: /api/unified/platform-summary • Last updated: {new Date(unifiedPlatformData.timestamp).toLocaleString()}
            </p>
          </Card>
        )}

        {/* UNIFIED USERS BREAKDOWN - Single Source of Truth */}
        {unifiedUsersData.length > 0 && (
          <Card style={{ 
            background: 'linear-gradient(135deg, #0A1929 0%, #1a2744 100%)', 
            border: '2px solid rgba(0, 240, 255, 0.5)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                👥 Customer Financial Breakdown (Unified)
              </h2>
              <span style={{ 
                background: 'rgba(34, 197, 94, 0.2)', 
                color: '#22C55E', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '12px',
                fontWeight: '600'
              }}>
                ✓ SYNCED
              </span>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'left', fontSize: '11px' }}>CLIENT ID</th>
                    <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'left', fontSize: '11px' }}>EMAIL</th>
                    <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'right', fontSize: '11px' }}>BALANCE (USD)</th>
                    <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'right', fontSize: '11px' }}>DEPOSITS</th>
                    <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'right', fontSize: '11px' }}>WITHDRAWALS</th>
                    <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'right', fontSize: '11px' }}>FEES PAID</th>
                    <th style={{ color: '#00F0FF', padding: '12px 8px', textAlign: 'center', fontSize: '11px' }}>P2P TRADES</th>
                  </tr>
                </thead>
                <tbody>
                  {unifiedUsersData.slice(0, 15).map((user, index) => (
                    <tr key={user.user_id} style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: index % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent'
                    }}>
                      <td style={{ color: '#FFA500', padding: '10px 8px', fontSize: '12px', fontWeight: '600' }}>{user.client_id}</td>
                      <td style={{ color: '#E0E0E0', padding: '10px 8px', fontSize: '12px' }}>{user.email}</td>
                      <td style={{ color: '#22C55E', padding: '10px 8px', fontSize: '12px', textAlign: 'right', fontWeight: '600' }}>
                        ${user.total_balance_usd?.toLocaleString() || '0'}
                      </td>
                      <td style={{ color: '#00F0FF', padding: '10px 8px', fontSize: '12px', textAlign: 'right' }}>
                        ${user.activity?.deposits?.total_usd?.toLocaleString() || '0'}
                      </td>
                      <td style={{ color: '#EF4444', padding: '10px 8px', fontSize: '12px', textAlign: 'right' }}>
                        ${user.activity?.withdrawals?.total_usd?.toLocaleString() || '0'}
                      </td>
                      <td style={{ color: '#A855F7', padding: '10px 8px', fontSize: '12px', textAlign: 'right' }}>
                        ${user.activity?.fees_paid?.total_usd?.toLocaleString() || '0'}
                      </td>
                      <td style={{ color: '#00F0FF', padding: '10px 8px', fontSize: '12px', textAlign: 'center' }}>
                        {user.p2p_stats?.total_trades || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <p style={{ color: '#8F9BB3', fontSize: '11px', textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
              Data source: /api/unified/all-users-breakdown • Single source of truth for all pages
            </p>
          </Card>
        )}

        {/* Commission & Fee Settings */}
        <Card className="commission-settings-card" style={{ marginBottom: '2rem' }}>
          <div className="table-header">
            <div>
              <h2 className="table-title">Commission & Fee Settings</h2>
              <p className="table-subtitle">Adjust platform fees and rates</p>
            </div>
          </div>
          <div className="commission-grid">
            {platformConfig?.editable_settings?.map((setting) => (
              <div key={setting.key} className="commission-item">
                <div className="commission-info">
                  <p className="commission-label">{setting.label}</p>
                  {editingCommission === setting.key ? (
                    <div className="commission-edit">
                      <Input
                        type="number"
                        step="0.1"
                        defaultValue={setting.value}
                        id={`edit-${setting.key}`}
                        className="commission-input"
                        style={{ width: '120px' }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const newValue = document.getElementById(`edit-${setting.key}`).value;
                          handleUpdateCommission(setting.key, newValue);
                        }}
                        className="save-commission-btn"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCommission(null)}
                        className="cancel-commission-btn"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="commission-display">
                      <p className="commission-value">{setting.value}%</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCommission(setting.key)}
                        className="edit-commission-btn"
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid rgba(0, 240, 255, 0.2)', paddingBottom: '0' }}>
          <button
            onClick={() => setActiveTab('unified')}
            style={{
              padding: '1rem 1.5rem',
              background: activeTab === 'unified' ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(168, 85, 247, 0.2))' : 'none',
              border: 'none',
              borderBottom: activeTab === 'unified' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'unified' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s',
              borderRadius: '8px 8px 0 0'
            }}
          >
            🏠 Business Dashboard
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'overview' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'referrals' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'referrals' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Referral System
          </button>
          <button
            onClick={() => setActiveTab('golden-referrals')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'golden-referrals' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'golden-referrals' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            🌟 Golden VIP
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'disputes' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'disputes' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Disputes {disputes.filter(d => d.status === 'open').length > 0 && `(${disputes.filter(d => d.status === 'open').length})`}
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'customers' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'customers' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Customers
          </button>
          <button
            onClick={() => setActiveTab('liquidity')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'liquidity' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'liquidity' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Liquidity Wallet
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'withdrawals' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'withdrawals' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Withdrawals
          </button>
          <button
            onClick={() => setActiveTab('trading')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'trading' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'trading' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Trading
          </button>
          <button
            onClick={() => {
              setActiveTab('revenue');
              fetchRevenueSummary(revenuePeriod);
              fetchRevenueTransactions(revenuePeriod, revenueFilter);
            }}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'revenue' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'revenue' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Revenue
          </button>

          <button
            onClick={() => setActiveTab('coins')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'coins' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'coins' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Coins (CMS)
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'banners' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'banners' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Promo Banners
          </button>

          <button
            onClick={() => {
              setActiveTab('monetization');
              fetchMonetizationSettings();
            }}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'monetization' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'monetization' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            💰 Monetization
          </button>

          <button
            onClick={() => setActiveTab('platform-wallet')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'platform-wallet' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'platform-wallet' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Admin Top-Up Wallet
          </button>

          <button
            onClick={() => setActiveTab('support-chat')}
            style={{
              padding: '1rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'support-chat' ? '3px solid #00F0FF' : '3px solid transparent',
              color: activeTab === 'support-chat' ? '#00F0FF' : '#888',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Support Chat
          </button>

        </div>

        {/* UNIFIED BUSINESS DASHBOARD - ALL IN ONE */}
        {activeTab === 'unified' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Top Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {/* Total Platform Revenue */}
              <Card style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))', border: '2px solid rgba(34, 197, 94, 0.3)', borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Platform Revenue</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#22C55E', marginBottom: '0.5rem' }}>
                  ${((Array.isArray(feeBalances) ? feeBalances.reduce((sum, b) => sum + (b.total_fees || 0) * 45000, 0) : 0)).toLocaleString()}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>All-time earnings</div>
              </Card>

              {/* Today's Activity */}
              <Card style={{ background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.05))', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Today's Activity</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
                  {stats?.transactions?.total_count || 0}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>Total trades</div>
              </Card>

              {/* Total Users */}
              <Card style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.05))', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Users</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7', marginBottom: '0.5rem' }}>
                  {stats?.users?.total_users || 0}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>Registered accounts</div>
              </Card>

              {/* Active Disputes */}
              <Card style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))', border: '2px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Active Disputes</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#EF4444', marginBottom: '0.5rem' }}>
                  {disputes.filter(d => d.status === 'open').length}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>Need attention</div>
              </Card>
            </div>

            {/* Earnings Breakdown - ALL CRYPTOS */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(34, 197, 94, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: '#22C55E', fontSize: '24px', fontWeight: '900', margin: 0 }}>
                  💰 Your Earnings Breakdown
                </h2>
                <div style={{ fontSize: '14px', color: '#888' }}>
                  Total: ${((Array.isArray(feeBalances) ? feeBalances.reduce((sum, b) => sum + (b.total_fees || 0) * 45000, 0) : 0)).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {feeBalances.length > 0 ? feeBalances.map(balance => (
                  <div
                    key={balance.currency}
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))',
                      border: '2px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '32px', opacity: '0.1' }}>
                      {balance.currency === 'BTC' ? '₿' : balance.currency === 'ETH' ? 'Ξ' : '₮'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>
                      {balance.currency} Fees
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#22C55E', marginBottom: '0.5rem' }}>
                      {(balance.total_fees || 0).toFixed(8)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '1rem' }}>
                      ≈ ${((balance.total_fees || 0) * 45000).toLocaleString()}
                    </div>
                    <Button
                      onClick={() => setConfirmWithdrawal({
                        currency: balance.currency,
                        amount: balance.total_fees,
                        wallet_type: 'fee_wallet',
                        address: withdrawalAddresses[balance.currency]
                      })}
                      disabled={!withdrawalAddresses[balance.currency] || (balance.total_fees || 0) === 0}
                      style={{
                        width: '100%',
                        background: withdrawalAddresses[balance.currency] && (balance.total_fees || 0) > 0
                          ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                          : 'rgba(34, 197, 94, 0.3)',
                        color: '#fff',
                        fontWeight: '700',
                        padding: '0.75rem',
                        borderRadius: '8px'
                      }}
                    >
                      💸 Withdraw {balance.currency}
                    </Button>
                  </div>
                )) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#888' }}>
                    No earnings yet. Earnings will appear here as users trade on your platform.
                  </div>
                )}
              </div>

              {/* Withdrawal Addresses Quick Setup */}
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#00F0FF', marginBottom: '1rem' }}>
                  💡 Set Your Withdrawal Addresses
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  {availableCoinSymbols.map(currency => (
                    <div key={currency} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: '#888', fontSize: '14px', minWidth: '60px' }}>{currency}:</span>
                      <input
                        type="text"
                        placeholder={`Your ${currency} address`}
                        value={withdrawalAddresses[currency] || ''}
                        onChange={(e) => setWithdrawalAddresses({...withdrawalAddresses, [currency]: e.target.value})}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Fee Configuration */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ color: '#A855F7', fontSize: '20px', fontWeight: '700', margin: 0, marginBottom: '0.5rem' }}>
                    ⚙️ Fee Configuration
                  </h2>
                  <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                    Manage platform fees and commissions
                  </p>
                </div>
                <Button
                  onClick={() => setShowFeeSettings(true)}
                  style={{
                    background: 'linear-gradient(135deg, #A855F7, #8B5CF6)',
                    color: '#fff',
                    fontWeight: '700',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Edit Fees
                </Button>
              </div>
              
              {platformSettings && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>SWAP FEE</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#A855F7' }}>
                      {platformSettings.swap_fee_percent || 1.5}%
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>EXPRESS BUY FEE</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#A855F7' }}>
                      {platformSettings.express_buy_fee_percent || 3}%
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>P2P TRADE FEE</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#A855F7' }}>
                      {platformSettings.p2p_trade_fee_percent || 1}%
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>REFERRAL COMMISSION</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#A855F7' }}>
                      {platformSettings.referral_commission_percent || 20}%
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>PAYMENT TIMER</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#A855F7' }}>
                      {Math.floor((platformSettings.payment_timer_minutes || 120) / 60)}h {(platformSettings.payment_timer_minutes || 120) % 60}m
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Quick Actions Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Add Liquidity Quick Action */}
              <Card 
                onClick={() => {
                  setAddLiquidityModal(true);
                  setActiveTab('liquidity');
                }}
                style={{ 
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 200, 255, 0.05))', 
                  border: '2px solid rgba(0, 240, 255, 0.3)', 
                  borderRadius: '16px', 
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '1rem' }}>💧</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>Add Liquidity</div>
                <div style={{ fontSize: '14px', color: '#888' }}>Top up Express Buy funds</div>
              </Card>

              {/* View Customers */}
              <Card 
                onClick={() => setActiveTab('customers')}
                style={{ 
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.05))', 
                  border: '2px solid rgba(168, 85, 247, 0.3)', 
                  borderRadius: '16px', 
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '1rem' }}>👥</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#A855F7', marginBottom: '0.5rem' }}>View Customers</div>
                <div style={{ fontSize: '14px', color: '#888' }}>{customers.length} total users</div>
              </Card>

              {/* Handle Disputes */}
              <Card 
                onClick={() => setActiveTab('disputes')}
                style={{ 
                  background: disputes.filter(d => d.status === 'open').length > 0 
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))' 
                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))', 
                  border: disputes.filter(d => d.status === 'open').length > 0 
                    ? '2px solid rgba(239, 68, 68, 0.3)' 
                    : '2px solid rgba(34, 197, 94, 0.3)', 
                  borderRadius: '16px', 
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '1rem' }}>
                  {disputes.filter(d => d.status === 'open').length > 0 ? '⚠️' : '✅'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: disputes.filter(d => d.status === 'open').length > 0 ? '#EF4444' : '#22C55E', marginBottom: '0.5rem' }}>
                  Disputes
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>
                  {disputes.filter(d => d.status === 'open').length} active disputes
                </div>
              </Card>
            </div>

            {/* Platform Health */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
                🏥 Platform Health
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* Liquidity Status */}
                <div style={{ padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>LIQUIDITY STATUS</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: liquidityWallets.some(w => w.available < 0.1) ? '#EF4444' : '#22C55E' }}>
                    {liquidityWallets.some(w => w.available < 0.1) ? '⚠️ Low' : '✅ Good'}
                  </div>
                </div>

                {/* Email Service */}
                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>EMAIL SERVICE</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#22C55E' }}>
                    ✅ Active
                  </div>
                </div>

                {/* System Status */}
                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>SYSTEM STATUS</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#22C55E' }}>
                    ✅ Online
                  </div>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <h2 style={{ color: '#A855F7', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
                📊 Quick Stats
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#A855F7', marginBottom: '0.5rem' }}>
                    ${(stats?.transactions?.total_volume || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Total Volume</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
                    {liquidityWallets.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Crypto Pairs</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#22C55E', marginBottom: '0.5rem' }}>
                    {customers.filter(c => c.created_at && new Date(c.created_at) > new Date(Date.now() - 24*60*60*1000)).length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>New Users (24h)</div>
                </div>
              </div>
            </Card>

            {/* Marketing Broadcast System - Redesigned */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '700', margin: 0, marginBottom: '0.5rem' }}>
                    📢 Broadcast Messaging
                  </h2>
                  <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                    Send announcements to all users
                  </p>
                </div>
                <Button
                  onClick={() => setShowBroadcastModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    color: '#000',
                    fontWeight: '700',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + New Message
                </Button>
              </div>
            </Card>

            {/* Customer Analytics */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
                🌍 Customer Analytics
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {/* Registration Sources */}
                <div style={{ padding: '1.5rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '1rem', textTransform: 'uppercase' }}>Registration Sources</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#fff' }}>🔗 Referrals:</span>
                    <span style={{ color: '#00F0FF', fontWeight: '700' }}>{customerAnalytics?.sources?.referral || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fff' }}>🌐 Organic:</span>
                    <span style={{ color: '#22C55E', fontWeight: '700' }}>{customerAnalytics?.sources?.organic || 0}</span>
                  </div>
                </div>

                {/* Top Referrers */}
                <div style={{ padding: '1.5rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '1rem', textTransform: 'uppercase' }}>Top Referrers</div>
                  {customerAnalytics?.top_referrers?.slice(0, 3).map((referrer, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#fff' }}>#{index + 1}:</span>
                      <span style={{ color: '#A855F7', fontWeight: '700' }}>{referrer.referrals} users</span>
                    </div>
                  )) || <div style={{ color: '#888', fontSize: '13px' }}>No referrals yet</div>}
                </div>

                {/* Geographic Distribution */}
                <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '1rem', textTransform: 'uppercase' }}>Geographic Distribution</div>
                  {customerAnalytics?.countries && Object.entries(customerAnalytics.countries).slice(0, 3).map(([country, count], index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#fff' }}>🌍 {country}:</span>
                      <span style={{ color: '#22C55E', fontWeight: '700' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* All Liquidity Levels */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
                💧 Liquidity Levels (All Coins)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {liquidityWallets.length > 0 ? liquidityWallets.map(wallet => {
                  const isLow = wallet.available < 0.1;
                  return (
                    <div
                      key={wallet.currency}
                      style={{
                        padding: '1.5rem',
                        background: isLow ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0, 240, 255, 0.05)',
                        borderRadius: '12px',
                        border: `2px solid ${isLow ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 240, 255, 0.3)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{wallet.currency}</span>
                        {isLow && <span style={{ fontSize: '20px' }}>⚠️</span>}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: isLow ? '#EF4444' : '#00F0FF', marginBottom: '0.5rem' }}>
                        {wallet.available?.toFixed(8) || '0.00000000'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        Available: {wallet.available?.toFixed(4) || '0'}<br/>
                        Reserved: {(wallet.reserved || 0).toFixed(4)}
                      </div>
                      {isLow && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: '700' }}>LOW LIQUIDITY</div>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#888' }}>
                    No liquidity wallets found. Add liquidity to get started.
                  </div>
                )}
              </div>
            </Card>

          </div>
        )}

        {/* Broadcast Message Modal */}
        {showBroadcastModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1f3a, #0a0f1e)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}>
              <h2 style={{ color: '#00F0FF', fontSize: '22px', fontWeight: '700', marginBottom: '1.5rem' }}>
                📢 Send Broadcast Message
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Message Title
                </label>
                <input
                  type="text"
                  value={broadcastMessage.title}
                  onChange={(e) => setBroadcastMessage({...broadcastMessage, title: e.target.value})}
                  placeholder="e.g., New Features Available!"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.border = '1px solid rgba(0, 240, 255, 0.6)'}
                  onBlur={(e) => e.target.style.border = '1px solid rgba(0, 240, 255, 0.3)'}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Message Content
                </label>
                <textarea
                  value={broadcastMessage.content}
                  onChange={(e) => setBroadcastMessage({...broadcastMessage, content: e.target.value})}
                  placeholder="Enter your message here..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '15px',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.border = '1px solid rgba(0, 240, 255, 0.6)'}
                  onBlur={(e) => e.target.style.border = '1px solid rgba(0, 240, 255, 0.3)'}
                />
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={broadcastMessage.send_email}
                  onChange={(e) => setBroadcastMessage({...broadcastMessage, send_email: e.target.checked})}
                  style={{ width: '20px', height: '20px' }}
                />
                <label style={{ color: '#fff', fontSize: '14px' }}>
                  Also send via email
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button
                  onClick={sendBroadcastMessage}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    color: '#000',
                    fontWeight: '700',
                    padding: '0.875rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '15px'
                  }}
                >
                  📤 Send Message
                </Button>
                <Button
                  onClick={() => {
                    setShowBroadcastModal(false);
                    setBroadcastMessage({ title: '', content: '', send_email: false });
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontWeight: '600',
                    padding: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    fontSize: '15px'
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fee Settings Modal */}
        {showFeeSettings && platformSettings && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1f3a, #0a0f1e)',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%'
            }}>
              <h2 style={{ color: '#A855F7', fontSize: '22px', fontWeight: '700', marginBottom: '1.5rem' }}>
                ⚙️ Edit Platform Fees
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Swap Fee */}
                <div>
                  <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Coin Swap Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={platformSettings.swap_fee_percent || 1.5}
                    onChange={(e) => setPlatformSettings({...platformSettings, swap_fee_percent: parseFloat(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Express Buy Fee */}
                <div>
                  <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Express Buy Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={platformSettings.express_buy_fee_percent || 3}
                    onChange={(e) => setPlatformSettings({...platformSettings, express_buy_fee_percent: parseFloat(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* P2P Trade Fee */}
                <div>
                  <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    P2P Trade Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={platformSettings.p2p_trade_fee_percent || 1}
                    onChange={(e) => setPlatformSettings({...platformSettings, p2p_trade_fee_percent: parseFloat(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '0.5rem' }}>
                    💡 Applied to all P2P trades (normal and Fast Payment)
                  </div>
                </div>

                {/* Per-Coin Express Buy Fees */}
                <div style={{ 
                  background: 'rgba(168, 85, 247, 0.05)', 
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <label style={{ color: '#A855F7', fontSize: '14px', display: 'block', marginBottom: '1rem', fontWeight: '700' }}>
                    ⚡ Per-Coin Express Buy Fee Overrides (Optional)
                  </label>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '1rem', lineHeight: '1.6' }}>
                    Set custom Express Buy fees for specific coins. Leave blank to use the global fee ({platformSettings.express_buy_fee_percent || 3}%).
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                    {availableCoinSymbols.map(coin => (
                      <div key={coin}>
                        <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '0.3rem' }}>
                          {coin}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={`${platformSettings.express_buy_fee_percent || 3}%`}
                          value={platformSettings.express_buy_fees_by_coin?.[coin] || ''}
                          onChange={(e) => {
                            const newFees = { ...(platformSettings.express_buy_fees_by_coin || {}) };
                            if (e.target.value === '') {
                              delete newFees[coin];
                            } else {
                              newFees[coin] = parseFloat(e.target.value);
                            }
                            setPlatformSettings({...platformSettings, express_buy_fees_by_coin: newFees});
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Express Buy Supported Coins Management */}
                <div style={{ 
                  background: 'rgba(34, 197, 94, 0.05)', 
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <label style={{ color: '#22C55E', fontSize: '14px', display: 'block', marginBottom: '1rem', fontWeight: '700' }}>
                    ⚡ Manage Express Buy Supported Coins
                  </label>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '1rem', lineHeight: '1.6' }}>
                    Add or remove coins available for Express Buy. Changes apply immediately to the Express Buy page.
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {availableCoinSymbols.map(coin => (
                      <button
                        key={coin}
                        onClick={() => {
                          const currentCoins = platformSettings.express_buy_supported_coins || [];
                          if (currentCoins.includes(coin)) {
                            setPlatformSettings({
                              ...platformSettings, 
                              express_buy_supported_coins: currentCoins.filter(c => c !== coin)
                            });
                          } else {
                            setPlatformSettings({
                              ...platformSettings, 
                              express_buy_supported_coins: [...currentCoins, coin]
                            });
                          }
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: (platformSettings.express_buy_supported_coins || []).includes(coin)
                            ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                            : 'rgba(0, 0, 0, 0.4)',
                          border: (platformSettings.express_buy_supported_coins || []).includes(coin)
                            ? '2px solid rgba(34, 197, 94, 0.6)'
                            : '2px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {coin} {(platformSettings.express_buy_supported_coins || []).includes(coin) ? '✓' : '+'}
                      </button>
                    ))}
                  </div>
                  
                  <div style={{ 
                    padding: '0.75rem', 
                    background: 'rgba(34, 197, 94, 0.1)', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#22C55E'
                  }}>
                    <strong>Selected ({(platformSettings.express_buy_supported_coins || []).length} coins):</strong> {
                      (platformSettings.express_buy_supported_coins || []).join(', ') || 'None'
                    }
                  </div>
                </div>

                {/* Referral Commission */}
                <div>
                  <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Referral Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={platformSettings.referral_commission_percent || 20}
                    onChange={(e) => setPlatformSettings({...platformSettings, referral_commission_percent: parseFloat(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Payment Timer */}
                <div>
                  <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Payment Timer (minutes)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={platformSettings.payment_timer_minutes || 120}
                    onChange={(e) => setPlatformSettings({...platformSettings, payment_timer_minutes: parseInt(e.target.value)})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>
                    Time buyers have to complete payment (current: {Math.floor((platformSettings.payment_timer_minutes || 120) / 60)}h {(platformSettings.payment_timer_minutes || 120) % 60}m)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <Button
                  onClick={() => updatePlatformSettings(platformSettings)}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #A855F7, #8B5CF6)',
                    color: '#fff',
                    fontWeight: '700',
                    padding: '0.875rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '15px'
                  }}
                >
                  💾 Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setShowFeeSettings(false);
                    fetchPlatformSettings(); // Reset to saved values
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontWeight: '600',
                    padding: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    fontSize: '15px'
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Referral System Tab */}
        {activeTab === 'referrals' && (
          <>
            {/* Referral Configuration */}
            <Card style={{ marginBottom: '2rem', background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
                Referral Configuration
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                    Referrer Commission (%)
                  </label>
                  <input
                    type="number"
                    defaultValue={referralConfig?.referrer_commission_percent || 20}
                    onBlur={(e) => {
                      if (e.target.value !== referralConfig?.referrer_commission_percent.toString()) {
                        handleUpdateReferralConfig({ referrer_commission_percent: parseFloat(e.target.value) });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem' }}>
                    Referrers earn this % of platform fees from referred users
                  </p>
                </div>

                <div>
                  <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                    Commission Duration (Months)
                  </label>
                  <input
                    type="number"
                    defaultValue={referralConfig?.commission_duration_months || 12}
                    onBlur={(e) => {
                      if (e.target.value !== referralConfig?.commission_duration_months.toString()) {
                        handleUpdateReferralConfig({ commission_duration_months: parseInt(e.target.value) });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem' }}>
                    How long referrers earn commissions per user
                  </p>
                </div>

                <div>
                  <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                    Referred User Discount (%)
                  </label>
                  <input
                    type="number"
                    defaultValue={referralConfig?.referred_user_fee_discount_percent || 100}
                    onBlur={(e) => {
                      if (e.target.value !== referralConfig?.referred_user_fee_discount_percent.toString()) {
                        handleUpdateReferralConfig({ referred_user_fee_discount_percent: parseFloat(e.target.value) });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem' }}>
                    Fee discount for new referred users (100% = 0% fees)
                  </p>
                </div>

                <div>
                  <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                    Discount Duration (Days)
                  </label>
                  <input
                    type="number"
                    defaultValue={referralConfig?.fee_discount_duration_days || 30}
                    onBlur={(e) => {
                      if (e.target.value !== referralConfig?.fee_discount_duration_days.toString()) {
                        handleUpdateReferralConfig({ fee_discount_duration_days: parseInt(e.target.value) });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem' }}>
                    How long referred users get discounted fees
                  </p>
                </div>
              </div>
            </Card>

            {/* Referral Earnings Table */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
                Referral Earnings & Payouts
              </h2>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(0, 240, 255, 0.3)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>User</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Email</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Total Earned</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Paid</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Unpaid</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralEarnings && referralEarnings.length > 0 ? (
                      referralEarnings.map((earning) => (
                        <tr key={earning.user_id} style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.1)' }}>
                          <td style={{ padding: '1rem', color: '#fff', fontSize: '14px' }}>{earning.full_name}</td>
                          <td style={{ padding: '1rem', color: '#888', fontSize: '14px' }}>{earning.email}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
                            ${earning.total_earned.toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#22C55E', fontSize: '14px' }}>
                            ${earning.paid_amount.toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#F59E0B', fontSize: '14px', fontWeight: '600' }}>
                            ${earning.unpaid_amount.toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              background: earning.payout_status === 'paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: earning.payout_status === 'paid' ? '#22C55E' : '#F59E0B',
                              border: earning.payout_status === 'paid' ? '1px solid #22C55E' : '1px solid #F59E0B'
                            }}>
                              {earning.payout_status === 'paid' ? 'PAID' : 'PENDING'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {earning.unpaid_amount > 0 && (
                              <button
                                onClick={() => {
                                  const amount = prompt(`Enter amount to mark as paid for ${earning.full_name}:`, earning.unpaid_amount.toFixed(2));
                                  if (amount && parseFloat(amount) > 0) {
                                    handleMarkPaid(earning.user_id, amount);
                                  }
                                }}
                                style={{
                                  padding: '6px 16px',
                                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#000',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                          No referral earnings yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <>
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '0.5rem' }}>
                    Dispute Management
                  </h2>
                  <p style={{ color: '#888', fontSize: '14px' }}>
                    Review and resolve all P2P trade disputes
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setDisputeFilter('all')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: disputeFilter === 'all' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 240, 255, 0.05)',
                      border: `1px solid ${disputeFilter === 'all' ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                      borderRadius: '8px',
                      color: disputeFilter === 'all' ? '#00F0FF' : '#888',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDisputeFilter('open')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: disputeFilter === 'open' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.05)',
                      border: `1px solid ${disputeFilter === 'open' ? '#F59E0B' : 'rgba(245, 158, 11, 0.2)'}`,
                      borderRadius: '8px',
                      color: disputeFilter === 'open' ? '#F59E0B' : '#888',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => setDisputeFilter('resolved')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: disputeFilter === 'resolved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.05)',
                      border: `1px solid ${disputeFilter === 'resolved' ? '#22C55E' : 'rgba(34, 197, 94, 0.2)'}`,
                      borderRadius: '8px',
                      color: disputeFilter === 'resolved' ? '#22C55E' : '#888',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(0, 240, 255, 0.3)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Dispute ID</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Trade ID</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Buyer</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Seller</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Amount</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Opened By</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disputes && disputes.filter(d => disputeFilter === 'all' || d.status === disputeFilter).length > 0 ? (
                      disputes.filter(d => disputeFilter === 'all' || d.status === disputeFilter).map((dispute) => (
                        <tr key={dispute.dispute_id} style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.1)' }}>
                          <td style={{ padding: '1rem', color: '#888', fontSize: '13px', fontFamily: 'monospace' }}>
                            {dispute.dispute_id?.substring(0, 8)}...
                          </td>
                          <td style={{ padding: '1rem', color: '#888', fontSize: '13px', fontFamily: 'monospace' }}>
                            {dispute.trade_id?.substring(0, 8)}...
                          </td>
                          <td style={{ padding: '1rem', color: '#fff', fontSize: '14px' }}>
                            {dispute.buyer?.email || 'N/A'}
                          </td>
                          <td style={{ padding: '1rem', color: '#fff', fontSize: '14px' }}>
                            {dispute.seller?.email || 'N/A'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>
                            {dispute.trade?.crypto_amount} {dispute.trade?.crypto_currency}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              background: dispute.status === 'resolved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: dispute.status === 'resolved' ? '#22C55E' : '#F59E0B',
                              border: dispute.status === 'resolved' ? '1px solid #22C55E' : '1px solid #F59E0B'
                            }}>
                              {dispute.status?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                            {dispute.opened_by}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {dispute.status === 'open' ? (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleResolveDispute(dispute.dispute_id, 'release_to_buyer')}
                                  style={{
                                    padding: '6px 12px',
                                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  → Buyer
                                </button>
                                <button
                                  onClick={() => handleResolveDispute(dispute.dispute_id, 'return_to_seller')}
                                  style={{
                                    padding: '6px 12px',
                                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  → Seller
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#666', fontSize: '12px' }}>
                                {dispute.resolution === 'release_to_buyer' ? '✓ Released to Buyer' : '✓ Returned to Seller'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                          No {disputeFilter !== 'all' ? disputeFilter : ''} disputes found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}


        {/* Golden Referrals VIP Tier Management */}
        {activeTab === 'golden-referrals' && (
          <div>
            <Card style={{ marginBottom: '2rem', background: 'rgba(255, 215, 0, 0.05)', border: '2px solid rgba(255, 215, 0, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '32px' }}>🌟</span>
                <div>
                  <h2 style={{ color: '#FFD700', fontSize: '24px', fontWeight: '900', marginBottom: '0.5rem' }}>
                    Golden Referral VIP Tier
                  </h2>
                  <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                    Premium tier: 50% commission on all fees (P2P, Swap, Withdrawal, Express Buy)
                  </p>
                </div>
              </div>
              
              <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <p style={{ color: '#FFD700', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                  ⚠️ <strong>Admin Only:</strong> This VIP tier is hidden from public view and manually assigned. 
                  Users see earnings but not the tier name.
                </p>
              </div>

              {/* Search & Add User */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700', marginBottom: '1rem' }}>
                  Add User to Golden Tier
                </h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Search by email or user ID"
                    id="golden-search-input"
                    style={{
                      flex: 1,
                      minWidth: '300px',
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={async () => {
                      const searchInput = document.getElementById('golden-search-input').value;
                      if (!searchInput) {
                        toast.error('Please enter email or user ID');
                        return;
                      }
                      
                      try {
                        const isEmail = searchInput.includes('@');
                        const params = new URLSearchParams(isEmail ? { email: searchInput } : { user_id: searchInput });
                        const response = await axios.get(`${API}/api/admin/golden-referral/search?${params}`);
                        
                        if (response.data.success && response.data.users.length > 0) {
                          // Store search results
                          window.goldenSearchResults = response.data.users;
                          // Show results
                          const resultsDiv = document.getElementById('golden-search-results');
                          resultsDiv.style.display = 'block';
                          resultsDiv.innerHTML = response.data.users.map(user => `
                            <div style="padding: 1rem; background: rgba(0, 0, 0, 0.3); border-radius: 8px; margin-bottom: 0.5rem;">
                              <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                  <p style="color: #fff; font-weight: 600; margin: 0;">${user.email}</p>
                                  <p style="color: #888; fontSize: 12px; margin: 0.25rem 0 0 0;">
                                    ID: ${user.user_id} | Referrals: ${user.referral_count} | Earned: £${user.total_earned.toFixed(2)}
                                  </p>
                                  ${user.has_golden_tier ? '<span style="color: #FFD700; fontSize: 12px;">✓ Already has Golden Tier</span>' : ''}
                                </div>
                                <button
                                  onclick="activateGoldenReferral('${user.user_id}')"
                                  disabled="${user.has_golden_tier}"
                                  style="
                                    padding: 0.5rem 1rem;
                                    background: ${user.has_golden_tier ? '#666' : 'linear-gradient(135deg, #FFD700, #FFA500)'};
                                    color: #000;
                                    border: none;
                                    borderRadius: 6px;
                                    fontWeight: 700;
                                    cursor: ${user.has_golden_tier ? 'not-allowed' : 'pointer'};
                                    opacity: ${user.has_golden_tier ? '0.5' : '1'};
                                  "
                                >
                                  ${user.has_golden_tier ? 'Active' : 'Activate'}
                                </button>
                              </div>
                            </div>
                          `).join('');
                        } else {
                          toast.error('No users found');
                        }
                      } catch (error) {
                        console.error('Search error:', error);
                        toast.error('Failed to search users');
                      }
                    }}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #00F0FF, #0891b2)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    🔍 Search
                  </button>
                </div>
                
                {/* Search Results */}
                <div id="golden-search-results" style={{ marginTop: '1rem', display: 'none' }}></div>
              </div>

              {/* Current Golden Users */}
              <div>
                <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700', marginBottom: '1rem' }}>
                  Current Golden VIP Users
                </h3>
                
                <button
                  onClick={async () => {
                    try {
                      const response = await axios.get(`${API}/api/admin/golden-referral/users`);
                      if (response.data.success) {
                        const users = response.data.golden_users;
                        const container = document.getElementById('golden-users-list');
                        
                        if (users.length === 0) {
                          container.innerHTML = '<p style="color: #888; textAlign: center; padding: 2rem;">No Golden VIP users yet</p>';
                        } else {
                          container.innerHTML = users.map(user => `
                            <div style="
                              padding: 1.5rem;
                              background: rgba(255, 215, 0, 0.05);
                              border: 2px solid rgba(255, 215, 0, 0.2);
                              borderRadius: 12px;
                              marginBottom: 1rem;
                            ">
                              <div style="display: flex; justifyContent: space-between; alignItems: start; marginBottom: 1rem;">
                                <div>
                                  <div style="display: flex; alignItems: center; gap: 0.5rem; marginBottom: 0.5rem;">
                                    <span style="fontSize: 20px;">🌟</span>
                                    <h4 style="color: #FFD700; fontSize: 18px; fontWeight: 700; margin: 0;">${user.email}</h4>
                                  </div>
                                  <p style="color: #888; fontSize: 12px; margin: 0;">
                                    User ID: ${user.user_id}
                                  </p>
                                </div>
                                <button
                                  onclick="deactivateGoldenReferral('${user.user_id}')"
                                  style="
                                    padding: 0.5rem 1rem;
                                    background: rgba(239, 68, 68, 0.2);
                                    color: #ef4444;
                                    border: 2px solid #ef4444;
                                    borderRadius: 8px;
                                    fontSize: 13px;
                                    fontWeight: 700;
                                    cursor: pointer;
                                  "
                                >
                                  ❌ Deactivate
                                </button>
                              </div>
                              
                              <div style="display: grid; gridTemplateColumns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; marginTop: 1rem;">
                                <div style="background: rgba(0, 0, 0, 0.3); padding: 0.75rem; borderRadius: 8px;">
                                  <p style="color: #888; fontSize: 11px; margin: 0;">Total Earned</p>
                                  <p style="color: #FFD700; fontSize: 18px; fontWeight: 700; margin: 0;">£${user.total_earned.toFixed(2)}</p>
                                </div>
                                <div style="background: rgba(0, 0, 0, 0.3); padding: 0.75rem; borderRadius: 8px;">
                                  <p style="color: #888; fontSize: 11px; margin: 0;">Transactions</p>
                                  <p style="color: #00F0FF; fontSize: 18px; fontWeight: 700; margin: 0;">${user.total_transactions}</p>
                                </div>
                                <div style="background: rgba(0, 0, 0, 0.3); padding: 0.75rem; borderRadius: 8px;">
                                  <p style="color: #888; fontSize: 11px; margin: 0;">Referrals</p>
                                  <p style="color: #A855F7; fontSize: 18px; fontWeight: 700; margin: 0;">${user.referral_count}</p>
                                </div>
                                <div style="background: rgba(0, 0, 0, 0.3); padding: 0.75rem; borderRadius: 8px;">
                                  <p style="color: #888; fontSize: 11px; margin: 0;">Commission Rate</p>
                                  <p style="color: #10b981; fontSize: 18px; fontWeight: 700; margin: 0;">${user.commission_rate}</p>
                                </div>
                              </div>
                              
                              <div style="marginTop: 1rem; padding: 0.75rem; background: rgba(0, 0, 0, 0.2); borderRadius: 6px;">
                                <p style="color: #888; fontSize: 11px; margin: 0;">
                                  Activated: ${new Date(user.activated_at).toLocaleDateString()} by ${user.activated_by}
                                </p>
                              </div>
                            </div>
                          `).join('');
                        }
                      }
                    } catch (error) {
                      console.error('Failed to load golden users:', error);
                      toast.error('Failed to load Golden VIP users');
                    }
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginBottom: '1rem'
                  }}
                >
                  📊 Load Golden VIP Users
                </button>
                
                <div id="golden-users-list" style={{ minHeight: '100px' }}>
                  <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                    Click "Load Golden VIP Users" to view
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Customers Table */}
        {activeTab === 'customers' && (
          <Card className="customers-table-card">
          <div className="table-header">
            <div>
              <h2 className="table-title">All Customers</h2>
              <p className="table-subtitle">Buyers and Lenders on the Platform</p>
            </div>
            <div className="table-actions">
              <div className="search-input-wrapper-admin">
                <IoSearch className="search-icon-admin" size={20} />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-admin"
                  data-testid="search-customers"
                />
              </div>
              <Button onClick={exportCustomers} className="export-btn">
                <IoCloudDownload size={20} />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          <div className="table-container">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Wallet Address</th>
                  <th>Balance</th>
                  <th>Total Deposited</th>
                  <th>Total Borrowed</th>
                  <th>Total Earned</th>
                  <th>Transactions</th>
                  <th>Active Orders</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.user_id} data-testid="customer-row">
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">
                            {customer.full_name?.charAt(0) || 'U'}
                          </div>
                          <span className="customer-name">{customer.full_name}</span>
                        </div>
                      </td>
                      <td>{customer.email}</td>
                      <td>
                        {customer.wallet_address ? (
                          <span className="wallet-address-cell">
                            {customer.wallet_address.slice(0, 6)}...{customer.wallet_address.slice(-4)}
                          </span>
                        ) : (
                          <span className="no-wallet">No wallet</span>
                        )}
                      </td>
                      <td>{customer.wallet_balance?.toFixed(4) || '0.0000'} ETH</td>
                      <td>{customer.total_deposited?.toFixed(4) || '0.0000'} ETH</td>
                      <td>{customer.total_borrowed?.toFixed(4) || '0.0000'} ETH</td>
                      <td className="earned-cell">{customer.total_earned?.toFixed(4) || '0.0000'} ETH</td>
                      <td>{customer.transaction_count || 0}</td>
                      <td>
                        <span className="orders-cell">
                          {(customer.active_buy_orders || 0) + (customer.active_sell_orders || 0)}
                        </span>
                      </td>
                      <td>{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="empty-row">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <p className="showing-text">
              Showing {filteredCustomers.length} of {customers.length} customers
            </p>
          </div>
        </Card>
        )}

        {/* Overview Tab - Platform Config */}
        {activeTab === 'overview' && platformConfig && (
          <Card style={{ marginTop: '2rem', background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
            <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
              Platform Configuration
            </h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '2rem' }}>
              View current platform settings. Contact developer to modify core configurations.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {platformConfig.config && Object.entries(platformConfig.config).map(([key, value]) => (
                <div key={key} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700' }}>
                    {typeof value === 'number' ? (key.includes('percent') || key.includes('rate') ? `${value}%` : value) : value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Liquidity Wallet Tab */}
        {activeTab === 'liquidity' && (
          <Card style={{ padding: '2rem', background: 'rgba(15, 15, 24, 0.95)', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '700', marginBottom: '0.5rem' }}>
                Admin Liquidity Wallet
              </h2>
              <p style={{ color: '#888', fontSize: '14px' }}>
                Manage platform liquidity for Express Buy. Add crypto to enable instant purchases.
              </p>
            </div>

            {/* Add Liquidity Button */}
            <Button
              onClick={() => setAddLiquidityModal(true)}
              style={{
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, #00F0FF, #00B8E6)',
                color: '#0a1628',
                fontWeight: '700'
              }}
            >
              + Add Liquidity
            </Button>

            {/* Liquidity Balances */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {liquidityWallets.map(wallet => {
                const coinEmojis = {
                  'BTC': '₿',
                  'ETH': 'Ξ',
                  'USDT': '₮',
                  'BNB': '🔶',
                  'SOL': '◎',
                  'LTC': 'Ł'
                };
                const isLowLiquidity = wallet.available < 0.1;
                
                return (
                  <div
                    key={wallet.currency}
                    style={{
                      background: isLowLiquidity ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0, 240, 255, 0.05)',
                      border: `2px solid ${isLowLiquidity ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 240, 255, 0.3)'}`,
                      borderRadius: '12px',
                      padding: '1.5rem',
                      position: 'relative'
                    }}
                  >
                    {/* Low Liquidity Warning */}
                    {isLowLiquidity && (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #EF4444',
                        borderRadius: '6px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '10px',
                        color: '#EF4444',
                        fontWeight: '700'
                      }}>
                        ⚠️ LOW
                      </div>
                    )}

                    {/* Currency with Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '24px' }}>{coinEmojis[wallet.currency] || '🪙'}</span>
                      <span style={{ fontSize: '16px', color: '#00F0FF', fontWeight: '700', textTransform: 'uppercase' }}>
                        {wallet.currency}
                      </span>
                    </div>

                    {/* Balance */}
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#00F0FF', marginBottom: '1rem' }}>
                      {wallet.balance?.toFixed(8) || '0.00000000'}
                    </div>

                    {/* Available & Reserved */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Available:</span>
                        <span style={{ color: '#22C55E', fontWeight: '600' }}>{wallet.available?.toFixed(8) || '0.00000000'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Reserved:</span>
                        <span style={{ color: '#F59E0B', fontWeight: '600' }}>{wallet.reserved?.toFixed(8) || '0.00000000'}</span>
                      </div>
                    </div>

                    {/* Quick Add Button */}
                    <Button
                      onClick={() => {
                        setNewLiquidity({ currency: wallet.currency, amount: '' });
                        setAddLiquidityModal(true);
                      }}
                      style={{
                        width: '100%',
                        marginTop: '1rem',
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        color: '#00F0FF',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      + Add {wallet.currency}
                    </Button>
                  </div>
                );
              })}
            </div>

            {liquidityWallets.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                No liquidity added yet. Click "Add Liquidity" to start.
              </div>
            )}

            {/* Add Liquidity Modal */}
            {addLiquidityModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  background: '#0a1628',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '16px',
                  padding: '2rem',
                  maxWidth: '500px',
                  width: '90%'
                }}>
                  <h3 style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '700', marginBottom: '1rem' }}>
                    Add Liquidity for Express Buy
                  </h3>

                  {/* Info Box */}
                  <div style={{
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    fontSize: '13px',
                    color: '#888',
                    lineHeight: '1.6'
                  }}>
                    💡 <strong style={{ color: '#00F0FF' }}>What is Liquidity?</strong><br/>
                    Adding liquidity enables <strong style={{ color: '#fff' }}>Instant Buy (ExpressBuy)</strong> for users. 
                    When users buy crypto instantly, they pay a <strong style={{ color: '#22C55E' }}>3% fee</strong> which goes to your Fee Wallet. 
                    Liquidity is deducted automatically when users make instant purchases.
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '0.5rem' }}>
                      Currency
                    </label>
                    <select
                      value={newLiquidity.currency}
                      onChange={(e) => setNewLiquidity({...newLiquidity, currency: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '2px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                    >
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="USDT">USDT</option>
                      <option value="BNB">BNB</option>
                      <option value="SOL">SOL</option>
                      <option value="LTC">LTC</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '0.5rem' }}>
                      Amount
                    </label>
                    <Input
                      type="number"
                      value={newLiquidity.amount}
                      onChange={(e) => setNewLiquidity({...newLiquidity, amount: e.target.value})}
                      placeholder="0.00"
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '2px solid rgba(0, 240, 255, 0.3)',
                        color: '#fff'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button
                      onClick={async () => {
                        try {
                          const response = await axios.post(`${API}/api/admin/liquidity/add`, {
                            currency: newLiquidity.currency,
                            amount: parseFloat(newLiquidity.amount),
                            admin_id: admin?.user_id || 'admin'
                          });
                          if (response.data.success) {
                            toast.success(`Added ${newLiquidity.amount} ${newLiquidity.currency} to liquidity`);
                            setAddLiquidityModal(false);
                            setNewLiquidity({ currency: 'BTC', amount: '' });
                            fetchLiquidity();
                          }
                        } catch (error) {
                          toast.error('Failed to add liquidity');
                        }
                      }}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #00F0FF, #00B8E6)',
                        color: '#0a1628',
                        fontWeight: '700'
                      }}
                    >
                      Add Liquidity
                    </Button>
                    <Button
                      onClick={() => {
                        setAddLiquidityModal(false);
                        setNewLiquidity({ currency: 'BTC', amount: '' });
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '2px solid #EF4444',
                        color: '#EF4444'
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Liquidity History Section */}
            <div style={{ marginTop: '3rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '700', marginBottom: '1rem' }}>
                📊 Liquidity History
              </h2>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '1.5rem' }}>
                Track all liquidity additions, withdrawals, and ExpressBuy usage.
              </p>

              {liquidityHistory.length > 0 ? (
                <div style={{ 
                  background: 'rgba(0, 0, 0, 0.3)', 
                  border: '1px solid rgba(0, 240, 255, 0.2)', 
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0, 240, 255, 0.1)', borderBottom: '2px solid rgba(0, 240, 255, 0.3)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Type</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Currency</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Amount</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Fee Generated</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Status</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liquidityHistory.slice(0, 20).map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: item.type === 'addition' ? 'rgba(34, 197, 94, 0.2)' :
                                         item.type === 'withdrawal' ? 'rgba(239, 68, 68, 0.2)' :
                                         'rgba(245, 158, 11, 0.2)',
                              color: item.type === 'addition' ? '#22C55E' :
                                     item.type === 'withdrawal' ? '#EF4444' :
                                     '#F59E0B'
                            }}>
                              {item.type === 'addition' ? '➕ Added' :
                               item.type === 'withdrawal' ? '➖ Withdrawn' :
                               '💰 Used (ExpressBuy)'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: '#fff', fontWeight: '600' }}>{item.currency}</td>
                          <td style={{ padding: '1rem', color: '#00F0FF', fontWeight: '600' }}>
                            {item.amount?.toFixed(8) || '0.00000000'}
                          </td>
                          <td style={{ padding: '1rem', color: '#22C55E', fontWeight: '600' }}>
                            {item.fee_collected ? `+${item.fee_collected.toFixed(8)}` : '-'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: item.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: item.status === 'completed' ? '#22C55E' : '#F59E0B'
                            }}>
                              {item.status?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: '#888', fontSize: '13px' }}>
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem', 
                  color: '#888',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px'
                }}>
                  No liquidity history yet. Start adding liquidity to see transactions here.
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <Card style={{ padding: '2rem', background: 'rgba(15, 15, 24, 0.95)', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '700', marginBottom: '0.5rem' }}>
                Admin Withdrawals
              </h2>
              <p style={{ color: '#888', fontSize: '14px' }}>
                Withdraw collected fees and liquidity to your personal wallets.
              </p>
            </div>

            {/* Withdrawal Addresses Setup */}
            <div style={{ 
              background: 'rgba(0, 240, 255, 0.05)', 
              border: '2px solid rgba(0, 240, 255, 0.3)', 
              borderRadius: '12px', 
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700', marginBottom: '1rem' }}>
                Your Withdrawal Addresses
              </h3>
              
              {availableCoinSymbols.map(currency => (
                <div key={currency} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '0.5rem', fontWeight: '600' }}>
                    {currency} Address
                  </label>
                  <Input
                    type="text"
                    value={withdrawalAddresses[currency]}
                    onChange={(e) => setWithdrawalAddresses({...withdrawalAddresses, [currency]: e.target.value})}
                    placeholder={`Paste your ${currency} wallet address`}
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Fee Wallet Withdrawals */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#22C55E', fontSize: '18px', fontWeight: '700', marginBottom: '1rem' }}>
                Fee Wallet
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {feeBalances.filter(b => b.total_fees > 0).map(balance => (
                  <div
                    key={balance.currency}
                    style={{
                      background: 'rgba(34, 197, 94, 0.05)',
                      border: '2px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '12px',
                      padding: '1.5rem'
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      {balance.currency} Fees
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#22C55E', marginBottom: '1rem' }}>
                      {balance.total_fees?.toFixed(8) || '0.00000000'}
                    </div>
                    <Button
                      onClick={() => setConfirmWithdrawal({
                        currency: balance.currency,
                        amount: balance.total_fees,
                        wallet_type: 'fee_wallet',
                        address: withdrawalAddresses[balance.currency]
                      })}
                      disabled={!withdrawalAddresses[balance.currency]}
                      style={{
                        width: '100%',
                        background: withdrawalAddresses[balance.currency] 
                          ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                          : 'rgba(34, 197, 94, 0.3)',
                        color: '#fff',
                        fontWeight: '700'
                      }}
                    >
                      Withdraw Fees
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Liquidity Wallet Withdrawals */}
            <div>
              <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700', marginBottom: '1rem' }}>
                Liquidity Wallet
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {liquidityWallets.filter(w => w.available > 0).map(wallet => (
                  <div
                    key={wallet.currency}
                    style={{
                      background: 'rgba(0, 240, 255, 0.05)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      padding: '1.5rem'
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      {wallet.currency} Liquidity
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>
                      {wallet.available?.toFixed(8) || '0.00000000'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '1rem' }}>
                      Total: {wallet.balance?.toFixed(8)}
                    </div>
                    <Button
                      onClick={() => setConfirmWithdrawal({
                        currency: wallet.currency,
                        amount: wallet.available,
                        wallet_type: 'liquidity_wallet',
                        address: withdrawalAddresses[wallet.currency]
                      })}
                      disabled={!withdrawalAddresses[wallet.currency]}
                      style={{
                        width: '100%',
                        background: withdrawalAddresses[wallet.currency]
                          ? 'linear-gradient(135deg, #00F0FF, #00B8E6)'
                          : 'rgba(0, 240, 255, 0.3)',
                        color: withdrawalAddresses[wallet.currency] ? '#0a1628' : 'rgba(255,255,255,0.5)',
                        fontWeight: '700'
                      }}
                    >
                      Withdraw Liquidity
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation Modal */}
            {confirmWithdrawal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000
              }}>
                <div style={{
                  background: '#0a1628',
                  border: '2px solid rgba(245, 158, 11, 0.5)',
                  borderRadius: '16px',
                  padding: '2rem',
                  maxWidth: '500px',
                  width: '90%'
                }}>
                  <h3 style={{ color: '#F59E0B', fontSize: '20px', fontWeight: '700', marginBottom: '1.5rem' }}>
                    ⚠️ Confirm Withdrawal
                  </h3>
                  
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#888' }}>Currency:</span>
                      <span style={{ color: '#fff', fontWeight: '700' }}>{confirmWithdrawal.currency}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#888' }}>Amount:</span>
                      <span style={{ color: '#00F0FF', fontWeight: '700' }}>{confirmWithdrawal.amount?.toFixed(8)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#888' }}>From:</span>
                      <span style={{ color: '#fff', fontWeight: '700' }}>
                        {confirmWithdrawal.wallet_type === 'fee_wallet' ? 'Fee Wallet' : 'Liquidity Wallet'}
                      </span>
                    </div>
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.25rem' }}>To Address:</div>
                      <div style={{ color: '#fff', fontSize: '12px', wordBreak: 'break-all' }}>
                        {confirmWithdrawal.address}
                      </div>
                    </div>
                  </div>

                  <div style={{ color: '#F59E0B', fontSize: '14px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    This withdrawal cannot be reversed. Please verify the address is correct before confirming.
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button
                      onClick={async () => {
                        setWithdrawing(true);
                        try {
                          const response = await axios.post(`${API}/api/admin/withdraw`, {
                            admin_id: admin?.user_id || 'admin',
                            currency: confirmWithdrawal.currency,
                            amount: confirmWithdrawal.amount,
                            wallet_type: confirmWithdrawal.wallet_type,
                            withdrawal_address: confirmWithdrawal.address
                          });
                          if (response.data.success) {
                            toast.success(`Withdrawal of ${confirmWithdrawal.amount} ${confirmWithdrawal.currency} initiated!`);
                            setConfirmWithdrawal(null);
                            fetchLiquidity();
                            fetchFeeBalances();
                          }
                        } catch (error) {
                          toast.error(error.response?.data?.detail || 'Withdrawal failed');
                        } finally {
                          setWithdrawing(false);
                        }
                      }}
                      disabled={withdrawing}
                      style={{
                        flex: 1,
                        background: withdrawing ? 'rgba(245, 158, 11, 0.3)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                        color: '#fff',
                        fontWeight: '700'
                      }}
                    >
                      {withdrawing ? 'Processing...' : 'Confirm Withdrawal'}
                    </Button>
                    <Button
                      onClick={() => setConfirmWithdrawal(null)}
                      disabled={withdrawing}
                      style={{
                        flex: 1,
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '2px solid #EF4444',
                        color: '#EF4444'
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* TRADING LIQUIDITY MANAGEMENT TAB */}
        {activeTab === 'trading' && (
          <Card style={{ background: 'rgba(15, 23, 42, 0.6)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF', marginBottom: '2rem', textTransform: 'uppercase' }}>
              ⚡ Trading Liquidity Management
            </h2>

            <p style={{ color: '#888', marginBottom: '2rem', lineHeight: '1.6' }}>
              Manage platform liquidity for the Spot Trading page. Trading pairs are automatically disabled when liquidity reaches zero.
              Markup/markdown percentages are hidden from users and protect the platform from market movements.
            </p>

            {/* Trading Pair Liquidity Table */}
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Trading Pair Liquidity</h3>
                <Button
                  onClick={() => setTradingLiquidityModal({ show: true, type: 'add', currency: 'BTC', amount: '' })}
                  style={{
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    color: '#000',
                    fontWeight: '700',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  + Add Liquidity
                </Button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 240, 255, 0.1)', borderBottom: '2px solid rgba(0, 240, 255, 0.3)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>Currency</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>Total Balance</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>Available</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>Reserved</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradingLiquidity.map((wallet, index) => (
                      <tr key={wallet.currency} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <td style={{ padding: '1rem', color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                          {wallet.currency}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: '#fff', fontSize: '14px' }}>
                          {wallet.balance?.toFixed(8) || '0.00000000'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: wallet.available > 0 ? '#22C55E' : '#EF4444', fontSize: '14px', fontWeight: '700' }}>
                          {wallet.available?.toFixed(8) || '0.00000000'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: '#888', fontSize: '14px' }}>
                          {wallet.reserved?.toFixed(8) || '0.00000000'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: wallet.is_tradable ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: wallet.is_tradable ? '#22C55E' : '#EF4444',
                            border: `1px solid ${wallet.is_tradable ? '#22C55E' : '#EF4444'}`
                          }}>
                            {wallet.status === 'active' ? '✓ Active' : '⏸ Paused'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => setTradingLiquidityModal({ show: true, type: 'add', currency: wallet.currency, amount: '' })}
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(0, 240, 255, 0.2)',
                                color: '#00F0FF',
                                border: '1px solid #00F0FF',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '700'
                              }}
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setTradingLiquidityModal({ show: true, type: 'remove', currency: wallet.currency, amount: '' })}
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#EF4444',
                                border: '1px solid #EF4444',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '700',
                                opacity: wallet.available > 0 ? 1 : 0.5
                              }}
                              disabled={wallet.available <= 0}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fee & Markup Configuration */}
            <div style={{ marginTop: '3rem', padding: '2rem', background: 'rgba(168, 85, 247, 0.1)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#A855F7', marginBottom: '1.5rem' }}>
                Fee & Spread Protection Settings
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Trading Fee */}
                <div>
                  <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '700' }}>
                    Trading Fee %
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={platformSettings?.trading_fee_percent || 0.1}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, trading_fee_percent: parseFloat(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem' }}>
                    Charged to users (separate from P2P and Express Buy fees)
                  </p>
                </div>

                {/* Buy Markup */}
                <div>
                  <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '700' }}>
                    Buy Markup % (Hidden)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={platformSettings?.buy_markup_percent || 0.5}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, buy_markup_percent: parseFloat(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem' }}>
                    User buys at market + this % (protects platform)
                  </p>
                </div>

                {/* Sell Markdown */}
                <div>
                  <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '700' }}>
                    Sell Markdown % (Hidden)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={platformSettings?.sell_markdown_percent || 0.5}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, sell_markdown_percent: parseFloat(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem' }}>
                    User sells at market - this % (protects platform)
                  </p>
                </div>
              </div>

              <Button
                onClick={async () => {
                  try {
                    await axios.post(`${API}/api/admin/platform-settings`, {
                      trading_fee_percent: platformSettings.trading_fee_percent,
                      buy_markup_percent: platformSettings.buy_markup_percent,
                      sell_markdown_percent: platformSettings.sell_markdown_percent
                    });
                    toast.success('Trading settings updated successfully!');
                  } catch (error) {
                    console.error('Error updating settings:', error);
                    toast.error('Failed to update settings');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #A855F7, #EC4899)',
                  color: '#fff',
                  fontWeight: '700',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Save Settings
              </Button>
            </div>

            {/* Add/Remove Liquidity Modal */}
            {tradingLiquidityModal.show && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000
              }}>
                <div style={{
                  background: '#0a1628',
                  border: `2px solid ${tradingLiquidityModal.type === 'add' ? 'rgba(0, 240, 255, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                  borderRadius: '16px',
                  padding: '2rem',
                  maxWidth: '500px',
                  width: '90%'
                }}>
                  <h3 style={{ 
                    color: tradingLiquidityModal.type === 'add' ? '#00F0FF' : '#EF4444', 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    marginBottom: '1.5rem' 
                  }}>
                    {tradingLiquidityModal.type === 'add' ? '➕ Add' : '➖ Remove'} Trading Liquidity
                  </h3>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '700' }}>
                      Currency
                    </label>
                    <select
                      value={tradingLiquidityModal.currency}
                      onChange={(e) => setTradingLiquidityModal({ ...tradingLiquidityModal, currency: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '2px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px'
                      }}
                    >
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="USDT">USDT</option>
                      <option value="BNB">BNB</option>
                      <option value="SOL">SOL</option>
                      <option value="LTC">LTC</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '700' }}>
                      Amount
                    </label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={tradingLiquidityModal.amount}
                      onChange={(e) => setTradingLiquidityModal({ ...tradingLiquidityModal, amount: e.target.value })}
                      placeholder="0.00000000"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '2px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button
                      onClick={async () => {
                        try {
                          const endpoint = tradingLiquidityModal.type === 'add' 
                            ? '/api/admin/trading-liquidity/add'
                            : '/api/admin/trading-liquidity/remove';
                          
                          const response = await axios.post(`${API}${endpoint}`, {
                            currency: tradingLiquidityModal.currency,
                            amount: parseFloat(tradingLiquidityModal.amount)
                          });

                          if (response.data.success) {
                            toast.success(response.data.message);
                            setTradingLiquidityModal({ show: false, type: 'add', currency: 'BTC', amount: '' });
                            fetchTradingLiquidity(); // Refresh data
                          }
                        } catch (error) {
                          console.error('Error managing liquidity:', error);
                          toast.error(error.response?.data?.detail || 'Failed to manage liquidity');
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: tradingLiquidityModal.type === 'add' 
                          ? 'linear-gradient(135deg, #00F0FF, #A855F7)'
                          : 'linear-gradient(135deg, #EF4444, #DC2626)',
                        color: '#fff',
                        fontWeight: '700',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Confirm
                    </Button>
                    <Button
                      onClick={() => setTradingLiquidityModal({ show: false, type: 'add', currency: 'BTC', amount: '' })}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#888',
                        fontWeight: '700',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* REVENUE TRACKING TAB */}
        {activeTab === 'revenue' && (
          <Card style={{ background: 'rgba(15, 23, 42, 0.6)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF', marginBottom: '2rem', textTransform: 'uppercase' }}>
              💰 Revenue Tracking
            </h2>

            {/* Period Filter */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {['day', 'week', 'month', 'all'].map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setRevenuePeriod(period);
                    fetchRevenueSummary(period);
                    fetchRevenueTransactions(period, revenueFilter);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: revenuePeriod === period ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(255, 255, 255, 0.1)',
                    color: revenuePeriod === period ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {period === 'all' ? 'All Time' : `Last ${period.charAt(0).toUpperCase() + period.slice(1)}`}
                </button>
              ))}
            </div>

            {revenueSummary && (
              <>
                {/* Revenue Summary Cards Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {/* Total Revenue (All Fees) */}
                  <Card style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(6, 182, 212, 0.1))', border: '2px solid rgba(14, 165, 233, 0.5)', borderRadius: '16px', padding: '2rem' }}>
                    <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>Total Revenue (All Fees)</div>
                    <div style={{ fontSize: '42px', fontWeight: '900', color: '#0EA5E9', marginBottom: '0.5rem' }}>
                      £{revenueSummary.revenue_breakdown?.total_revenue?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      Before referral commissions
                    </div>
                  </Card>

                  {/* Referral Commissions Paid */}
                  <Card style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.1))', border: '2px solid rgba(168, 85, 247, 0.5)', borderRadius: '16px', padding: '2rem' }}>
                    <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>Referral Commissions Paid</div>
                    <div style={{ fontSize: '42px', fontWeight: '900', color: '#A855F7', marginBottom: '0.5rem' }}>
                      £{revenueSummary.revenue_breakdown?.referral_commissions?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      Paid to referrers
                    </div>
                  </Card>

                  {/* Net Platform Profit */}
                  <Card style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.1))', border: '2px solid rgba(34, 197, 94, 0.5)', borderRadius: '16px', padding: '2rem' }}>
                    <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>Net Platform Profit</div>
                    <div style={{ fontSize: '42px', fontWeight: '900', color: '#22C55E', marginBottom: '0.5rem' }}>
                      £{revenueSummary.total_profit?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      After all commissions
                    </div>
                  </Card>
                </div>

                {/* Revenue Breakdown Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {/* Trading Fees */}
                  <Card style={{ background: 'rgba(0, 240, 255, 0.1)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Trading Fees</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF' }}>
                      £{revenueSummary.revenue_breakdown?.trading_fees?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '0.5rem' }}>From Spot Trading</div>
                  </Card>

                  {/* Markup/Markdown Profit */}
                  <Card style={{ background: 'rgba(168, 85, 247, 0.1)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Markup/Markdown Profit</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#A855F7' }}>
                      £{revenueSummary.revenue_breakdown?.markup_markdown_profit?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '0.5rem' }}>Hidden Spread Revenue</div>
                  </Card>

                  {/* Express Buy Fees */}
                  <Card style={{ background: 'rgba(251, 146, 60, 0.1)', border: '2px solid rgba(251, 146, 60, 0.3)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Express Buy Fees</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#FB923C' }}>
                      £{revenueSummary.revenue_breakdown?.express_buy_fees?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '0.5rem' }}>From Express Buy</div>
                  </Card>

                  {/* P2P Fees */}
                  <Card style={{ background: 'rgba(236, 72, 153, 0.1)', border: '2px solid rgba(236, 72, 153, 0.3)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>P2P Marketplace Fees</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#EC4899' }}>
                      £{revenueSummary.revenue_breakdown?.p2p_fees?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '0.5rem' }}>From P2P Trades</div>
                  </Card>

                  {/* MoonPay Revenue */}
                  <Card style={{ background: 'rgba(14, 165, 233, 0.1)', border: '2px solid rgba(14, 165, 233, 0.3)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>MoonPay Revenue</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#0EA5E9' }}>
                      £{revenueSummary.revenue_breakdown?.moonpay_revenue?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '0.5rem' }}>From MoonPay Integration</div>
                  </Card>

                  {/* Total Fee Wallet */}
                  <Card style={{ background: 'rgba(245, 158, 11, 0.1)', border: '2px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Fee Wallet</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#F59E0B' }}>
                      £{revenueSummary.total_fee_wallet_gbp?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '0.5rem' }}>Collected Fees (All Time)</div>
                  </Card>
                </div>

                {/* Fee Wallet Breakdown */}
                <Card style={{ background: 'rgba(15, 23, 42, 0.4)', border: '2px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Fee Wallet Breakdown by Currency</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {revenueSummary.fee_wallet_breakdown && Object.entries(revenueSummary.fee_wallet_breakdown).map(([currency, data]) => (
                      <div key={currency} style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>{currency}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>Total: {data.total_fees?.toFixed(8)}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>Trading: {data.trading_fees?.toFixed(8)}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>P2P: {data.p2p_fees?.toFixed(8)}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>Express: {data.express_buy_fees?.toFixed(8)}</div>
                        <div style={{ fontSize: '11px', color: '#22C55E', marginTop: '0.5rem', fontWeight: '700' }}>≈ £{data.gbp_value?.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 13-Feature Monetization Breakdown */}
                <Card style={{ background: 'rgba(15, 23, 42, 0.4)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#A855F7' }}>
                      🎯 13-Feature Monetization Breakdown
                    </h3>
                    <button
                      onClick={async () => {
                        try {
                          const response = await axios.get(`${API}/api/admin/revenue/monetization-breakdown?period=${revenuePeriod}`);
                          if (response.data.success) {
                            setMonetizationBreakdown(response.data);
                            setShowMonetizationModal(true);
                          }
                        } catch (error) {
                          console.error('Failed to fetch monetization breakdown:', error);
                          toast.error('Failed to load monetization breakdown');
                        }
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      📊 View Detailed Breakdown
                    </button>
                  </div>
                  <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.6' }}>
                    View comprehensive revenue analysis for all 13 monetization features: Express Buy/Sell Fees, Admin Spreads, P2P Seller Fees, Payment Method Fees, Boosted Listings, Seller Verification/Levels, Referral Upgrades, Arbitrage Alerts, Internal Transfers, Dispute Penalties, and OTC Desk.
                  </p>
                </Card>
              </>
            )}

            {/* Transaction Log */}
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Fee Transaction Log</h3>
                
                {/* Transaction Type Filter */}
                <select
                  value={revenueFilter}
                  onChange={(e) => {
                    setRevenueFilter(e.target.value);
                    fetchRevenueTransactions(revenuePeriod, e.target.value);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Transactions</option>
                  <option value="trading">Trading Fees</option>
                  <option value="p2p">P2P Fees</option>
                  <option value="express_buy">Express Buy</option>
                </select>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 240, 255, 0.1)', borderBottom: '2px solid rgba(0, 240, 255, 0.3)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontWeight: '700', fontSize: '12px' }}>Timestamp</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontWeight: '700', fontSize: '12px' }}>Type</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontWeight: '700', fontSize: '12px' }}>Subtype</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#00F0FF', fontWeight: '700', fontSize: '12px' }}>Amount</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontWeight: '700', fontSize: '12px' }}>Currency</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontWeight: '700', fontSize: '12px' }}>Pair/Details</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontWeight: '700', fontSize: '12px' }}>Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueTransactions.length > 0 ? (
                      revenueTransactions.map((txn, index) => (
                        <tr key={txn.transaction_id || index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <td style={{ padding: '1rem', color: '#888', fontSize: '12px' }}>
                            {new Date(txn.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '1rem', color: '#fff', fontSize: '13px', fontWeight: '600' }}>
                            {txn.type}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '12px' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: txn.subtype === 'BUY' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: txn.subtype === 'BUY' ? '#22C55E' : '#EF4444'
                            }}>
                              {txn.subtype}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#22C55E', fontSize: '14px', fontWeight: '700' }}>
                            {txn.amount?.toFixed(4)}
                          </td>
                          <td style={{ padding: '1rem', color: '#00F0FF', fontSize: '13px', fontWeight: '600' }}>
                            {txn.currency}
                          </td>
                          <td style={{ padding: '1rem', color: '#888', fontSize: '12px' }}>
                            {txn.pair || 'N/A'}
                          </td>
                          <td style={{ padding: '1rem', color: '#666', fontSize: '11px', fontFamily: 'monospace' }}>
                            {txn.transaction_id?.substring(0, 8)}...
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                          No transactions found for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}



        {/* COINS CMS TAB */}
        {activeTab === 'coins' && (
          <Card style={{ padding: '2rem', background: 'rgba(26, 31, 58, 0.8)', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>
                  Coin Management (CMS)
                </h2>
                <p style={{ color: '#888', fontSize: '14px' }}>
                  Enable/disable coins, configure NowPay wallets, and control which services support each coin
                </p>
              </div>
              <button
                onClick={() => {
                  setAddCoinModal(true);
                  fetchSupportedCoins();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                + Add New Coin
              </button>
            </div>

            {/* Coins Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(0, 240, 255, 0.2)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Symbol</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>P2P</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Trading</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Instant Buy</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Express Buy</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>NowPay Wallet</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#00F0FF', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supportedCoins.map((coin) => (
                    <tr key={coin.symbol} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <td style={{ padding: '1rem', color: '#fff', fontWeight: '700', fontSize: '16px' }}>{coin.symbol}</td>
                      <td style={{ padding: '1rem', color: '#888', fontSize: '14px' }}>{coin.name}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={coin.enabled}
                            onChange={(e) => toggleCoinStatus(coin.symbol, e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ marginLeft: '0.5rem', color: coin.enabled ? '#22C55E' : '#EF4444', fontSize: '13px', fontWeight: '600' }}>
                            {coin.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          background: coin.supports_p2p ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                          color: coin.supports_p2p ? '#22C55E' : '#EF4444', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600' 
                        }}>
                          {coin.supports_p2p ? '✓' : '✗'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          background: coin.supports_trading ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                          color: coin.supports_trading ? '#22C55E' : '#EF4444', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600' 
                        }}>
                          {coin.supports_trading ? '✓' : '✗'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          background: coin.supports_instant_buy ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                          color: coin.supports_instant_buy ? '#22C55E' : '#EF4444', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600' 
                        }}>
                          {coin.supports_instant_buy ? '✓' : '✗'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          background: coin.supports_express_buy ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                          color: coin.supports_express_buy ? '#22C55E' : '#EF4444', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600' 
                        }}>
                          {coin.supports_express_buy ? '✓' : '✗'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#888', fontSize: '12px' }}>
                        {coin.nowpay_wallet_id || <span style={{ color: '#666', fontStyle: 'italic' }}>Not configured</span>}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setEditingCoin(coin)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(0, 240, 255, 0.2)',
                            border: '1px solid rgba(0, 240, 255, 0.4)',
                            borderRadius: '4px',
                            color: '#00F0FF',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Edit Coin Modal */}
            {editingCoin && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}
              onClick={() => setEditingCoin(null)}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(15, 20, 40, 0.95))',
                  border: '2px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '16px',
                  padding: '2rem',
                  maxWidth: '600px',
                  width: '90%'
                }}
                onClick={(e) => e.stopPropagation()}>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00F0FF', marginBottom: '1.5rem' }}>
                    Edit {editingCoin.symbol} Configuration
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>NowPay Wallet ID</label>
                      <input
                        type="text"
                        value={editingCoin.nowpay_wallet_id || ''}
                        onChange={(e) => setEditingCoin({...editingCoin, nowpay_wallet_id: e.target.value})}
                        placeholder="Enter NowPay wallet ID"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editingCoin.supports_p2p}
                          onChange={(e) => setEditingCoin({...editingCoin, supports_p2p: e.target.checked})}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ color: '#fff', fontSize: '14px' }}>Support P2P</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editingCoin.supports_trading}
                          onChange={(e) => setEditingCoin({...editingCoin, supports_trading: e.target.checked})}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ color: '#fff', fontSize: '14px' }}>Support Trading</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editingCoin.supports_instant_buy}
                          onChange={(e) => setEditingCoin({...editingCoin, supports_instant_buy: e.target.checked})}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ color: '#fff', fontSize: '14px' }}>Support Instant Buy</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editingCoin.supports_express_buy}
                          onChange={(e) => setEditingCoin({...editingCoin, supports_express_buy: e.target.checked})}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ color: '#fff', fontSize: '14px' }}>Support Express Buy</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => setEditingCoin(null)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '2px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '8px',
                        color: '#EF4444',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateCoinConfig(editingCoin.symbol, {
                        nowpay_wallet_id: editingCoin.nowpay_wallet_id,
                        supports_p2p: editingCoin.supports_p2p,
                        supports_trading: editingCoin.supports_trading,
                        supports_instant_buy: editingCoin.supports_instant_buy,
                        supports_express_buy: editingCoin.supports_express_buy
                      })}
                      style={{
                        flex: 2,
                        padding: '0.75rem',
                        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Coin Modal */}
            {addCoinModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}
              onClick={() => setAddCoinModal(false)}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(15, 20, 40, 0.95))',
                  border: '2px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '16px',
                  padding: '2rem',
                  maxWidth: '500px',
                  width: '90%'
                }}
                onClick={(e) => e.stopPropagation()}>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00F0FF', marginBottom: '1.5rem' }}>
                    Add New Coin
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>Symbol *</label>
                      <input
                        type="text"
                        value={newCoin.symbol}
                        onChange={(e) => setNewCoin({...newCoin, symbol: e.target.value.toUpperCase()})}
                        placeholder="e.g., XRP"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>Name *</label>
                      <input
                        type="text"
                        value={newCoin.name}
                        onChange={(e) => setNewCoin({...newCoin, name: e.target.value})}
                        placeholder="e.g., Ripple"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>NowPay Wallet ID (Optional)</label>
                      <input
                        type="text"
                        value={newCoin.nowpay_wallet_id}
                        onChange={(e) => setNewCoin({...newCoin, nowpay_wallet_id: e.target.value})}
                        placeholder="Configure later"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => {
                        setAddCoinModal(false);
                        setNewCoin({ symbol: '', name: '', nowpay_wallet_id: '' });
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '2px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '8px',
                        color: '#EF4444',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addNewCoin}
                      style={{
                        flex: 2,
                        padding: '0.75rem',
                        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Add Coin
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px' }}>
              <p style={{ color: '#00F0FF', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>
                💡 How This Works:
              </p>
              <ul style={{ color: '#888', fontSize: '12px', lineHeight: '1.6', paddingLeft: '1.25rem' }}>
                <li>Enable/disable coins to control visibility across all services (P2P, Trading, Instant Buy, Express Buy)</li>
                <li>Configure NowPay Wallet IDs to link each coin to its corresponding payment wallet for deposits/withdrawals</li>
                <li>Toggle individual service support to control where each coin can be used</li>
                <li>The crypto dropdown in P2P Marketplace automatically shows only enabled coins with P2P support</li>
                <li>New coins can be added instantly and will appear throughout the platform when enabled</li>
              </ul>
            </div>
          </Card>
        )}

        {/* PROMO BANNERS TAB */}
        {activeTab === 'banners' && (
          <Card style={{ padding: '2rem', background: 'rgba(26, 31, 58, 0.8)', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>
                  Promo Banner Management
                </h2>
                <p style={{ color: '#888', fontSize: '14px' }}>
                  Create and schedule promotional banners that appear at the top of the platform
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingBanner(null);
                  setNewBanner({
                    title: '',
                    message: '',
                    type: 'info',
                    link: '',
                    link_text: '',
                    start_date: new Date().toISOString().slice(0, 16),
                    end_date: '',
                    is_active: true
                  });
                  setBannerModal(true);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                + Create New Banner
              </button>
            </div>

            {/* Banners List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {banners.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                  <p>No banners created yet. Click "Create New Banner" to get started.</p>
                </div>
              ) : (
                banners.map((banner) => (
                  <div
                    key={banner.banner_id}
                    style={{
                      padding: '1.5rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1.5rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#00F0FF' }}>
                          {banner.title}
                        </h3>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: banner.type === 'info' ? 'rgba(0, 240, 255, 0.2)' : 
                                       banner.type === 'warning' ? 'rgba(251, 146, 60, 0.2)' :
                                       banner.type === 'success' ? 'rgba(34, 197, 94, 0.2)' :
                                       'rgba(168, 85, 247, 0.2)',
                            color: banner.type === 'info' ? '#00F0FF' : 
                                   banner.type === 'warning' ? '#FB923C' :
                                   banner.type === 'success' ? '#22C55E' :
                                   '#A855F7',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}
                        >
                          {banner.type}
                        </span>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: banner.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: banner.is_active ? '#22C55E' : '#EF4444',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}
                        >
                          {banner.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 1rem', color: '#E2E8F0', fontSize: '14px' }}>
                        {banner.message}
                      </p>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px', color: '#888' }}>
                        <span>📅 Start: {new Date(banner.start_date).toLocaleString()}</span>
                        {banner.end_date && <span>⏰ End: {new Date(banner.end_date).toLocaleString()}</span>}
                        {banner.link && <span>🔗 Link: {banner.link_text || 'View'}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={() => editBanner(banner)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(0, 240, 255, 0.2)',
                          border: '1px solid rgba(0, 240, 255, 0.4)',
                          borderRadius: '6px',
                          color: '#00F0FF',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBanner(banner.banner_id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          borderRadius: '6px',
                          color: '#EF4444',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Banner Modal */}
            {bannerModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999
                }}
                onClick={() => setBannerModal(false)}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(15, 20, 40, 0.95))',
                    border: '2px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '600px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00F0FF', marginBottom: '1.5rem' }}>
                    {editingBanner ? 'Edit Banner' : 'Create New Banner'}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>Title *</label>
                      <input
                        type="text"
                        value={newBanner.title}
                        onChange={(e) => setNewBanner({...newBanner, title: e.target.value})}
                        placeholder="Banner title"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>Message *</label>
                      <textarea
                        value={newBanner.message}
                        onChange={(e) => setNewBanner({...newBanner, message: e.target.value})}
                        placeholder="Banner message"
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>Type</label>
                      <select
                        value={newBanner.type}
                        onChange={(e) => setNewBanner({...newBanner, type: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '14px'
                        }}
                      >
                        <option value="info">Info (Cyan)</option>
                        <option value="warning">Warning (Orange)</option>
                        <option value="success">Success (Green)</option>
                        <option value="promo">Promo (Purple)</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>Link URL</label>
                        <input
                          type="text"
                          value={newBanner.link}
                          onChange={(e) => setNewBanner({...newBanner, link: e.target.value})}
                          placeholder="/page or https://..."
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>Link Text</label>
                        <input
                          type="text"
                          value={newBanner.link_text}
                          onChange={(e) => setNewBanner({...newBanner, link_text: e.target.value})}
                          placeholder="Learn More"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>Start Date *</label>
                        <input
                          type="datetime-local"
                          value={newBanner.start_date}
                          onChange={(e) => setNewBanner({...newBanner, start_date: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', color: '#888', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>End Date (Optional)</label>
                        <input
                          type="datetime-local"
                          value={newBanner.end_date}
                          onChange={(e) => setNewBanner({...newBanner, end_date: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newBanner.is_active}
                          onChange={(e) => setNewBanner({...newBanner, is_active: e.target.checked})}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>
                          Active (visible to users)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      onClick={() => setBannerModal(false)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveBanner}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {editingBanner ? 'Update Banner' : 'Create Banner'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px' }}>
              <p style={{ color: '#00F0FF', fontSize: '13px', marginBottom: '0.5rem', fontWeight: '600' }}>
                💡 How Promo Banners Work:
              </p>
              <ul style={{ color: '#888', fontSize: '12px', lineHeight: '1.6', paddingLeft: '1.25rem' }}>
                <li>Banners appear at the top of the platform for all users (below the price ticker)</li>
                <li>Schedule banners with start/end dates for time-limited promotions</li>
                <li>Users can dismiss banners - they won't see them again on that device</li>
                <li>Only one banner shows at a time (most recent active banner)</li>
                <li>Choose from 4 types: Info (cyan), Warning (orange), Success (green), or Promo (purple)</li>
                <li>Add optional action buttons with custom links</li>
              </ul>
            </div>
          </Card>
        )}

        {/* MONETIZATION SETTINGS TAB */}
        {activeTab === 'monetization' && (
          <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ color: '#00F0FF', fontSize: '28px', fontWeight: '900', margin: 0, marginBottom: '0.5rem' }}>
                  💰 Monetization Settings
                </h2>
                <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
                  Configure all platform fees and pricing - All fees are automatically deducted
                </p>
              </div>
              {!editingMonetization && (
                <Button
                  onClick={() => setEditingMonetization(true)}
                  style={{
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    color: '#000',
                    fontWeight: '700',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit Settings
                </Button>
              )}
            </div>

            {monetizationSettings && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Trading Fees Section */}
                <div>
                  <h3 style={{ color: '#A855F7', fontSize: '20px', fontWeight: '700', marginBottom: '1rem' }}>
                    📊 Trading Fees
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Buyer Express Fee</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={monetizationSettings.buyer_express_fee_percent}
                          id="buyer_express_fee_percent"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
                          {monetizationSettings.buyer_express_fee_percent}%
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Auto-added to Express Buy orders</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Instant Sell Fee</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={monetizationSettings.instant_sell_fee_percent}
                          id="instant_sell_fee_percent"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
                          {monetizationSettings.instant_sell_fee_percent}%
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Deducted from seller payout</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Admin Sell Spread</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={monetizationSettings.admin_sell_spread_percent}
                          id="admin_sell_spread_percent"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#22C55E' }}>
                          +{monetizationSettings.admin_sell_spread_percent}%
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Markup on Express Buy price</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Admin Buy Spread</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={monetizationSettings.admin_buy_spread_percent}
                          id="admin_buy_spread_percent"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#EF4444' }}>
                          {monetizationSettings.admin_buy_spread_percent}%
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Markdown on Instant Sell price</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>P2P Seller Fee</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={monetizationSettings.p2p_seller_fee_percent}
                          id="p2p_seller_fee_percent"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#A855F7' }}>
                          {monetizationSettings.p2p_seller_fee_percent}%
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Deducted from seller on P2P trade</div>
                    </div>
                  </div>
                </div>

                {/* Seller Features Section */}
                <div>
                  <h3 style={{ color: '#A855F7', fontSize: '20px', fontWeight: '700', marginBottom: '1rem' }}>
                    👔 Seller Features (One-Time Payments)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Seller Verification</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="1"
                          defaultValue={monetizationSettings.seller_verification_price}
                          id="seller_verification_price"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#A855F7' }}>
                          £{monetizationSettings.seller_verification_price}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Get verified badge</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(192, 192, 192, 0.1)', borderRadius: '12px', border: '1px solid rgba(192, 192, 192, 0.3)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Silver Level Upgrade</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="1"
                          defaultValue={monetizationSettings.seller_silver_upgrade_price}
                          id="seller_silver_upgrade_price"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(192, 192, 192, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#C0C0C0' }}>
                          £{monetizationSettings.seller_silver_upgrade_price}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Priority + {monetizationSettings.silver_fee_reduction_percent}% fee reduction</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Gold Level Upgrade</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="1"
                          defaultValue={monetizationSettings.seller_gold_upgrade_price}
                          id="seller_gold_upgrade_price"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#FFD700' }}>
                          £{monetizationSettings.seller_gold_upgrade_price}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Top priority + {monetizationSettings.gold_fee_reduction_percent}% fee reduction</div>
                    </div>
                  </div>
                </div>

                {/* Boosted Listings Section */}
                <div>
                  <h3 style={{ color: '#A855F7', fontSize: '20px', fontWeight: '700', marginBottom: '1rem' }}>
                    🚀 Boosted Listings
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>1 Hour Boost</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="1"
                          defaultValue={monetizationSettings.boost_1h_price}
                          id="boost_1h_price"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
                          £{monetizationSettings.boost_1h_price}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>6 Hours Boost</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="1"
                          defaultValue={monetizationSettings.boost_6h_price}
                          id="boost_6h_price"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
                          £{monetizationSettings.boost_6h_price}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>24 Hours Boost</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="1"
                          defaultValue={monetizationSettings.boost_24h_price}
                          id="boost_24h_price"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
                          £{monetizationSettings.boost_24h_price}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other Fees Section */}
                <div>
                  <h3 style={{ color: '#A855F7', fontSize: '20px', fontWeight: '700', marginBottom: '1rem' }}>
                    ⚙️ Other Fees & Features
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Internal Transfer Fee</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={monetizationSettings.internal_transfer_fee_percent}
                          id="internal_transfer_fee_percent"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#A855F7' }}>
                          {monetizationSettings.internal_transfer_fee_percent}%
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Wallet-to-wallet transfers</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Dispute Penalty</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="1"
                          defaultValue={monetizationSettings.dispute_penalty_gbp}
                          id="dispute_penalty_gbp"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#EF4444' }}>
                          £{monetizationSettings.dispute_penalty_gbp}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Applied to losing party</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Arbitrage Alerts</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="1"
                          defaultValue={monetizationSettings.arbitrage_alerts_monthly_price}
                          id="arbitrage_alerts_monthly_price"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#22C55E' }}>
                          £{monetizationSettings.arbitrage_alerts_monthly_price}/mo
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Monthly subscription fee</div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(255, 165, 0, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>OTC Desk Fee</div>
                      {editingMonetization ? (
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={monetizationSettings.otc_fee_percent}
                          id="otc_fee_percent"
                          style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 165, 0, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#FFA500' }}>
                          {monetizationSettings.otc_fee_percent}%
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>Min: £{monetizationSettings.otc_minimum_amount_gbp}</div>
                    </div>
                  </div>
                </div>

                {/* Payment Method Fees Section */}
                <div>
                  <h3 style={{ color: '#A855F7', fontSize: '20px', fontWeight: '700', marginBottom: '1rem' }}>
                    💳 Payment Method Fees
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {monetizationSettings.payment_method_fees && Object.entries(monetizationSettings.payment_method_fees).map(([method, fee]) => (
                      <div key={method} style={{ padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                          {method.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: fee > 0 ? '#00F0FF' : '#22C55E' }}>
                          {fee > 0 ? `+${fee}%` : 'Free'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                {editingMonetization && (
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <Button
                      onClick={() => setEditingMonetization(false)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontWeight: '700',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const updates = {
                          buyer_express_fee_percent: parseFloat(document.getElementById('buyer_express_fee_percent').value),
                          instant_sell_fee_percent: parseFloat(document.getElementById('instant_sell_fee_percent').value),
                          admin_sell_spread_percent: parseFloat(document.getElementById('admin_sell_spread_percent').value),
                          admin_buy_spread_percent: parseFloat(document.getElementById('admin_buy_spread_percent').value),
                          p2p_seller_fee_percent: parseFloat(document.getElementById('p2p_seller_fee_percent').value),
                          seller_verification_price: parseFloat(document.getElementById('seller_verification_price').value),
                          seller_silver_upgrade_price: parseFloat(document.getElementById('seller_silver_upgrade_price').value),
                          seller_gold_upgrade_price: parseFloat(document.getElementById('seller_gold_upgrade_price').value),
                          boost_1h_price: parseFloat(document.getElementById('boost_1h_price').value),
                          boost_6h_price: parseFloat(document.getElementById('boost_6h_price').value),
                          boost_24h_price: parseFloat(document.getElementById('boost_24h_price').value),
                          internal_transfer_fee_percent: parseFloat(document.getElementById('internal_transfer_fee_percent').value),
                          dispute_penalty_gbp: parseFloat(document.getElementById('dispute_penalty_gbp').value),
                          arbitrage_alerts_monthly_price: parseFloat(document.getElementById('arbitrage_alerts_monthly_price').value),
                          otc_fee_percent: parseFloat(document.getElementById('otc_fee_percent').value)
                        };
                        updateMonetizationSettings(updates);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        color: '#000',
                        fontWeight: '700',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      💾 Save Changes
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!monetizationSettings && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⏳</div>
                <div>Loading monetization settings...</div>
              </div>
            )}
          </Card>
        )}

        {/* ADMIN PLATFORM WALLET TAB */}
        {activeTab === 'platform-wallet' && (
          <AdminPlatformWallet />
        )}

        {/* SUPPORT CHAT TAB */}
        {activeTab === 'support-chat' && (
          <AdminSupportChat />
        )}

      </div>

      {/* Monetization Breakdown Modal */}
      {showMonetizationModal && monetizationBreakdown && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(10px)',
          padding: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid #A855F7',
            boxShadow: '0 0 50px rgba(168, 85, 247, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#A855F7' }}>
                🎯 13-Feature Monetization Breakdown
              </h2>
              <button
                onClick={() => setShowMonetizationModal(false)}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#EF4444',
                  border: '2px solid #EF4444',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', border: '2px solid rgba(168, 85, 247, 0.3)' }}>
              <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem' }}>Total Revenue from All Features</div>
              <div style={{ fontSize: '48px', fontWeight: '900', color: '#A855F7' }}>
                £{monetizationBreakdown.total_revenue_gbp?.toLocaleString() || '0'}
              </div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                Period: {revenuePeriod === 'all' ? 'All Time' : `Last ${revenuePeriod}`}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {monetizationBreakdown.breakdown && Object.entries(monetizationBreakdown.breakdown).map(([key, data]) => (
                <Card key={key} style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    {data.name}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
                    £{data.revenue_gbp?.toLocaleString() || '0'}
                  </div>
                  {data.transaction_count !== undefined && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {data.transaction_count} transaction{data.transaction_count !== 1 ? 's' : ''}
                    </div>
                  )}
                  {data.active_subscriptions !== undefined && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {data.active_subscriptions} active subscription{data.active_subscriptions !== 1 ? 's' : ''}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                💡 <strong style={{ color: '#22C55E' }}>Tip:</strong> All fees are automatically collected and tracked. Adjust individual fee settings in the Monetization tab to optimize revenue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
