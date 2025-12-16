/**
 * ⚠️ LIQUIDITY DISPLAY REMOVED ⚠️
 * 
 * All hardcoded liquidity placeholders have been removed from this file.
 * No fake balances, "Available" amounts, or "No liquidity" messages should appear
 * until real backend-linked liquidity is properly implemented.
 * 
 * DO NOT re-add placeholder values without proper backend integration.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import CHXButton from '@/components/CHXButton';
import { Zap, Loader, Search, ArrowDownLeft, ArrowUpRight, Repeat, ChevronDown, Clock, Lock } from 'lucide-react';
import { getCoinLogo, getCoinLogoAlt, getCoinLogoFallback, getCoinLogoFallback2, cleanSymbol } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

function InstantBuy() {
  const navigate = useNavigate();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCoin, setExpandedCoin] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    fetchCoins();
    fetchUserBalance();
  }, []);

  const fetchUserBalance = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (user?.user_id) {
        const response = await axios.get(`${API}/api/wallets/balances/${user.user_id}`);
        if (response.data.success) {
          const gbpBalance = response.data.balances.find(b => b.currency === 'GBP');
          setUserBalance(gbpBalance?.available_balance || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchCoins = async () => {
    try {
      // Load ALL 247 currencies from NOWPayments
      const nowpaymentsResponse = await axios.get(`${API}/api/nowpayments/currencies`);
      const liquidityResponse = await axios.get(`${API}/api/coins/available`);
      
      if (nowpaymentsResponse.data.success) {
        const currencies = nowpaymentsResponse.data.currencies;
        
        // Convert NOWPayments currencies to coin objects
        const allCoins = currencies.map(currency => ({
          symbol: currency.toUpperCase(),
          name: currency.toUpperCase(),
          price_gbp: 0, // Will be fetched when needed
          available_liquidity: 0
        }));
        const liquidityMap = {};
        
        if (liquidityResponse.data.success) {
          liquidityResponse.data.coins.forEach(coin => {
            liquidityMap[coin.symbol] = coin;
          });
        }
        
        const enrichedCoins = allCoins.map(coin => ({
          symbol: coin.symbol,
          name: coin.name,
          color: coin.color,
          network: coin.network,
          decimals: coin.decimals,
          nowpayments_code: coin.nowpayments_code,
          price_gbp: liquidityMap[coin.symbol]?.price_gbp || 0,
          available_amount: liquidityMap[coin.symbol]?.available_amount || 0,
          has_liquidity: !!liquidityMap[coin.symbol],
          markup_percent: liquidityMap[coin.symbol]?.markup_percent || 3.0
        }));
        
        setCoins(enrichedCoins);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load coins');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (coin, amount) => {
    if (userBalance < amount) {
      toast.error(`Insufficient balance. You need £${amount} but have £${userBalance.toFixed(2)}`);
      return;
    }

    setProcessing(true);
    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user?.user_id) {
        navigate('/login');
        return;
      }

      const cryptoAmount = amount / (coin.price_gbp || 1);
      
      // STEP 1: Get locked-price quote
      const quoteResponse = await axios.post(`${API}/api/admin-liquidity/quote`, {
        user_id: user.user_id,
        type: 'buy',
        crypto: coin.symbol,
        amount: cryptoAmount
      });

      if (quoteResponse.data.success) {
        const quote = quoteResponse.data.quote;
        setCurrentQuote({
          ...quote,
          coin: coin,
          fiatAmount: amount,
          cryptoAmount: cryptoAmount
        });
        setShowQuoteModal(true);
        
        // Start countdown timer
        const expiresAt = new Date(quote.expires_at);
        const updateTimer = setInterval(() => {
          const now = new Date();
          const remaining = Math.floor((expiresAt - now) / 1000);
          if (remaining <= 0) {
            clearInterval(updateTimer);
            setShowQuoteModal(false);
            toast.error('Quote expired. Please try again.');
          } else {
            setCountdown(remaining);
          }
        }, 1000);
      } else {
        toast.error(quoteResponse.data.message || 'Failed to get quote');
      }
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.message || error.message;
      toast.error(`Quote failed: ${msg}`);
    } finally {
      setProcessing(false);
    }
  };

  const confirmPurchase = async () => {
    if (!currentQuote) return;
    
    setProcessing(true);
    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = userData ? JSON.parse(userData) : null;
      
      // STEP 2: Execute with locked price
      const response = await axios.post(`${API}/api/admin-liquidity/execute`, {
        user_id: user.user_id,
        quote_id: currentQuote.quote_id
      });

      if (response.data.success) {
        toast.success(`✅ Bought ${currentQuote.cryptoAmount.toFixed(8)} ${currentQuote.coin.symbol}!`);
        setUserBalance(prev => prev - currentQuote.fiatAmount);
        setShowQuoteModal(false);
        
        // Refresh liquidity to show updated values
        fetchCoins();
        
        setTimeout(() => navigate('/wallet'), 2000);
      } else {
        toast.error(response.data.message || 'Purchase failed');
      }
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.message || error.message;
      toast.error(`Purchase failed: ${msg}`);
    } finally {
      setProcessing(false);
    }
  };

  const toggleCoin = (coinSymbol) => {
    setExpandedCoin(expandedCoin === coinSymbol ? null : coinSymbol);
  };

  const handleDeposit = (coin) => {
    navigate(`/deposit/${coin.symbol.toLowerCase()}`, {
      state: {
        currency: coin.symbol,
        name: coin.name,
        network: coin.network,
        decimals: coin.decimals,
        nowpayments_currency: coin.nowpayments_code,
        color: coin.color
      }
    });
  };

  const handleWithdraw = (coin) => {
    navigate(`/withdraw/${coin.symbol.toLowerCase()}`, {
      state: {
        currency: coin.symbol,
        name: coin.name,
        network: coin.network,
        decimals: coin.decimals,
        nowpayments_currency: coin.nowpayments_code,
        color: coin.color
      }
    });
  };

  const handleSwap = (coin) => {
    navigate(`/swap-crypto?from=${coin.symbol.toLowerCase()}`, {
      state: {
        from_currency: coin.symbol,
        decimals: coin.decimals,
        color: coin.color
      }
    });
  };

  const filtered = coins.filter(c => 
    c.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const amounts = [50, 100, 250, 500];

  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <>
      <div style={{ padding: '24px 20px', background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 8px' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 20px', 
              background: 'linear-gradient(135deg, #22C55E, #16A34A)', 
              borderRadius: '20px', 
              marginBottom: '12px',
              boxShadow: '0 0 25px rgba(34, 197, 94, 0.6), 0 4px 16px rgba(34, 197, 94, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Zap size={22} color="#fff" />
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '15px', letterSpacing: '0.5px' }}>INSTANT BUY</span>
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px', lineHeight: '1.2' }}>Buy Crypto Instantly</h1>
            <p style={{ color: '#A3AEC2', fontSize: '15px', marginBottom: '16px', lineHeight: '1.4' }}>Expand any coin to see Deposit, Withdraw & Swap options</p>
            <div style={{ 
              padding: '12px 24px', 
              background: 'rgba(0,198,255,0.08)', 
              border: '1px solid rgba(0,198,255,0.3)', 
              borderRadius: '14px', 
              display: 'inline-block',
              boxShadow: '0 0 15px rgba(0, 198, 255, 0.15)'
            }}>
              <span style={{ color: '#A3AEC2', fontSize: '14px' }}>Available Balance: </span>
              <span style={{ color: '#00C6FF', fontSize: '18px', fontWeight: '700' }}>£{userBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Ticker Bar with Shadow */}
          <div style={{ 
            height: '2px', 
            width: '100%', 
            background: 'linear-gradient(90deg, transparent 0%, #00C6FF 50%, transparent 100%)',
            boxShadow: '0 2px 8px rgba(0, 198, 255, 0.3)',
            marginBottom: '24px'
          }} />

          {/* Search */}
          <div style={{ marginBottom: '28px', maxWidth: '520px', margin: '0 auto 28px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: searchFocused ? '#00C6FF' : '#8F9BB3', transition: 'color 0.2s' }} />
              <input
                type="text"
                placeholder="Search coins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 50px',
                  background: 'rgba(0,0,0,0.4)',
                  border: searchFocused ? '1px solid rgba(0,198,255,0.5)' : '1px solid rgba(0,198,255,0.2)',
                  borderRadius: '14px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s ease',
                  boxShadow: searchFocused ? '0 0 20px rgba(0, 198, 255, 0.25)' : 'none'
                }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#A3AEC2' }}>
              <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <div>Loading coins...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filtered.map(coin => (
                <CoinCard
                  key={coin.symbol}
                  coin={coin}
                  expanded={expandedCoin === coin.symbol}
                  onToggle={() => toggleCoin(coin.symbol)}
                  onDeposit={() => handleDeposit(coin)}
                  onWithdraw={() => handleWithdraw(coin)}
                  onSwap={() => handleSwap(coin)}
                  onBuy={handleBuy}
                  amounts={amounts}
                  userBalance={userBalance}
                  processing={processing}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quote Confirmation Modal */}
      {showQuoteModal && currentQuote && (
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
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(0, 198, 255, 0.3)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 0 40px rgba(0, 198, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #00C6FF, #0099CC)',
                borderRadius: '16px',
                marginBottom: '16px',
                boxShadow: '0 0 20px rgba(0, 198, 255, 0.4)'
              }}>
                <Lock size={20} color="#fff" />
                <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                  LOCKED PRICE QUOTE
                </span>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>
                Confirm Purchase
              </h2>
            </div>

            {/* Quote Details */}
            <div style={{
              background: 'rgba(0, 198, 255, 0.08)',
              border: '1px solid rgba(0, 198, 255, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  You're Buying
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
                  {currentQuote.cryptoAmount.toFixed(8)} {currentQuote.coin.symbol}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(0, 198, 255, 0.2)', margin: '16px 0' }} />

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Price Per {currentQuote.coin.symbol}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#22C55E' }}>
                  £{currentQuote.locked_price.toLocaleString()}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(0, 198, 255, 0.2)', margin: '16px 0' }} />

              <div>
                <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Cost
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#00C6FF' }}>
                  £{(currentQuote.cryptoAmount * currentQuote.locked_price).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Countdown Timer */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Clock size={18} color="#EF4444" />
                <span style={{ fontSize: '14px', color: '#EF4444', fontWeight: '600' }}>
                  Quote expires in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowQuoteModal(false);
                  setCurrentQuote(null);
                }}
                disabled={processing}
                style={{
                  padding: '16px',
                  background: 'rgba(143, 155, 179, 0.1)',
                  border: '1px solid rgba(143, 155, 179, 0.3)',
                  borderRadius: '12px',
                  color: '#8F9BB3',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                disabled={processing}
                style={{
                  padding: '16px',
                  background: processing 
                    ? 'rgba(143, 155, 179, 0.2)' 
                    : 'linear-gradient(135deg, #22C55E, #16A34A)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: processing ? 'none' : '0 0 20px rgba(34, 197, 94, 0.4)',
                  transition: 'all 0.2s'
                }}
              >
                {processing ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CoinCard({ coin, expanded, onToggle, onDeposit, onWithdraw, onSwap, onBuy, amounts, userBalance, processing }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={{
        background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
        border: expanded 
          ? `1px solid ${coin.color}88`
          : isHovered 
          ? `1px solid rgba(0, 198, 255, 0.35)`
          : `1px solid rgba(0, 198, 255, 0.25)`,
        borderRadius: '16px',
        padding: '22px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: expanded 
          ? `0 0 30px rgba(${hexToRgb(coin.color)}, 0.25), inset 0 0 25px rgba(${hexToRgb(coin.color)}, 0.08), 0 4px 16px rgba(0, 0, 0, 0.3)`
          : isPressed
          ? `0 0 20px rgba(0, 198, 255, 0.2), inset 0 2px 8px rgba(0, 0, 0, 0.4)`
          : isHovered
          ? `0 0 25px rgba(0, 198, 255, 0.22), 0 4px 16px rgba(0, 198, 255, 0.15)`
          : `0 0 18px rgba(0, 198, 255, 0.18), 0 2px 8px rgba(0, 0, 0, 0.2)`,
        opacity: 0.96,
        minHeight: expanded ? 'auto' : '140px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transform: isPressed ? 'scale(0.98)' : isHovered && !expanded ? 'translateY(-2px)' : 'translateY(0)'
      }}
    >
      {/* Coin Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? '18px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
          {/* 3D Coin Icon with CSS effect - Local first, CoinGecko fallback */}
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4), 0 0 15px rgba(0,229,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5px',
            overflow: 'hidden'
          }}>
            <img 
              src={getCoinLogo(coin.symbol)}
              alt={coin.symbol}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4)) drop-shadow(0 0 8px rgba(0,255,200,0.15))',
                borderRadius: '50%'
              }}
              onError={(e) => {
                const clean = cleanSymbol(coin.symbol);
                // Try CoinGecko/CoinCap fallback
                if (!e.target.dataset.tried1) {
                  e.target.dataset.tried1 = 'true';
                  e.target.src = getCoinLogoAlt(coin.symbol);
                }
                // Try third fallback
                else if (!e.target.dataset.tried2) {
                  e.target.dataset.tried2 = 'true';
                  e.target.src = getCoinLogoFallback(coin.symbol);
                }
                // Final fallback - styled letter
                else {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<span style="font-size: 22px; font-weight: 700; color: #00E5FF; text-shadow: 0 0 10px rgba(0,229,255,0.4);">${clean.charAt(0).toUpperCase()}</span>`;
                }
              }}
            />
          </div>
          
          {/* Coin Info */}
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#FFFFFF', 
              marginBottom: '4px',
              letterSpacing: '0.3px'
            }}>
              {coin.symbol}
            </div>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: '500', 
              color: '#8F9BB3',
              lineHeight: '1.3'
            }}>
              {coin.name}
            </div>
          </div>
        </div>

        {/* Expand Arrow */}
        <ChevronDown 
          size={22} 
          color={expanded ? coin.color : '#00C6FF'}
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease-in-out, color 0.2s',
            flexShrink: 0
          }}
        />
      </div>

      {/* Sparkline removed - was placeholder data */}

      {/* LIQUIDITY DISPLAY REMOVED - Backend integration required */}

      {/* Expanded Content */}
      <div style={{
        maxHeight: expanded ? '800px' : '0',
        overflowY: expanded ? 'auto' : 'hidden',
        overflowX: 'hidden',
        transition: 'max-height 0.18s ease-in-out, opacity 0.18s ease-in-out',
        opacity: expanded ? 1 : 0,
        pointerEvents: expanded ? 'auto' : 'none',
        position: 'relative',
        zIndex: expanded ? 10 : 1
      }}>
        {expanded && (
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', zIndex: 20 }}
          >
            {/* Price & Stock Info */}
            <div style={{ 
              marginBottom: '18px', 
              padding: '18px', 
              background: 'rgba(0, 198, 255, 0.06)', 
              borderRadius: '14px', 
              border: '1px solid rgba(0, 198, 255, 0.2)',
              boxShadow: '0 0 12px rgba(0, 198, 255, 0.08)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</div>
                  <div style={{ fontSize: '19px', fontWeight: '700', color: coin.has_liquidity ? '#22C55E' : '#8F9BB3', letterSpacing: '0.3px' }}>
                    {coin.has_liquidity ? `£${coin.price_gbp.toLocaleString()}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock</div>
                  {/* LIQUIDITY AMOUNT REMOVED - Backend integration required */}
                </div>
              </div>
            </div>

            {/* Deposit/Withdraw/Swap Buttons */}
            <div style={{ 
              marginBottom: '32px',
              paddingBottom: '20px',
              borderBottom: '1px solid rgba(0, 198, 255, 0.1)'
            }}>
              <div style={{ fontSize: '12px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px', fontWeight: '600' }}>Actions</div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', 
                gap: '12px',
                marginBottom: '8px'
              }}>
                <CHXButton
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDeposit();
                  }}
                  coinColor={coin.color}
                  variant="primary"
                  size="small"
                  fullWidth
                  icon={<ArrowDownLeft size={16} />}
                  style={{ minHeight: '48px', padding: '12px 8px' }}
                >
                  Deposit
                </CHXButton>
                <CHXButton
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onWithdraw();
                  }}
                  coinColor={coin.color}
                  variant="secondary"
                  size="small"
                  fullWidth
                  icon={<ArrowUpRight size={16} />}
                  style={{ minHeight: '48px', padding: '12px 8px' }}
                >
                  Withdraw
                </CHXButton>
                <CHXButton
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onSwap();
                  }}
                  coinColor={coin.color}
                  variant="secondary"
                  size="small"
                  fullWidth
                  icon={<Repeat size={16} />}
                  style={{ minHeight: '48px', padding: '12px 8px' }}
                >
                  Swap
                </CHXButton>
              </div>
            </div>

            {/* Quick Buy Section */}
            {false && (
              <div style={{ paddingTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px', fontWeight: '600' }}>Quick Buy</div>
                
                {/* Preset Amount Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {[50, 100, 150, 200].map(amt => {
                    const cryptoAmount = coin.price_gbp ? (amt / coin.price_gbp).toFixed(6) : '0';
                    const insufficient = userBalance < amt;
                    
                    return (
                      <button
                        key={amt}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!insufficient && !processing) {
                            onBuy(coin, amt);
                          }
                        }}
                        disabled={processing || insufficient}
                        style={{
                          padding: '12px 8px',
                          background: insufficient ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, #22C55E, #16A34A)',
                          border: insufficient ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                          borderRadius: '8px',
                          color: insufficient ? '#EF4444' : '#FFFFFF',
                          fontSize: '14px',
                          fontWeight: '700',
                          cursor: (processing || insufficient) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          zIndex: 100,
                          pointerEvents: 'auto'
                        }}
                        onMouseEnter={(e) => {
                          if (!insufficient && !processing) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '15px', fontWeight: '700' }}>£{amt}</div>
                          <div style={{ fontSize: '9px', opacity: 0.8 }}>≈{cryptoAmount} {coin.symbol}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Custom Amount Input */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', fontWeight: '600' }}>Custom Amount</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Enter £ amount"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const value = parseFloat(e.target.value) || 0;
                        e.target.dataset.customAmount = value;
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 198, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                        position: 'relative',
                        zIndex: 100,
                        pointerEvents: 'auto'
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        e.target.style.borderColor = 'rgba(0, 198, 255, 0.6)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0, 198, 255, 0.3)';
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const input = e.target.parentElement.querySelector('input');
                        const customAmount = parseFloat(input.value) || 0;
                        if (customAmount > 0 && customAmount <= userBalance && !processing) {
                          onBuy(coin, customAmount);
                        } else if (customAmount <= 0) {
                          toast.error('Please enter a valid amount');
                        } else if (customAmount > userBalance) {
                          toast.error('Insufficient balance');
                        }
                      }}
                      disabled={processing}
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #00C6FF, #0096CC)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        zIndex: 100,
                        pointerEvents: 'auto',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (!processing) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 198, 255, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LIQUIDITY MESSAGE REMOVED - Backend integration required */}
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 198, 255';
}

export default InstantBuy;
