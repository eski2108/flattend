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

const FEE_CATEGORIES = {
  'TRADING & WALLET FEES': [
    { key: 'instant_buy_fee_percent', label: 'Instant Buy Fee', type: 'percent' },
    { key: 'instant_sell_fee_percent', label: 'Instant Sell Fee', type: 'percent' },
    { key: 'crypto_swap_fee_percent', label: 'Crypto Swap Fee', type: 'percent' },
    { key: 'p2p_express_fee_percent', label: 'P2P Express Fee', type: 'percent' },
    { key: 'p2p_trade_fee_percent', label: 'P2P Trade Fee', type: 'percent' },
    { key: 'crypto_withdrawal_fee_percent', label: 'Crypto Withdrawal Fee', type: 'percent' },
    { key: 'crypto_deposit_fee_percent', label: 'Crypto Deposit Fee', type: 'percent', note: 'Must stay FREE (0%)' }
  ],
  'PAYMENT FEES': [
    { key: 'paypal_to_paypal_fee_percent', label: 'PayPal → PayPal Fee', type: 'percent', note: 'Covers PayPal cost + profit' }
  ],
  'SAVINGS / STAKING / INTERNAL OPS': [
    { key: 'early_withdrawal_penalty_percent', label: 'Early Withdrawal Penalty (Savings Vault)', type: 'percent' },
    { key: 'staking_admin_fee_percent', label: 'Staking Admin Fee', type: 'percent', note: '% of staking rewards' },
    { key: 'admin_liquidity_spread_percent', label: 'Admin Liquidity Spread', type: 'percent' },
    { key: 'cross_wallet_conversion_fee_percent', label: 'Cross-Wallet Conversion Fee', type: 'percent' },
    { key: 'internal_transfer_fee_percent', label: 'Internal Transfer Fee', type: 'percent', note: 'Must stay FREE (0%)' }
  ],
  'SERVICE / PLATFORM MONETIZATION': [
    { key: 'priority_support_fee_gbp', label: 'Priority Support Fast-Track Fee', type: 'flat' },
    { key: 'p2p_advert_promotion_fee_gbp', label: 'P2P Advert / Promotion Slots', type: 'flat', note: 'Per 24 hours' }
  ],
  'REFERRALS': [
    { key: 'referral_commission_percent', label: 'Referral Commission', type: 'percent', isReferral: true, note: 'PAYOUT to referrer, NOT a fee' }
  ],
  'DISPUTE HANDLING': [
    { key: 'p2p_dispute_fee_gbp', label: 'P2P Dispute Fee', type: 'flat', note: 'Taken from seller' }
  ]
};

export default function AdminBusinessDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fees');
  
  const [revenueData, setRevenueData] = useState({
    today: 0, week: 0, month: 0, allTime: 0, breakdown: {}
  });
  
  const [customerData, setCustomerData] = useState({
    newToday: 0, newWeek: 0, newMonth: 0, totalUsers: 0, activeUsers24h: 0,
    topTraders: [], topP2PSellers: []
  });
  
  const [referralData, setReferralData] = useState({
    totalReferrals: 0, activeReferrals: 0, totalCommissions: 0,
    pendingCommissions: 0, standardReferrals: 0, goldenReferrals: 0
  });
  
  const [fees, setFees] = useState({});
  const [editingFee, setEditingFee] = useState(null);
  const [tempFeeValue, setTempFeeValue] = useState('');
  
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
        loadFees(),
        loadRevenueData(),
        loadCustomerData(),
        loadReferralData()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
  
  const handleUpdateFee = async (feeKey, newValue) => {
    try {
      const response = await axios.post(`${API}/api/admin/fees/update`, {
        fee_type: feeKey,
        value: parseFloat(newValue)
      });
      if (response.data.success) {
        toast.success('Fee updated - changes applied across entire platform');
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
              CoinHubX Business Dashboard
            </h1>
            <p style={{ color: '#A3AEC2', fontSize: '15px' }}>17 Revenue Streams - NO KYC - Complete Fee Control</p>
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
            { id: 'fees', label: 'Fee Management (17 Streams)', icon: Settings },
            { id: 'revenue', label: 'Revenue Analytics', icon: DollarSign },
            { id: 'customers', label: 'Customer Overview', icon: Users },
            { id: 'referrals', label: 'Referral Tracking', icon: TrendingUp }
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
        
        {/* Fee Management Tab */}
        {activeTab === 'fees' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Fee Management - 17 Revenue Streams</h2>
            <p style={{ color: '#A3AEC2', marginBottom: '2rem' }}>
              Edit any fee below - changes apply instantly across P2P, Instant Buy/Sell, Swap, Withdrawals, Savings, Staking, and Liquidity.
              <br />All fees (except referrals) go directly to owner/admin wallet.
            </p>
            
            {Object.entries(FEE_CATEGORIES).map(([categoryName, categoryFees]) => (
              <div key={categoryName} style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#00F0FF',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {categoryName}
                </h3>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {categoryFees.map(feeItem => {
                    const currentValue = fees[feeItem.key] || 0;
                    const isEditing = editingFee === feeItem.key;
                    
                    return (
                      <div key={feeItem.key} style={{
                        background: feeItem.isReferral ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${feeItem.isReferral ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '12px',
                        padding: '1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}>
                        <div style={{ flex: '1', minWidth: '250px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                            {feeItem.label}
                          </div>
                          <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '0.25rem' }}>
                            Current: {feeItem.type === 'flat' ? `£${currentValue.toFixed(2)}` : `${currentValue}%`}
                          </div>
                          {feeItem.note && (
                            <div style={{ fontSize: '13px', color: feeItem.isReferral ? '#A855F7' : '#F59E0B', marginTop: '0.25rem' }}>
                              {feeItem.note}
                            </div>
                          )}
                        </div>
                        
                        {feeItem.isReferral ? (
                          <div style={{
                            padding: '8px 16px',
                            background: 'rgba(168,85,247,0.2)',
                            borderRadius: '8px',
                            color: '#A855F7',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}>
                            Tracking Only
                          </div>
                        ) : (
                          <>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  step={feeItem.type === 'flat' ? '0.01' : '0.1'}
                                  value={tempFeeValue}
                                  onChange={(e) => setTempFeeValue(e.target.value)}
                                  placeholder={feeItem.type === 'flat' ? 'GBP' : '%'}
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
                                  onClick={() => handleUpdateFee(feeItem.key, tempFeeValue)}
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
                                  setEditingFee(feeItem.key);
                                  setTempFeeValue(currentValue.toString());
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
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Important Info Panel */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'rgba(0,240,255,0.1)',
              border: '2px solid rgba(0,240,255,0.3)',
              borderRadius: '12px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.75rem' }}>
                ✅ How Fee Updates Work
              </h3>
              <ul style={{ fontSize: '14px', color: '#A3AEC2', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                <li>All fees (except Referral Commission) go directly to owner/admin wallet</li>
                <li>Referral Commission (20%) is a PAYOUT from your earnings to the referrer</li>
                <li>When you edit a fee here, it automatically updates across:
                  <ul style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
                    <li>P2P marketplace</li>
                    <li>Instant Buy/Sell pages</li>
                    <li>Swap page</li>
                    <li>Wallet withdrawals</li>
                    <li>Savings vault</li>
                    <li>Staking dashboard</li>
                    <li>Admin liquidity operations</li>
                  </ul>
                </li>
                <li>Changes take effect immediately for new transactions</li>
                <li>No KYC fees exist - platform is completely KYC-free</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Revenue Tab */}
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
            
            <div style={{ color: '#A3AEC2', textAlign: 'center', padding: '2rem' }}>
              Revenue breakdown by stream coming soon...
            </div>
          </div>
        )}
        
        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Customer Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {[
                { label: 'New Today', value: customerData.newToday, color: '#00F0FF' },
                { label: 'New This Week', value: customerData.newWeek, color: '#A855F7' },
                { label: 'Total Users', value: customerData.totalUsers, color: '#22C55E' },
                { label: 'Active (24h)', value: customerData.activeUsers24h, color: '#F59E0B' }
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
          </div>
        )}
        
        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Referral Tracking</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Referrals', value: referralData.totalReferrals, color: '#00F0FF' },
                { label: 'Active Referrals', value: referralData.activeReferrals, color: '#A855F7' },
                { label: 'Total Commissions', value: formatCurrency(referralData.totalCommissions), color: '#EF4444', isCurrency: true },
                { label: 'Pending Commissions', value: formatCurrency(referralData.pendingCommissions), color: '#F59E0B', isCurrency: true }
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
                • Referral commission is 20% of fees generated by invitees<br />
                • This is a PAYOUT from your profit, NOT a fee charged to customers<br />
                • Example: User pays £10 fee → Referrer gets £2 (20%) → You keep £8<br />
                • Commissions are tracked here for transparency
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
