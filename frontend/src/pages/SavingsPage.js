import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoCash as DollarSign, IoChatbubbles, IoGlobe, IoLockClosed as Lock, IoTrendingUp } from 'react-icons/io5';
import { BiArrowToTop, BiArrowFromTop } from 'react-icons/bi';;
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
const API = 'https://coinhubx.net/api';

// API already defined

// Currency configuration
const CURRENCIES = {
  'GBP': { symbol: '£', name: 'British Pound', rate: 1.0 },
  'USD': { symbol: '$', name: 'US Dollar', rate: 1.27 },
  'EUR': { symbol: '€', name: 'Euro', rate: 1.17 },
  'CAD': { symbol: 'C$', name: 'Canadian Dollar', rate: 1.71 },
  'AUD': { symbol: 'A$', name: 'Australian Dollar', rate: 1.96 },
  'JPY': { symbol: '¥', name: 'Japanese Yen', rate: 194.5 },
  'CHF': { symbol: 'Fr', name: 'Swiss Franc', rate: 1.13 },
  'CNY': { symbol: '¥', name: 'Chinese Yuan', rate: 9.18 },
  'INR': { symbol: '₹', name: 'Indian Rupee', rate: 106.5 },
  'BRL': { symbol: 'R$', name: 'Brazilian Real', rate: 6.25 },
  'ZAR': { symbol: 'R', name: 'South African Rand', rate: 22.8 },
  'NGN': { symbol: '₦', name: 'Nigerian Naira', rate: 1950 },
  'AED': { symbol: 'د.إ', name: 'UAE Dirham', rate: 4.66 },
  'SAR': { symbol: '﷼', name: 'Saudi Riyal', rate: 4.76 }
};

// CHXCard Component
const CHXCard = ({ children, className = '' }) => (
  <div className={`rounded-[22px] border border-cyan-400/25 bg-[#030A14]/80 shadow-[0_0_25px_rgba(0,234,255,0.15)] backdrop-blur-sm ${className}`}
    style={{
      boxShadow: '0 0 25px rgba(0, 234, 255, 0.15), inset 0 0 25px rgba(0, 234, 255, 0.05)'
    }}>
    {children}
  </div>
);

// CHXMetricTile Component
const CHXMetricTile = ({ icon: Icon, title, value, description, disabled = false }) => (
  <div className={`rounded-[18px] border ${disabled ? 'border-gray-600/30' : 'border-cyan-400/25'} bg-[#030A14]/70 p-5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,234,255,0.2)]`}
    style={{
      opacity: disabled ? 0.6 : 1
    }}>
    <div style={{ marginBottom: '12px', color: disabled ? '#6B7280' : '#00E5FF' }}>
      <Icon size={32} strokeWidth={2.5} />
    </div>
    <div style={{ fontSize: '13px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: '600' }}>
      {title}
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: disabled ? '#6B7280' : '#00E5FF', marginBottom: '4px' }}>
      {value}
    </div>
    {description && (
      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
        {description}
      </div>
    )}
  </div>
);

// CHXHeaderHero Component
const CHXHeaderHero = ({ title, subtitle, icon: Icon }) => (
  <div style={{
    padding: '28px 0 20px 0',
    background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
    borderRadius: '16px',
    marginBottom: '32px',
    border: '1px solid rgba(0, 229, 255, 0.1)'
  }}>
    <h1 style={{
      fontSize: '42px',
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: '12px',
      textAlign: 'center',
      letterSpacing: '-0.5px'
    }}>
      {title}
    </h1>
    <p style={{
      fontSize: '16px',
      color: '#D1D5DB',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }}>
      <Icon size={20} color="#00E5FF" strokeWidth={2.5} />
      {subtitle}
    </p>
  </div>
);

// CHXFloatingChatBubble Component
const CHXFloatingChatBubble = ({ onClick }) => (
  <div
    onClick={onClick}
    style={{
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      width: '62px',
      height: '62px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #00E5FF, #A855F7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 0 30px rgba(0, 229, 255, 0.5)',
      transition: 'all 0.3s ease',
      zIndex: 1000
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
      e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 229, 255, 0.7)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) scale(1)';
      e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 229, 255, 0.5)';
    }}
  >
    <IoChatbubbles size={28} color="white" strokeWidth={2.5} />
  </div>
);

export default function SavingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingsBalances, setSavingsBalances] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferDirection, setTransferDirection] = useState('to_savings');
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [transferAmount, setTransferAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('GBP');

  useEffect(() => {
    fetchSavings();
  }, []);

  const fetchSavings = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(userData);
      const userId = user.user_id;

      const response = await axios.get(`${API}/api/savings/balances/${userId}`);
      if (response.data.success) {
        setSavingsBalances(response.data.balances);
        setTotalValue(response.data.total_value_usd);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching savings:', error);
      toast.error('Failed to load savings');
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    try {
      if (!transferAmount || parseFloat(transferAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      setProcessing(true);
      const userData = localStorage.getItem('cryptobank_user');
      const user = JSON.parse(userData);
      const userId = user.user_id;

      const response = await axios.post(`${API}/api/savings/transfer`, {
        user_id: userId,
        currency: selectedCurrency,
        amount: parseFloat(transferAmount),
        direction: transferDirection
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowTransferModal(false);
        setTransferAmount('');
        fetchSavings();
      } else {
        toast.error(response.data.message || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setProcessing(false);
    }
  };

  // Convert USD to selected display currency
  const convertCurrency = (usdAmount) => {
    const rate = CURRENCIES[displayCurrency].rate / CURRENCIES['USD'].rate;
    return (usdAmount * rate).toFixed(2);
  };

  const currencySymbol = CURRENCIES[displayCurrency].symbol;
  const displayValue = convertCurrency(totalValue);
  const savingsRatio = 0; // Calculate from portfolio
  const estimatedAPY = '4.5%';

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#00E5FF', fontSize: '18px', fontWeight: '600' }}>Loading savings...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)',
        padding: '20px 16px',
        paddingBottom: '100px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* SECTION 1: Hero Title Block */}
          <CHXHeaderHero
            title="Crypto Savings"
            subtitle="Earn passive rewards and grow your crypto automatically."
            icon={PiggyBank}
          />

          {/* SECTION 2: Main Savings Balance Card */}
          <CHXCard className="mb-6">
            <div style={{ padding: '24px' }}>
              {/* Currency Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                  TOTAL SAVINGS BALANCE
                </div>
                <div style={{ position: 'relative' }}>
                  <select
                    value={displayCurrency}
                    onChange={(e) => setDisplayCurrency(e.target.value)}
                    style={{
                      padding: '8px 36px 8px 12px',
                      background: 'rgba(0, 229, 255, 0.1)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '10px',
                      color: '#00E5FF',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {Object.entries(CURRENCIES).map(([code, data]) => (
                      <option key={code} value={code}>
                        {data.symbol} {code}
                      </option>
                    ))}
                  </select>
                  <IoGlobe size={16} style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#00E5FF'
                  }} />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '56px', fontWeight: '700', color: '#00E5FF', marginBottom: '8px', textShadow: '0 0 30px rgba(0, 229, 255, 0.5)' }}>
                  {currencySymbol}{displayValue}
                </div>
                <div style={{ fontSize: '16px', color: '#9CA3AF', fontWeight: '500' }}>
                  ≈ ${totalValue.toFixed(2)} USD
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
                gap: '12px'
              }}>
                <CHXButton
                  onClick={() => {
                    setTransferDirection('to_savings');
                    setShowTransferModal(true);
                  }}
                  coinColor="#00E5FF"
                  variant="primary"
                  size="large"
                  fullWidth
                  icon={<BiArrowToTop size={20} />}
                >
                  Transfer to Savings
                </CHXButton>
                
                <CHXButton
                  onClick={() => {
                    setTransferDirection('to_spot');
                    setShowTransferModal(true);
                  }}
                  coinColor="#00E5FF"
                  variant="secondary"
                  size="large"
                  fullWidth
                  icon={<BiArrowFromTop size={20} />}
                >
                  Move Back to Wallet
                </CHXButton>
              </div>
            </div>
          </CHXCard>

          {/* SECTION 3: Savings Stats Widget Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
            gap: '14px',
            marginBottom: '24px'
          }}>
            <CHXMetricTile
              icon={ChartLine}
              title="Estimated APY"
              value={estimatedAPY}
              description="Annual percentage yield"
            />
            
            <CHXMetricTile
              icon={Calculator}
              title="Portfolio Savings Ratio"
              value={`${savingsRatio}%`}
              description="of your holdings earning"
            />
            
            <CHXMetricTile
              icon={Lock}
              title="Locked Rewards"
              value="Coming Soon"
              description="Feature in development"
              disabled
            />
          </div>

          {/* SECTION 4: Empty State Card (if no savings) */}
          {savingsBalances.length === 0 && (
            <CHXCard>
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                  <PiggyBank size={80} color="#00E5FF" strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '12px' }}>
                  No savings yet
                </h3>
                <p style={{ fontSize: '16px', color: '#9CA3AF', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                  Move crypto from your Spot Wallet to start earning daily rewards.
                </p>
                <CHXButton
                  onClick={() => {
                    setTransferDirection('to_savings');
                    setShowTransferModal(true);
                  }}
                  coinColor="#00E5FF"
                  variant="primary"
                  size="large"
                  icon={<Rocket size={20} />}
                >
                  Start Saving
                </CHXButton>
              </div>
            </CHXCard>
          )}

          {/* SECTION 6: Reserve Area for Earnings Chart (Future) */}
          {savingsBalances.length > 0 && (
            <CHXCard className="mt-6">
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Earnings Chart
                </h3>
                <div style={{
                  height: '200px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed rgba(0, 229, 255, 0.2)'
                }}>
                  <div style={{ textAlign: 'center', color: '#6B7280' }}>
                    <IoTrendingUp size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>Chart Coming Soon</p>
                    <p style={{ fontSize: '12px' }}>Track your daily earnings over time</p>
                  </div>
                </div>
              </div>
            </CHXCard>
          )}

          {/* Savings Balances List */}
          {savingsBalances.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>
                Your Savings Assets
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {savingsBalances.map((balance, index) => (
                  <CHXCard key={index}>
                    <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                          {balance.currency}
                        </div>
                        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                          Balance: {balance.savings_balance.toFixed(8)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#00E5FF' }}>
                          {currencySymbol}{convertCurrency(balance.value_usd)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <IoTrendingUp size={14} />
                          +{estimatedAPY} APY
                        </div>
                      </div>
                    </div>
                  </CHXCard>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* SECTION 5: Bottom Floating Chat Icon */}
        <CHXFloatingChatBubble
          onClick={() => toast.info('Support chat coming soon!')}
        />

        {/* Transfer Modal */}
        {showTransferModal && (
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <CHXCard style={{ maxWidth: '500px', width: '100%' }}>
              <div style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '24px' }}>
                  {transferDirection === 'to_savings' ? 'Transfer to Savings' : 'Move to Spot Wallet'}
                </h2>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '8px', display: 'block' }}>
                    Currency
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px'
                    }}
                  >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '8px', display: 'block' }}>
                    Amount
                  </label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <CHXButton
                    onClick={() => setShowTransferModal(false)}
                    coinColor="#6B7280"
                    variant="secondary"
                    size="medium"
                    fullWidth
                  >
                    Cancel
                  </CHXButton>
                  
                  <CHXButton
                    onClick={handleTransfer}
                    coinColor="#00E5FF"
                    variant="primary"
                    size="medium"
                    fullWidth
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Confirm'}
                  </CHXButton>
                </div>
              </div>
            </CHXCard>
          </div>
        )}
      </div>
    </Layout>
  );
}
