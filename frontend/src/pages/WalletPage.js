import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, RefreshCw, Search, Copy } from 'lucide-react';
import '@/styles/premiumButtons.css';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WalletPage() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [totalGBP, setTotalGBP] = useState(0);
  const [totalUSD, setTotalUSD] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [depositAddresses, setDepositAddresses] = useState({});
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  const networkOptions = {
    'BTC': ['Bitcoin'],
    'ETH': ['Ethereum (ERC20)'],
    'USDT': ['Ethereum (ERC20)', 'Tron (TRC20)', 'BSC (BEP20)'],
    'USDC': ['Ethereum (ERC20)', 'Tron (TRC20)', 'BSC (BEP20)'],
    'BNB': ['BSC (BEP20)'],
    'SOL': ['Solana'],
    'ADA': ['Cardano'],
    'XRP': ['Ripple'],
    'LTC': ['Litecoin'],
    'BCH': ['Bitcoin Cash'],
    'DOGE': ['Dogecoin'],
    'TRX': ['Tron'],
    'MATIC': ['Polygon'],
    'DOT': ['Polkadot'],
    'AVAX': ['Avalanche'],
    'LINK': ['Ethereum (ERC20)'],
    'UNI': ['Ethereum (ERC20)'],
    'ATOM': ['Cosmos'],
    'XLM': ['Stellar'],
    'ALGO': ['Algorand'],
    'VET': ['VeChain'],
    'FIL': ['Filecoin'],
    'NEAR': ['NEAR Protocol'],
    'APT': ['Aptos'],
    'OP': ['Optimism'],
    'ARB': ['Arbitrum']
  };

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadBalances(u.user_id);
    loadRecentActivity(u.user_id);
    loadAvailableCurrencies();
  }, []);

  const loadAvailableCurrencies = async () => {
    setLoadingCurrencies(true);
    try {
      const response = await axios.get(`${API}/api/nowpayments/currencies`);
      if (response.data.success && response.data.currencies) {
        // Filter and format currencies
        const currencies = response.data.currencies
          .filter(c => c && c.length >= 3)
          .map(c => c.toUpperCase())
          .sort();
        setAvailableCurrencies(currencies);
      }
    } catch (error) {
      console.error('Failed to load currencies:', error);
      // Fallback to basic list if API fails
      setAvailableCurrencies(['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'ADA', 'XRP', 'LTC', 'DOGE', 'TRX', 'MATIC']);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const loadBalances = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (response.data.success) {
        const bals = response.data.balances || [];
        setBalances(bals);
        
        // Calculate totals
        let gbpTotal = 0;
        bals.forEach(b => {
          gbpTotal += (b.total_balance || 0) * (b.gbp_price || 0);
        });
        setTotalGBP(gbpTotal);
        setTotalUSD(gbpTotal * 1.27); // Rough GBP to USD conversion
        setChange24h(2.34); // Mock 24h change - would come from backend
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async (userId) => {
    try {
      // Mock recent activity - would fetch from backend
      setRecentActivity([
        { type: 'P2P Trade', amount: '0.001 BTC', value: '£47.50', status: 'Completed', time: '2 hours ago' },
        { type: 'Deposit', amount: '100 USDT', value: '£79.00', status: 'Completed', time: '1 day ago' },
        { type: 'Instant Buy', amount: '0.02 ETH', value: '£50.00', status: 'Completed', time: '2 days ago' },
        { type: 'Withdraw', amount: '50 GBP', value: '£50.00', status: 'Processing', time: '3 days ago' },
        { type: 'P2P Trade', amount: '0.5 ETH', value: '£1,250.00', status: 'Completed', time: '5 days ago' }
      ]);
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  };

  const loadDepositAddress = async (currency, network) => {
    const key = `${currency}-${network}`;
    if (depositAddresses[key]) return; // Already loaded
    
    setLoadingAddress(true);
    try {
      // Call NOWPayments API to create a deposit payment
      const orderId = `deposit-${user.user_id}-${Date.now()}`;
      
      const response = await axios.post(`${API}/api/nowpayments/create-deposit`, {
        user_id: user.user_id,
        pay_currency: currency.toLowerCase(),
        currency: 'usd',
        amount: 100 // Example amount in USD
      });
      
      if (response.data.success && response.data.deposit_address) {
        const address = response.data.deposit_address;
        const amountToSend = response.data.amount_to_send;
        setDepositAddresses(prev => ({
          ...prev,
          [key]: {
            address: address,
            amount: amountToSend,
            currency: response.data.currency
          }
        }));
        toast.success('Deposit address generated!');
      } else {
        const errorMsg = response.data.message || 'Failed to generate deposit address';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Failed to load deposit address:', error);
      toast.error('Failed to generate deposit address');
    } finally {
      setLoadingAddress(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const filteredBalances = balances.filter(b => 
    b.currency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const changeValue = totalGBP * (change24h / 100);
  const changePercent = change24h;
  const isPositive = changePercent >= 0;

  // Premium neon button styles - Binance/Crypto.com style
  const neonButtonBase = {
    flex: '1 1 184px',  // 15% wider
    minWidth: '184px',
    maxWidth: '230px',
    padding: '18px 28px',  // 15% taller
    background: 'linear-gradient(180deg, #020611 0%, #0A0F1C 100%)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',  // Tighter radius for sharper, modern look
    color: '#FFFFFF',  // Pure white
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',  // Smoother
    position: 'relative',
    overflow: 'hidden'
  };

  const depositButtonStyle = {
    ...neonButtonBase,
    border: '1.5px solid #00FF8A',
    boxShadow: '0 0 25px rgba(0, 214, 115, 0.35), inset 0 0 15px rgba(0, 255, 138, 0.08)',
  };

  const withdrawButtonStyle = {
    ...neonButtonBase,
    border: '1.5px solid #FF3B3B',
    boxShadow: '0 0 25px rgba(230, 41, 41, 0.35), inset 0 0 15px rgba(255, 59, 59, 0.08)',
  };

  const convertButtonStyle = {
    ...neonButtonBase,
    border: '1.5px solid #9B5CFF',
    boxShadow: '0 0 25px rgba(123, 59, 255, 0.35), inset 0 0 15px rgba(155, 92, 255, 0.08)',
  };

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Wallet size={32} style={{ color: '#00F0FF' }} />
              Your Wallet
            </h1>
            <p style={{ color: '#888', fontSize: '16px' }}>Manage your crypto assets</p>
          </div>
        </div>

        {/* Portfolio Overview Section - Premium Neon Style */}
        <div style={{ 
          marginBottom: '2.5rem',
          background: 'linear-gradient(180deg, #020611 0%, #0A0F1C 100%)',
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(180deg, #020611 0%, #0A0F1C 100%), linear-gradient(135deg, #00E5FF 0%, #0077FF 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          borderRadius: '20px',
          boxShadow: '0 0 40px rgba(0, 229, 255, 0.35), 0 0 80px rgba(0, 119, 255, 0.35), 0 8px 32px rgba(0, 0, 0, 0.5)',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
            
            {/* Left: Portfolio Value */}
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ 
                color: '#00E5FF', 
                fontSize: '14px', 
                fontWeight: '700', 
                marginBottom: '0.5rem', 
                letterSpacing: '1px',
                textTransform: 'uppercase',
                textShadow: '0 0 20px rgba(0, 229, 255, 0.8), 0 0 40px rgba(0, 229, 255, 0.4), 0 0 60px rgba(0, 229, 255, 0.2)'
              }}>
                TOTAL PORTFOLIO VALUE
              </div>
              <div style={{ fontSize: '42px', fontWeight: '700', color: '#FFFFFF', marginBottom: '0.5rem' }}>
                £{totalGBP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
              <div style={{ color: '#6D7A8D', fontSize: '15px', marginBottom: '1rem' }}>
                ≈ ${totalUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
              </div>
              
              {/* 24h Change */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isPositive ? <TrendingUp size={20} color="#00FFAB" /> : <TrendingDown size={20} color="#FF4D67" />}
                <span style={{ color: isPositive ? '#00FFAB' : '#FF4D67', fontSize: '18px', fontWeight: '700' }}>
                  {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                </span>
                <span style={{ color: '#888', fontSize: '14px' }}>
                  ({isPositive ? '+' : ''}£{Math.abs(changeValue).toFixed(2)}) 24h
                </span>
              </div>
            </div>

            {/* Right: Premium Neon Action Buttons - REDESIGNED */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/deposit/btc')}
                style={depositButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 214, 115, 0.6), 0 0 80px rgba(0, 214, 115, 0.3), inset 0 0 20px rgba(0, 255, 138, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(0, 255, 138, 0.15) 0%, rgba(2, 6, 17, 0.9) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 214, 115, 0.35), inset 0 0 15px rgba(0, 255, 138, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'linear-gradient(180deg, #020611 0%, #0A0F1C 100%)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1)';
                }}
              >
                <ArrowDownLeft size={18} />
                Deposit
              </button>
              <button
                onClick={() => navigate('/withdraw/btc')}
                style={withdrawButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(230, 41, 41, 0.6), 0 0 80px rgba(230, 41, 41, 0.3), inset 0 0 20px rgba(255, 59, 59, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 59, 59, 0.15) 0%, rgba(2, 6, 17, 0.9) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(230, 41, 41, 0.35), inset 0 0 15px rgba(255, 59, 59, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'linear-gradient(180deg, #020611 0%, #0A0F1C 100%)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1)';
                }}
              >
                <ArrowUpRight size={18} />
                Withdraw
              </button>
              <button
                onClick={() => navigate('/swap-crypto')}
                style={convertButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(123, 59, 255, 0.6), 0 0 80px rgba(123, 59, 255, 0.3), inset 0 0 20px rgba(155, 92, 255, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(155, 92, 255, 0.15) 0%, rgba(2, 6, 17, 0.9) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(123, 59, 255, 0.35), inset 0 0 15px rgba(155, 92, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'linear-gradient(180deg, #020611 0%, #0A0F1C 100%)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1)';
                }}
              >
                <RefreshCw size={18} />
                Convert
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left: Assets List */}
          <div>
            {/* Search Bar */}
            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 48px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '2px solid rgba(0,240,255,0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Assets Table */}
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '2px solid rgba(0,240,255,0.3)', borderRadius: '24px', overflow: 'hidden' }}>
              
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 150px 150px', padding: '1rem 1.5rem', background: 'rgba(0,240,255,0.1)', borderBottom: '1px solid rgba(0,240,255,0.3)', fontWeight: '700', fontSize: '13px', color: '#00F0FF', textTransform: 'uppercase' }}>
                <div></div>
                <div>Asset</div>
                <div style={{ textAlign: 'right' }}>Balance</div>
                <div style={{ textAlign: 'right' }}>Value (GBP)</div>
              </div>

              {/* Scrollable Rows */}
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>Loading assets...</div>
                ) : filteredBalances.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>No assets found</div>
                ) : (
                  filteredBalances.map((balance, idx) => {
                    const gbpValue = (balance.total_balance || 0) * (balance.gbp_price || 0);
                    return (
                      <div 
                        key={idx}
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '60px 1fr 150px 150px', 
                          padding: '1rem 1.5rem', 
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,240,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Icon */}
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #00F0FF, #0099FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' }}>
                          {balance.currency.charAt(0)}
                        </div>
                        
                        {/* Asset Name */}
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                            {balance.currency}
                          </div>
                          <div style={{ fontSize: '13px', color: '#888' }}>
                            {balance.currency === 'BTC' ? 'Bitcoin' : 
                             balance.currency === 'ETH' ? 'Ethereum' : 
                             balance.currency === 'USDT' ? 'Tether' : 
                             balance.currency === 'GBP' ? 'British Pound' : 
                             balance.currency}
                          </div>
                        </div>
                        
                        {/* Balance */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>
                            {parseFloat(balance.total_balance || 0).toFixed(8)}
                          </div>
                          {balance.locked_balance > 0 && (
                            <div style={{ fontSize: '12px', color: '#FFA500' }}>
                              {parseFloat(balance.locked_balance).toFixed(8)} locked
                            </div>
                          )}
                        </div>
                        
                        {/* Value */}
                        <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: '600', color: '#00F0FF' }}>
                          £{gbpValue.toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Recent Activity */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Recent Activity</h3>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '2px solid rgba(0,240,255,0.3)', borderRadius: '24px', overflow: 'hidden' }}>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {recentActivity.map((activity, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '1rem 1.5rem', 
                      borderBottom: idx < recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                        {activity.type}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {activity.time}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#888' }}>
                        {activity.amount}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: activity.status === 'Completed' ? '#00FFAB' : '#FFA500' }}>
                        {activity.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0F1429 0%, #090D1A 100%)',
            border: '2px solid #00E5FF',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 0 40px rgba(0, 229, 255, 0.3)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Deposit Crypto</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '14px' }}>
                Select Currency {loadingCurrencies && '(Loading...)'}
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => {
                  setSelectedCurrency(e.target.value);
                  setSelectedNetwork('');
                }}
                disabled={loadingCurrencies}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '2px solid rgba(0,240,255,0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: loadingCurrencies ? 'wait' : 'pointer'
                }}
              >
                <option value="">Choose currency...</option>
                {availableCurrencies.map(currency => (
                  <option key={currency} value={currency}>
                    {currency} {currency === 'BTC' ? '(Bitcoin)' : 
                             currency === 'ETH' ? '(Ethereum)' : 
                             currency === 'USDT' ? '(Tether)' : 
                             currency === 'USDC' ? '(USD Coin)' : 
                             currency === 'BNB' ? '(Binance Coin)' : 
                             currency === 'SOL' ? '(Solana)' : 
                             currency === 'ADA' ? '(Cardano)' : 
                             currency === 'XRP' ? '(Ripple)' : 
                             currency === 'LTC' ? '(Litecoin)' : 
                             currency === 'DOGE' ? '(Dogecoin)' : 
                             currency === 'TRX' ? '(Tron)' : 
                             currency === 'MATIC' ? '(Polygon)' : ''}
                  </option>
                ))}
              </select>
              <div style={{ color: '#6D7A8D', fontSize: '12px', marginTop: '0.5rem' }}>
                {availableCurrencies.length} cryptocurrencies available via NOWPayments
              </div>
            </div>

            {selectedCurrency && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '14px' }}>Select Network</label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => {
                    setSelectedNetwork(e.target.value);
                    loadDepositAddress(selectedCurrency, e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '2px solid rgba(0,240,255,0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">Choose network...</option>
                  {networkOptions[selectedCurrency] ? (
                    networkOptions[selectedCurrency].map(network => (
                      <option key={network} value={network}>{network}</option>
                    ))
                  ) : (
                    <option value={selectedCurrency}>{selectedCurrency} Network</option>
                  )}
                </select>
                {!networkOptions[selectedCurrency] && (
                  <div style={{ color: '#FFA500', fontSize: '12px', marginTop: '0.5rem' }}>
                    ℹ️ Using default {selectedCurrency} network
                  </div>
                )}
              </div>
            )}

            {selectedCurrency && selectedNetwork && depositAddresses[`${selectedCurrency}-${selectedNetwork}`] && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(0,240,255,0.05)', border: '2px solid rgba(0,240,255,0.3)', borderRadius: '12px' }}>
                <div style={{ color: '#00E5FF', fontSize: '14px', fontWeight: '600', marginBottom: '1rem' }}>
                  Deposit {depositAddresses[`${selectedCurrency}-${selectedNetwork}`].currency}
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>Amount to Send</div>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: '700' }}>
                    {depositAddresses[`${selectedCurrency}-${selectedNetwork}`].amount} {depositAddresses[`${selectedCurrency}-${selectedNetwork}`].currency}
                  </div>
                </div>
                
                <div>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>Deposit Address</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, color: '#fff', fontSize: '14px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {depositAddresses[`${selectedCurrency}-${selectedNetwork}`].address}
                    </div>
                    <button
                      onClick={() => copyToClipboard(depositAddresses[`${selectedCurrency}-${selectedNetwork}`].address)}
                      style={{
                        padding: '10px',
                        background: 'linear-gradient(135deg, #00FF8A 0%, #00D673 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#020611',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '8px' }}>
                  <div style={{ color: '#FFA500', fontSize: '12px' }}>
                    ⚠️ Send exactly this amount to the address above. Network: {selectedNetwork}
                  </div>
                </div>
              </div>
            )}

            {loadingAddress && (
              <div style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>Generating address...</div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowDepositModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal (placeholder) */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0F1429 0%, #090D1A 100%)',
            border: '2px solid #00E5FF',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 0 40px rgba(0, 229, 255, 0.3)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Withdraw Crypto</h2>
            <p style={{ color: '#888', marginBottom: '1.5rem' }}>Withdraw feature coming soon...</p>
            <button
              onClick={() => setShowWithdrawModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}