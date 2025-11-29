import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Zap, Loader, Search } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function InstantBuy() {
  const navigate = useNavigate();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingCoin, setProcessingCoin] = useState(null);
  const [ripples, setRipples] = useState({});
  const [userBalance, setUserBalance] = useState(0);
  const [balanceError, setBalanceError] = useState('');

  // Ripple effect handler
  const handleRipple = (coinSymbol, amount, event) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const rippleKey = `${coinSymbol}-${amount}-${Date.now()}`;
    setRipples(prev => ({
      ...prev,
      [rippleKey]: { x, y, coinSymbol, amount }
    }));

    setTimeout(() => {
      setRipples(prev => {
        const newRipples = { ...prev };
        delete newRipples[rippleKey];
        return newRipples;
      });
    }, 600);
  };

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
      // Get ALL supported coins from coin metadata
      const metadataResponse = await axios.get(`${API}/api/wallets/coin-metadata`);
      
      // Get existing admin liquidity
      const liquidityResponse = await axios.get(`${API}/api/instant-buy/available-coins`);
      
      if (metadataResponse.data.success) {
        const allCoins = metadataResponse.data.coins;
        const liquidityMap = {};
        
        // Map existing liquidity
        if (liquidityResponse.data.success) {
          liquidityResponse.data.coins.forEach(coin => {
            liquidityMap[coin.symbol] = coin;
          });
        }
        
        // Combine all coins with liquidity data
        const enrichedCoins = allCoins.map(coin => ({
          symbol: coin.symbol,
          name: coin.name,
          color: coin.color,
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
    // Check balance before processing
    if (userBalance < amount) {
      setBalanceError(`Insufficient balance. You need £${amount} but have £${userBalance.toFixed(2)}`);
      toast.error(`❌ Insufficient balance. You need £${amount} but have £${userBalance.toFixed(2)}`, {
        duration: 5000
      });
      return;
    }

    setBalanceError('');
    setProcessing(true);
    setProcessingCoin(`${coin.symbol}-${amount}`);

    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user?.user_id) {
        toast.error('Please log in');
        setProcessing(false);
        setProcessingCoin(null);
        navigate('/login');
        return;
      }

      const cryptoAmount = amount / (coin.price_gbp || 1);

      console.log('🔵 Instant Buy Request:', {
        user_id: user.user_id,
        crypto_currency: coin.symbol,
        fiat_amount: amount,
        crypto_amount: cryptoAmount
      });

      const response = await axios.post(`${API}/api/express-buy/execute`, {
        user_id: user.user_id,
        crypto_currency: coin.symbol,
        fiat_amount: amount,
        crypto_amount: cryptoAmount,
        ad_id: 'ADMIN_LIQUIDITY',
        buyer_wallet_address: 'internal_wallet',
        buyer_wallet_network: 'mainnet'
      });

      console.log('🔵 Instant Buy Response:', response.data);

      if (response.data.success) {
        toast.success(`✅ Bought ${cryptoAmount.toFixed(8)} ${coin.symbol}!`);
        // Update local balance
        setUserBalance(prev => prev - amount);
        setTimeout(() => navigate('/wallet'), 2000);
      } else {
        console.error('❌ Purchase failed:', response.data.message);
        toast.error(response.data.message || 'Failed');
      }
    } catch (error) {
      console.error('❌ Instant Buy Error:', error.response?.data || error.message);
      const msg = error.response?.data?.detail || error.response?.data?.message || error.message;
      
      // Check for specific error types
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('balance')) {
        toast.error('❌ Insufficient GBP balance. Please deposit funds to continue.', {
          duration: 5000
        });
      } else if (msg.toLowerCase().includes('liquidity')) {
        toast.error('❌ Insufficient platform liquidity for this amount.', {
          duration: 5000
        });
      } else {
        toast.error(`❌ Purchase failed: ${msg}`, {
          duration: 4000
        });
      }
    } finally {
      setProcessing(false);
      setProcessingCoin(null);
    }
  };

  const filtered = coins.filter(c => c.symbol.toLowerCase().includes(searchTerm.toLowerCase()));
  const amounts = [50, 100, 250, 500];

  return (
    <Layout>
      <style>{`
        @keyframes flashGreen {
          0% { background: linear-gradient(135deg, #22C55E, #16A34A); }
          50% { background: linear-gradient(135deg, #4ADE80, #22C55E); box-shadow: 0 0 25px rgba(34, 197, 94, 0.8); }
          100% { background: linear-gradient(135deg, #22C55E, #16A34A); }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.8); }
        }

        @keyframes scaleUp {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }

        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 0.6;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }

        .premium-buy-btn {
          position: relative;
          overflow: hidden;
          padding: 6px 12px;
          background: linear-gradient(135deg, #22C55E, #16A34A);
          border: none;
          borderRadius: 6px;
          color: #fff;
          fontSize: 13px;
          fontWeight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          minWidth: 70px;
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), 0 2px 8px rgba(34, 197, 94, 0.3);
        }

        .premium-buy-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #16A34A, #15803D);
          box-shadow: 0 0 25px rgba(34, 197, 94, 0.6), 0 4px 12px rgba(34, 197, 94, 0.4);
          transform: translateY(-1px) scale(1.02);
        }

        .premium-buy-btn:active:not(:disabled) {
          background: linear-gradient(135deg, #4ADE80, #22C55E);
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.8), 0 2px 10px rgba(34, 197, 94, 0.5);
          transform: translateY(0) scale(0.98);
        }

        .premium-buy-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          background: rgba(34, 197, 94, 0.2);
        }

        .premium-buy-btn.insufficient {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .premium-buy-btn.insufficient:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: none;
          box-shadow: none;
        }

        .premium-buy-btn.processing {
          background: linear-gradient(135deg, #16A34A, #15803D);
          animation: pulseGlow 1.5s ease infinite;
        }

        .ripple-effect {
          position: absolute;
          border-radius: 50%;
          background: rgba(74, 222, 128, 0.6);
          pointer-events: none;
          animation: ripple 600ms ease-out;
        }
      `}</style>
      <div style={{ padding: '2rem', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: '20px', marginBottom: '1rem' }}>
              <Zap size={20} color="#fff" />
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>INSTANT BUY</span>
            </div>
            <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>Buy Crypto Instantly</h1>
            <p style={{ color: '#888', fontSize: '18px' }}>Click any button to buy • Instant delivery</p>
            <div style={{ marginTop: '1rem', padding: '12px 24px', background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '12px', display: 'inline-block' }}>
              <span style={{ color: '#888', fontSize: '14px' }}>Available Balance: </span>
              <span style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700' }}>£{userBalance.toFixed(2)}</span>
            </div>
            {balanceError && (
              <div style={{ marginTop: '1rem', padding: '12px 24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '12px', display: 'inline-block' }}>
                <span style={{ color: '#EF4444', fontSize: '14px', fontWeight: '600' }}>⚠️ {balanceError}</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 48px', background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(0,240,255,0.3)', borderRadius: '12px', color: '#fff', fontSize: '16px', outline: 'none' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
              <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: '1rem' }}>Loading...</div>
            </div>
          ) : (
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '2px solid rgba(0,240,255,0.3)', borderRadius: '24px', overflow: 'hidden' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '180px 120px 120px 1fr', padding: '1rem 1.5rem', background: 'rgba(0,240,255,0.1)', borderBottom: '1px solid rgba(0,240,255,0.3)', fontWeight: '700', fontSize: '13px', color: '#00F0FF', textTransform: 'uppercase' }}>
                <div>Crypto</div>
                <div>Price</div>
                <div>Stock</div>
                <div style={{ textAlign: 'center' }}>Quick Buy</div>
              </div>

              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {filtered.map(coin => (
                  <div key={coin.symbol} style={{ display: 'grid', gridTemplateColumns: '180px 120px 120px 1fr', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,240,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>{coin.symbol}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {coin.symbol === 'BTC' ? 'Bitcoin' : coin.symbol === 'ETH' ? 'Ethereum' : coin.symbol === 'USDT' ? 'Tether' : coin.symbol === 'SOL' ? 'Solana' : coin.symbol === 'GBP' ? 'Pound' : ''}
                      </div>
                    </div>

                    <div style={{ color: '#22C55E', fontWeight: '700', fontSize: '15px' }}>£{(coin.price_gbp || 0).toLocaleString()}</div>

                    <div style={{ color: '#888', fontSize: '13px' }}>{(coin.available || 0).toFixed(2)}</div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {amounts.map(amt => {
                        const isProc = processingCoin === `${coin.symbol}-${amt}`;
                        const crypto = coin.price_gbp ? (amt / coin.price_gbp).toFixed(6) : '0';
                        const btnKey = `${coin.symbol}-${amt}`;
                        
                        const isInsufficientBalance = userBalance < amt;
                        
                        return (
                          <button 
                            key={amt}
                            className={`premium-buy-btn ${isProc ? 'processing' : ''} ${isInsufficientBalance ? 'insufficient' : ''}`}
                            onClick={(e) => {
                              if (!isInsufficientBalance) {
                                handleRipple(coin.symbol, amt, e);
                                handleBuy(coin, amt);
                              }
                            }}
                            disabled={processing || isInsufficientBalance}
                            title={isInsufficientBalance ? `Insufficient balance (need £${amt})` : ''}
                          >
                            {/* Ripple effects */}
                            {Object.entries(ripples).map(([key, ripple]) => {
                              if (ripple.coinSymbol === coin.symbol && ripple.amount === amt) {
                                return (
                                  <span
                                    key={key}
                                    className="ripple-effect"
                                    style={{
                                      left: ripple.x - 20,
                                      top: ripple.y - 20,
                                      width: 40,
                                      height: 40
                                    }}
                                  />
                                );
                              }
                              return null;
                            })}
                            
                            {/* Button content */}
                            {isProc ? (
                              <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <div>
                                <div>£{amt}</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>≈{crypto}</div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,240,255,0.05)', borderTop: '1px solid rgba(0,240,255,0.3)', color: '#888', fontSize: '13px', textAlign: 'center' }}>
                {filtered.length} coin{filtered.length !== 1 ? 's' : ''} available • Scalable to 50+ coins
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '16px', fontSize: '13px', color: '#888', maxWidth: '800px', margin: '2rem auto 0' }}>
            <div style={{ color: '#22C55E', fontWeight: '700', marginBottom: '0.5rem' }}>ℹ️ How it works:</div>
            • Crypto delivered instantly to your wallet<br/>
            • Powered by platform liquidity pool<br/>
            • Add unlimited coins via admin panel
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default InstantBuy;
