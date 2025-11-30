import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  DollarSign, TrendingUp, Users, Activity, Settings, Zap,
  AlertCircle, Wallet, ArrowUpDown, RefreshCw, Shield, Database,
  Download, FileText, Lock, Key, Bell, BarChart3, PieChart,
  TrendingDown, Plus, Minus, Edit, Check, X, ArrowUp, ArrowDown
} from 'lucide-react';
import ReactApexChart from 'react-apexcharts';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminBusinessDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  
  // Revenue data
  const [revenueData, setRevenueData] = useState({
    today: 0,
    week: 0,
    month: 0,
    allTime: 0,
    breakdown: {}
  });
  
  // Customer data
  const [customerData, setCustomerData] = useState({
    newToday: 0,
    newWeek: 0,
    newMonth: 0,
    totalUsers: 0,
    activeUsers24h: 0,
    topTraders: [],
    topP2PSellers: []
  });
  
  // Referral data
  const [referralData, setReferralData] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    standardReferrals: 0,
    goldenReferrals: 0
  });
  
  // Liquidity data
  const [liquidityData, setLiquidityData] = useState({});
  
  // Fee management
  const [fees, setFees] = useState({});
  const [editingFee, setEditingFee] = useState(null);
  const [tempFeeValue, setTempFeeValue] = useState('');
  
  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [transactionFilter, setTransactionFilter] = useState('all');
  
  // System health
  const [systemHealth, setSystemHealth] = useState({
    apiHealth: 'good',
    nowpaymentsStatus: 'connected',
    walletStatus: 'operational',
    queueStatus: 'running',
    errors: []
  });
  
  // Savings & Staking
  const [savingsData, setSavingsData] = useState({
    products: [],
    totalLocked: 0,
    activeLocksCount: 0
  });
  
  // Security
  const [securityData, setSecurityData] = useState({
    failedLogins: 0,
    twoFAActivations: 0,
    suspiciousActivity: []
  });
  
  const [period, setPeriod] = useState('all');
  
  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/admin/login');
      return;
    }
    
    const user = JSON.parse(userData);
    if (!user.is_admin) {
      navigate('/');
      return;
    }
    
    loadAllData();
  }, [navigate, period]);
  
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRevenueData(),
        loadCustomerData(),
        loadReferralData(),
        loadLiquidityData(),
        loadFees(),
        loadTransactions(),
        loadSystemHealth(),
        loadSavingsData(),
        loadSecurityData()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadRevenueData = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/revenue/complete?period=${period}`);
      if (response.data.success) {
        setRevenueData(response.data.revenue);
      }
    } catch (error) {
      console.error('Failed to load revenue data:', error);
    }
  };
  
  const loadCustomerData = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/customer-analytics`);
      if (response.data.success) {
        setCustomerData(response.data.analytics);
      }
    } catch (error) {
      console.error('Failed to load customer data:', error);
    }
  };
  
  const loadReferralData = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/referral-analytics`);
      if (response.data.success) {
        setReferralData(response.data.referrals);
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    }
  };
  
  const loadLiquidityData = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/liquidity/status`);
      if (response.data.success) {
        setLiquidityData(response.data.liquidity);
      }
    } catch (error) {
      console.error('Failed to load liquidity data:', error);
    }
  };
  
  const loadFees = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/fees/all`);
      if (response.data.success) {
        setFees(response.data.fees);
      }
    } catch (error) {
      console.error('Failed to load fees:', error);
    }
  };
  
  const loadTransactions = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/transactions/recent?limit=100&filter=${transactionFilter}`);
      if (response.data.success) {
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };
  
  const loadSystemHealth = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/system-health`);
      if (response.data.success) {
        setSystemHealth(response.data.health);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    }
  };
  
  const loadSavingsData = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/savings/overview`);
      if (response.data.success) {
        setSavingsData(response.data.savings);
      }
    } catch (error) {
      console.error('Failed to load savings data:', error);
    }
  };
  
  const loadSecurityData = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/security/overview`);
      if (response.data.success) {
        setSecurityData(response.data.security);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    }
  };
  
  const handleUpdateFee = async (feeType, newValue) => {
    try {
      const response = await axios.post(`${API}/api/admin/fees/update`, {
        fee_type: feeType,
        value: parseFloat(newValue)
      });
      if (response.data.success) {
        toast.success('Fee updated successfully - changes applied across entire platform');
        setEditingFee(null);
        setTempFeeValue('');
        await loadFees();
        await loadRevenueData();
      }
    } catch (error) {
      toast.error('Failed to update fee');
    }
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00F0FF'
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: '1rem', fontSize: '18px' }}>Loading Business Dashboard...</div>
        </div>
      </div>
    );
  }
  
  const revenueChartOptions = {
    chart: { type: 'line', background: 'transparent', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 3, colors: ['#00F0FF'] },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], labels: { style: { colors: '#A3AEC2' } } },
    yaxis: { labels: { style: { colors: '#A3AEC2' } } },
    grid: { borderColor: 'rgba(255,255,255,0.1)' },
    theme: { mode: 'dark' }
  };
  
  const donutChartOptions = {
    chart: { type: 'donut', background: 'transparent' },
    labels: ['P2P', 'Swap', 'Instant Buy', 'Express Buy', 'Withdrawals', 'PayPal', 'Other'],
    colors: ['#00F0FF', '#A855F7', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'],
    legend: { position: 'bottom', labels: { colors: '#A3AEC2' } },
    theme: { mode: 'dark' }
  };
  
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Business Dashboard
            </h1>
            <p style={{ color: '#A3AEC2', fontSize: '15px' }}>Complete platform control center - all fees and analytics</p>
          </div>
          <button
            onClick={loadAllData}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={18} />
            Refresh All
          </button>
        </div>
        
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          scrollbarWidth: 'thin'
        }}>
          {[
            { id: 'revenue', label: 'Revenue Analytics', icon: DollarSign },
            { id: 'fees', label: 'Fee Management', icon: Settings },
            { id: 'customers', label: 'Customer Overview', icon: Users },
            { id: 'referrals', label: 'Referral Analytics', icon: TrendingUp },
            { id: 'liquidity', label: 'Liquidity', icon: Wallet },
            { id: 'transactions', label: 'Transactions', icon: ArrowUpDown },
            { id: 'health', label: 'System Health', icon: Activity },
            { id: 'savings', label: 'Savings & Staking', icon: Database },
            { id: 'security', label: 'Security', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px',
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${activeTab === tab.id ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '12px',
                  color: activeTab === tab.id ? '#000' : '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}</div>
        
        {/* Tab Content */}
        {activeTab === 'revenue' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>Revenue Analytics</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['day', 'week', 'month', 'all'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      padding: '8px 16px',
                      background: period === p ? '#00F0FF' : 'rgba(255,255,255,0.05)',
                      border: 'none',
                      borderRadius: '8px',
                      color: period === p ? '#000' : '#fff',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Revenue Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {[
                { label: 'Today', value: revenueData.today, color: '#00F0FF' },
                { label: '7 Days', value: revenueData.week, color: '#A855F7' },
                { label: '30 Days', value: revenueData.month, color: '#22C55E' },
                { label: 'All Time', value: revenueData.allTime, color: '#F59E0B' }
              ].map((card, idx) => (
                <div key={idx} style={{
                  background: `rgba(${card.color === '#00F0FF' ? '0,240,255' : card.color === '#A855F7' ? '168,85,247' : card.color === '#22C55E' ? '34,197,94' : '245,158,11'},0.1)`,
                  border: `2px solid rgba(${card.color === '#00F0FF' ? '0,240,255' : card.color === '#A855F7' ? '168,85,247' : card.color === '#22C55E' ? '34,197,94' : '245,158,11'},0.3)`,
                  borderRadius: '16px',
                  padding: '1.5rem'
                }}>
                  <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '0.5rem' }}>{card.label}</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: card.color }}>{formatCurrency(card.value)}</div>
                </div>
              ))}
            </div>
            
            {/* Revenue Breakdown - 14+ streams */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Revenue by Stream</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {[
                  { name: 'P2P Trade Fees', value: revenueData.breakdown?.p2p || 0, icon: ArrowUpDown },
                  { name: 'Swap Fees', value: revenueData.breakdown?.swap || 0, icon: RefreshCw },
                  { name: 'Instant Buy', value: revenueData.breakdown?.instantBuy || 0, icon: Zap },
                  { name: 'Instant Sell', value: revenueData.breakdown?.instantSell || 0, icon: TrendingDown },
                  { name: 'Express Buy', value: revenueData.breakdown?.expressBuy || 0, icon: TrendingUp },
                  { name: 'Withdrawal Fees', value: revenueData.breakdown?.withdrawals || 0, icon: ArrowDown },
                  { name: 'Deposit Fees', value: revenueData.breakdown?.deposits || 0, icon: ArrowUp },
                  { name: 'PayPal → PayPal', value: revenueData.breakdown?.paypal || 0, icon: DollarSign },
                  { name: 'Liquidity Spread', value: revenueData.breakdown?.liquiditySpread || 0, icon: Wallet },
                  { name: 'Early Withdrawal Penalties', value: revenueData.breakdown?.earlyWithdrawal || 0, icon: AlertCircle },
                  { name: 'Staking Fees', value: revenueData.breakdown?.staking || 0, icon: Database },
                  { name: 'Cross-Wallet Conversion', value: revenueData.breakdown?.crossWallet || 0, icon: ArrowUpDown },
                  { name: 'Internal Transfers', value: revenueData.breakdown?.internalTransfer || 0, icon: RefreshCw }
                ].map((stream, idx) => {
                  const Icon = stream.icon;
                  return (
                    <div key={idx} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '2px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Icon size={16} color='#00F0FF' />
                        <div style={{ fontSize: '14px', color: '#A3AEC2' }}>{stream.name}</div>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{formatCurrency(stream.value)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Revenue Trend</h3>
                <ReactApexChart options={revenueChartOptions} series={[{ name: 'Revenue', data: [120, 230, 180, 340, 290, 410, 480] }]} type="line" height={300} />
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Revenue Distribution</h3>
                <ReactApexChart options={donutChartOptions} series={[30, 25, 15, 10, 8, 7, 5]} type="donut" height={300} />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'fees' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Fee Management</h2>
            <p style={{ color: '#A3AEC2', marginBottom: '2rem' }}>Update fees instantly - changes apply across entire platform automatically</p>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {Object.entries(fees).sort((a, b) => a[0].localeCompare(b[0])).map(([key, value]) => (
                <div key={key} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                      {key.replace(/_/g, ' ').replace(/percent/g, '').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#A3AEC2' }}>Current: {value}%</div>
                  </div>
                  
                  {editingFee === key ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={tempFeeValue}
                        onChange={(e) => setTempFeeValue(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '2px solid rgba(0,240,255,0.3)',
                          borderRadius: '8px',
                          color: '#fff',
                          width: '100px'
                        }}
                      />
                      <button
                        onClick={() => handleUpdateFee(key, tempFeeValue)}
                        style={{
                          padding: '8px 12px',
                          background: '#22C55E',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#000',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFee(null);
                          setTempFeeValue('');
                        }}
                        style={{
                          padding: '8px 12px',
                          background: '#EF4444',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingFee(key);
                        setTempFeeValue(value.toString());
                      }}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'rgba(0,240,255,0.1)',
              border: '2px solid rgba(0,240,255,0.3)',
              borderRadius: '12px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>Referral Commission Info</h3>
              <p style={{ fontSize: '14px', color: '#A3AEC2', lineHeight: '1.6' }}>
                Referral percentages (20% standard, 50% golden) are PAYOUTS to referrers from platform profit, NOT fees charged to users.
                <br /><br />
                Example: If an invitee pays £10 fee, standard referrer gets £2 (20%), golden referrer gets £5 (50%). These are deducted from platform's £10 profit.
              </p>
            </div>
          </div>
        )}
        
        {activeTab === 'customers' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Customer Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {[
                { label: 'New Today', value: customerData.newToday, color: '#00F0FF' },
                { label: 'New This Week', value: customerData.newWeek, color: '#A855F7' },
                { label: 'New This Month', value: customerData.newMonth, color: '#22C55E' },
                { label: 'Total Users', value: customerData.totalUsers, color: '#F59E0B' },
                { label: 'Active (24h)', value: customerData.activeUsers24h, color: '#EF4444' }
              ].map((stat, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '0.5rem' }}>{stat.label}</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: stat.color }}>{stat.value || 0}</div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Top Traders</h3>
                {(customerData.topTraders || []).length === 0 ? (
                  <div style={{ color: '#A3AEC2' }}>No data yet</div>
                ) : (
                  customerData.topTraders.map((trader, idx) => (
                    <div key={idx} style={{
                      padding: '0.75rem',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: '#fff' }}>{trader.email}</span>
                      <span style={{ color: '#00F0FF' }}>{trader.tradeCount} trades</span>
                    </div>
                  ))
                )}
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Top P2P Sellers</h3>
                {(customerData.topP2PSellers || []).length === 0 ? (
                  <div style={{ color: '#A3AEC2' }}>No data yet</div>
                ) : (
                  customerData.topP2PSellers.map((seller, idx) => (
                    <div key={idx} style={{
                      padding: '0.75rem',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: '#fff' }}>{seller.email}</span>
                      <span style={{ color: '#A855F7' }}>{seller.salesCount} sales</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'referrals' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Referral Analytics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Referrals', value: referralData.totalReferrals, color: '#00F0FF' },
                { label: 'Active Referrals', value: referralData.activeReferrals, color: '#A855F7' },
                { label: 'Standard Tier', value: referralData.standardReferrals, color: '#22C55E' },
                { label: 'Golden Tier', value: referralData.goldenReferrals, color: '#F59E0B' },
                { label: 'Total Commissions', value: formatCurrency(referralData.totalCommissions), color: '#EF4444', isCurrency: true },
                { label: 'Pending Commissions', value: formatCurrency(referralData.pendingCommissions), color: '#8B5CF6', isCurrency: true }
              ].map((stat, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '0.5rem' }}>{stat.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: stat.color }}>
                    {stat.isCurrency ? stat.value : (stat.value || 0)}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'rgba(168,85,247,0.1)',
              border: '2px solid rgba(168,85,247,0.3)',
              borderRadius: '12px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#A855F7', marginBottom: '0.5rem' }}>How Referral Commissions Work</h3>
              <p style={{ fontSize: '14px', color: '#A3AEC2', lineHeight: '1.6' }}>
                • Standard referrers earn 20% commission on fees generated by their invitees<br />
                • Golden referrers earn 50% commission on fees generated by their invitees<br />
                • Commissions are paid FROM platform profit, not added as extra fees<br />
                • Example: User pays £10 fee → Platform profit = £10 → Standard referrer gets £2 (20%) → Platform keeps £8
              </p>
            </div>
          </div>
        )}
        
        {/* Placeholder content for other tabs */}
        {['liquidity', 'transactions', 'health', 'savings', 'security'].includes(activeTab) && (
          <div style={{ color: '#fff', textAlign: 'center', padding: '4rem' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '1rem' }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tab</h2>
            <p style={{ color: '#A3AEC2' }}>Content for this tab is being loaded...</p>
          </div>
        )}
      </div>
    </div>
  );
}
