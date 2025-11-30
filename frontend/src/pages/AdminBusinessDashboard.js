import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  DollarSign, TrendingUp, Users, Activity, Settings, Zap,
  AlertCircle, Wallet, ArrowUpDown, RefreshCw, Shield, Database,
  Download, FileText, Lock, Key, Bell, BarChart3, PieChart,
  TrendingDown, Plus, Minus, Edit, Check, X
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
  
  // Customer analytics
  const [customerData, setCustomerData] = useState({
    newToday: 0,
    newWeek: 0,
    newMonth: 0,
    totalUsers: 0,
    activeUsers24h: 0
  });
  
  // Referral analytics
  const [referralData, setReferralData] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    earnings: 0,
    payouts: 0
  });
  
  // Liquidity management
  const [liquidityData, setLiquidityData] = useState({});
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [liquidityForm, setLiquidityForm] = useState({ currency: 'BTC', amount: '' });
  
  // Fee management
  const [fees, setFees] = useState({
    withdraw_fee_percent: 1.0,
    p2p_trade_fee_percent: 1.0,
    swap_fee_percent: 1.0,
    express_buy_fee_percent: 1.0,
    deposit_fee_percent: 0.0
  });
  const [editingFee, setEditingFee] = useState(null);
  
  // Transaction logs
  const [transactions, setTransactions] = useState([]);
  
  // System health
  const [systemHealth, setSystemHealth] = useState({
    errors: [],
    failedDeposits: 0,
    failedWithdrawals: 0
  });
  
  // Savings management
  const [savingsProducts, setSavingsProducts] = useState([]);
  
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
  }, [navigate]);
  
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
        loadSavingsProducts()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const loadRevenueData = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/revenue/summary?period=all`);
      if (response.data.success) {
        setRevenueData(response.data.summary);
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
      const response = await axios.get(`${API}/api/admin/fee-settings`);
      if (response.data.success) {
        setFees(response.data.fees);
      }
    } catch (error) {
      console.error('Failed to load fees:', error);
    }
  };
  
  const loadTransactions = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/transactions/recent?limit=50`);
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
  
  const loadSavingsProducts = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/savings/products`);
      if (response.data.success) {
        setSavingsProducts(response.data.products);
      }
    } catch (error) {
      console.error('Failed to load savings products:', error);
    }
  };
  
  const handleAddLiquidity = async () => {
    try {
      await axios.post(`${API}/api/admin/liquidity/add`, liquidityForm);
      toast.success('Liquidity added successfully');
      setShowAddLiquidity(false);
      setLiquidityForm({ currency: 'BTC', amount: '' });
      loadLiquidityData();
    } catch (error) {
      toast.error('Failed to add liquidity');
    }
  };
  
  const handleUpdateFee = async (feeType, newValue) => {
    try {
      await axios.post(`${API}/api/admin/update-fee`, {
        fee_type: feeType,
        value: parseFloat(newValue)
      });
      toast.success('Fee updated successfully');
      setEditingFee(null);
      loadFees();
    } catch (error) {
      toast.error('Failed to update fee');
    }
  };
  
  // ApexCharts configurations
  const revenueChartOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false }
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#00F0FF']
    },
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      labels: { style: { colors: '#A3AEC2' } }
    },
    yaxis: {
      labels: { style: { colors: '#A3AEC2' } }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.1)'
    },
    theme: { mode: 'dark' }
  };
  
  const revenueChartSeries = [{
    name: 'Revenue',
    data: [120, 230, 180, 340, 290, 410, 480]
  }];
  
  const donutChartOptions = {
    chart: {
      type: 'donut',
      background: 'transparent'
    },
    labels: ['P2P Fees', 'Swap Fees', 'Withdraw Fees', 'Express Buy'],
    colors: ['#00F0FF', '#A855F7', '#22C55E', '#F59E0B'],
    legend: {
      position: 'bottom',
      labels: { colors: '#A3AEC2' }
    },
    theme: { mode: 'dark' }
  };
  
  const donutChartSeries = [45, 25, 20, 10];
  
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
          <RefreshCw size={48} className="spin" />
          <div style={{ marginTop: '1rem', fontSize: '18px' }}>Loading Business Dashboard...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <p style={{ color: '#A3AEC2', fontSize: '15px' }}>Complete platform control center</p>
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
          paddingBottom: '1rem'
        }}>
          {[
            { id: 'revenue', label: 'Revenue', icon: DollarSign },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'referrals', label: 'Referrals', icon: TrendingUp },
            { id: 'liquidity', label: 'Liquidity', icon: Wallet },
            { id: 'fees', label: 'Fee Management', icon: Settings },
            { id: 'transactions', label: 'Transactions', icon: ArrowUpDown },
            { id: 'health', label: 'System Health', icon: Activity },
            { id: 'savings', label: 'Savings', icon: Database },
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
          })}
        </div>
        
        {/* Tab Content */}
        {activeTab === 'revenue' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Revenue Overview</h2>
            
            {/* Revenue Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '0.5rem' }}>Today</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF' }}>£{revenueData.today?.toFixed(2) || '0.00'}</div>
              </div>
              
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '0.5rem' }}>7 Days</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7' }}>£{revenueData.week?.toFixed(2) || '0.00'}</div>
              </div>
              
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '0.5rem' }}>30 Days</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#22C55E' }}>£{revenueData.month?.toFixed(2) || '0.00'}</div>
              </div>
              
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '2px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '0.5rem' }}>All Time</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#F59E0B' }}>£{revenueData.allTime?.toFixed(2) || '0.00'}</div>
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
                <ReactApexChart options={revenueChartOptions} series={revenueChartSeries} type="line" height={300} />
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Revenue Breakdown</h3>
                <ReactApexChart options={donutChartOptions} series={donutChartSeries} type="donut" height={300} />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'fees' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Fee Management</h2>
            <p style={{ color: '#A3AEC2', marginBottom: '2rem' }}>Update fees instantly across the entire platform</p>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {Object.entries(fees).map(([key, value]) => (
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
                        defaultValue={value}
                        id={`fee-${key}`}
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
                        onClick={() => {
                          const newValue = document.getElementById(`fee-${key}`).value;
                          handleUpdateFee(key, newValue);
                        }}
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
                        onClick={() => setEditingFee(null)}
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
                      onClick={() => setEditingFee(key)}
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
          </div>
        )}
        
        {/* Other tabs would be implemented here */}
        {activeTab === 'customers' && (
          <div style={{ color: '#fff' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '1.5rem' }}>Customer Analytics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#A3AEC2' }}>New Today</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF' }}>{customerData.newToday}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#A3AEC2' }}>New This Week</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#A855F7' }}>{customerData.newWeek}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#A3AEC2' }}>Total Users</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#22C55E' }}>{customerData.totalUsers}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#A3AEC2' }}>Active (24h)</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#F59E0B' }}>{customerData.activeUsers24h}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
