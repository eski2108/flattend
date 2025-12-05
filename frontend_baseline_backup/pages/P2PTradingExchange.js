import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  Zap
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://tradefix-preview.preview.emergentagent.com';

export default function P2PTradingExchange() {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState('BTC/GBP');
  const [orderType, setOrderType] = useState('buy'); // buy or sell
  const [amount, setAmount] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [livePrice, setLivePrice] = useState(47500);
  const [priceChange, setPriceChange] = useState(2.34);
  const [processing, setProcessing] = useState(false);

  const tradingPairs = [
    { symbol: 'BTC/GBP', base: 'BTC', quote: 'GBP', price: 47500, change: 2.34, icon: '₿' },
    { symbol: 'ETH/GBP', base: 'ETH', quote: 'GBP', price: 2500, change: 1.82, icon: '⟠' },
    { symbol: 'USDT/GBP', base: 'USDT', quote: 'GBP', price: 0.79, change: 0.05, icon: '₮' },
    { symbol: 'BNB/GBP', base: 'BNB', quote: 'GBP', price: 380, change: -0.45, icon: '◆' },
    { symbol: 'SOL/GBP', base: 'SOL', quote: 'GBP', price: 120, change: 3.21, icon: '◎' },
    { symbol: 'LTC/GBP', base: 'LTC', quote: 'GBP', price: 85, change: 1.15, icon: 'Ł' }
  ];

  useEffect(() => {
    // Check auth
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'null') {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {
        setCurrentUser({ user_id: 'demo', email: 'demo@test.com' });
      }
    } else {
      setCurrentUser({ user_id: 'demo', email: 'demo@test.com' });
    }

    // Simulate live price updates
    const interval = setInterval(() => {
      setLivePrice(prev => {
        const change = (Math.random() - 0.5) * 100;
        return Math.max(prev + change, 45000);
      });
      setPriceChange((Math.random() - 0.5) * 5);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      // In production, this would execute against platform liquidity
      const pair = tradingPairs.find(p => p.symbol === selectedPair);
      const totalCost = parseFloat(amount) * pair.price;

      toast.success(`${orderType === 'buy' ? 'Bought' : 'Sold'} ${amount} ${pair.base} at £${pair.price.toLocaleString()}`);
      setAmount('');
    } catch (error) {
      console.error('Trade error:', error);
      toast.error('Failed to execute trade');
    } finally {
      setProcessing(false);
    }
  };

  const selectedPairData = tradingPairs.find(p => p.symbol === selectedPair);

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '800', 
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            P2P TRADING
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            Trade crypto at live market prices with instant execution
          </p>
        </div>

        {/* Trading Pairs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          {tradingPairs.map(pair => (
            <button
              key={pair.symbol}
              onClick={() => setSelectedPair(pair.symbol)}
              style={{
                padding: '1rem 1.5rem',
                background: selectedPair === pair.symbol 
                  ? 'linear-gradient(135deg, #00F0FF, #A855F7)' 
                  : 'rgba(26, 31, 58, 0.8)',
                border: selectedPair === pair.symbol 
                  ? 'none' 
                  : '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: '140px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{pair.icon}</span>
                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{pair.symbol}</span>
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: '700' }}>
                £{pair.price.toLocaleString()}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: pair.change >= 0 ? '#22C55E' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                {pair.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {pair.change >= 0 ? '+' : ''}{pair.change.toFixed(2)}%
              </div>
            </button>
          ))}
        </div>

        {/* Main Trading Interface */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
          {/* Chart Area (Placeholder) */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            minHeight: '500px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
                  Live Price
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#00F0FF' }}>
                  £{livePrice.toFixed(2).toLocaleString()}
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: priceChange >= 0 ? '#22C55E' : '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  {priceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </div>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '8px'
              }}>
                <Activity size={16} color="#22C55E" />
                <span style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: '600' }}>
                  LIVE • Updates every 3s
                </span>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div style={{
              height: '350px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <BarChart3 size={48} color="rgba(0, 240, 255, 0.5)" />
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
                Live Price Chart
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                Real-time candlestick chart will appear here
              </div>
            </div>
          </div>

          {/* Order Panel */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Quick Trade
            </h3>

            {/* Buy/Sell Toggle */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <button
                onClick={() => setOrderType('buy')}
                style={{
                  padding: '0.75rem',
                  background: orderType === 'buy' 
                    ? 'linear-gradient(135deg, #22C55E, #16A34A)' 
                    : 'rgba(0, 0, 0, 0.3)',
                  border: orderType === 'buy' 
                    ? 'none' 
                    : '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                BUY
              </button>
              <button
                onClick={() => setOrderType('sell')}
                style={{
                  padding: '0.75rem',
                  background: orderType === 'sell' 
                    ? 'linear-gradient(135deg, #EF4444, #DC2626)' 
                    : 'rgba(0, 0, 0, 0.3)',
                  border: orderType === 'sell' 
                    ? 'none' 
                    : '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                SELL
              </button>
            </div>

            {/* Amount Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                color: 'rgba(255,255,255,0.7)', 
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                Amount ({selectedPairData?.base})
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Total Cost */}
            {amount && parseFloat(amount) > 0 && (
              <div style={{
                padding: '1rem',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
                  Total Cost
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00F0FF' }}>
                  £{(parseFloat(amount) * selectedPairData?.price).toFixed(2).toLocaleString()}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div style={{
              padding: '1rem',
              background: 'rgba(34, 197, 94, 0.05)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                <strong style={{ color: '#22C55E' }}>Instant Execution:</strong> Your order executes immediately at the live market price using platform liquidity. No waiting, no escrow.
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleTrade}
              disabled={processing || !amount || parseFloat(amount) <= 0}
              style={{
                width: '100%',
                padding: '1rem',
                background: orderType === 'buy'
                  ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                  : 'linear-gradient(135deg, #EF4444, #DC2626)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: 'pointer',
                opacity: (processing || !amount || parseFloat(amount) <= 0) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Zap size={20} />
              {processing ? 'Processing...' : `${orderType === 'buy' ? 'BUY' : 'SELL'} ${selectedPairData?.base}`}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
