import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoEye, IoEyeOff, IoChevronForward, IoAdd } from 'react-icons/io5';
import { getCoinLogo } from '../utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Savings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  
  const [totalSavings, setTotalSavings] = useState(0);
  const [availableToWithdraw, setAvailableToWithdraw] = useState(0);
  const [totalInterestEarned, setTotalInterestEarned] = useState(0);
  const [savingsAssets, setSavingsAssets] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadSavingsData(parsedUser.user_id);
  }, [navigate]);

  const loadSavingsData = async (userId) => {
    setLoading(true);
    try {
      const [summaryRes, positionsRes] = await Promise.all([
        axios.get(`${API}/api/savings/summary/${userId}`).catch(() => ({ data: { success: false } })),
        axios.get(`${API}/api/savings/positions/${userId}`).catch(() => ({ data: { success: false, positions: [] } }))
      ]);

      if (summaryRes.data.success && summaryRes.data.summary) {
        const summary = summaryRes.data.summary;
        setTotalSavings(summary.total_value_gbp || 0);
        setAvailableToWithdraw(summary.available_balance_gbp || 0);
        setTotalInterestEarned(summary.total_earnings || 0);
      }

      if (positionsRes.data.success && positionsRes.data.positions) {
        setSavingsAssets(positionsRes.data.positions);
      }
    } catch (error) {
      console.error('Error loading savings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#060B1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          fontSize: '20px',
          color: '#00E5FF',
          fontWeight: '600'
        }}>Loading...</div>
      </div>
    );
  }

  const hasSavings = savingsAssets.length > 0;

  return (
    <div style={{
      background: '#060B1A',
      fontFamily: 'Inter, sans-serif',
      paddingBottom: 0
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', paddingBottom: 0 }}>
        
        {/* HEADER - Same as Wallet */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '700',
              color: '#FFFFFF',
              margin: '0 0 8px 0'
            }}>Savings Vault</h1>
            <p style={{
              fontSize: '14px',
              color: '#8FA3BF',
              margin: 0,
              fontWeight: '400'
            }}>Earn passive yield on your crypto</p>
          </div>
          <button
            onClick={() => navigate('/savings/deposit')}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1.5px solid #00E5FF',
              borderRadius: '12px',
              color: '#00E5FF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            <IoAdd size={18} />
            Transfer from Wallet
          </button>
        </div>

        {/* BALANCE AREA - FLAT, NO CARD - Same as Wallet */}
        <div style={{
          padding: '24px 20px 20px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#8FA3C8',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Total Savings Value</div>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8FA3C8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {balanceVisible ? <IoEye size={16} /> : <IoEyeOff size={16} />}
            </button>
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#FFFFFF',
            lineHeight: '1',
            marginBottom: '8px'
          }}>
            {balanceVisible ? `£${totalSavings.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </div>
          <div style={{
            display: 'flex',
            gap: '24px',
            fontSize: '14px'
          }}>
            <div>
              <span style={{ color: '#8FA3C8' }}>Available: </span>
              <span style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {balanceVisible ? `£${availableToWithdraw.toFixed(2)}` : '•••'}
              </span>
            </div>
            <div>
              <span style={{ color: '#8FA3C8' }}>Interest Earned: </span>
              <span style={{ color: '#16C784', fontWeight: '600' }}>
                {balanceVisible ? `£${totalInterestEarned.toFixed(2)}` : '•••'}
              </span>
            </div>
          </div>
        </div>

        {/* SAVINGS ASSETS */}
        {!hasSavings ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#8FA3C8'
          }}>
            <p style={{ fontSize: '14px', margin: '0 0 16px 0' }}>
              No assets earning yield yet
            </p>
            <button
              onClick={() => navigate('/savings/deposit')}
              style={{
                padding: '10px 24px',
                background: '#0047D9',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Start Earning
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              fontSize: '14px',
              color: '#8FA3C8',
              fontWeight: '500',
              marginBottom: '12px',
              padding: '0 20px'
            }}>Your Savings</div>
            
            {savingsAssets.map((asset, idx) => {
              const currency = asset.currency || asset.asset || 'BTC';
              const amount = parseFloat(asset.amount || asset.balance || 0);
              const gbpValue = parseFloat(asset.value_gbp || asset.balance_gbp || 0);
              const apy = parseFloat(asset.apy || 5.0);
              const interestEarned = parseFloat(asset.interest_earned || asset.earnings || 0);

              return (
                <div
                  key={idx}
                  onClick={() => navigate(`/savings/asset/${currency.toLowerCase()}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flex: 1
                  }}>
                    <img
                      src={getCoinLogo(currency)}
                      alt={currency}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%'
                      }}
                      onError={(e) => {
                        e.target.src = `https://lcw.nyc3.cdn.digitaloceanspaces.com/production/currencies/64/${currency.toLowerCase()}.png`;
                        e.target.onerror = () => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzAwRTVGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4kPC90ZXh0Pjwvc3ZnPg==';
                        };
                      }}
                    />
                    <div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        marginBottom: '2px'
                      }}>{currency}</div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6B7A99',
                        fontWeight: '400'
                      }}>{amount.toFixed(8)}</div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '32px'
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '13px',
                        color: '#16C784',
                        fontWeight: '600',
                        marginBottom: '2px'
                      }}>
                        {apy.toFixed(1)}% APY
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#8FA3C8'
                      }}>
                        +£{interestEarned.toFixed(2)} earned
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#FFFFFF'
                      }}>
                        £{gbpValue.toFixed(2)}
                      </div>
                    </div>

                    <IoChevronForward size={18} style={{ color: '#6B7A99' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
