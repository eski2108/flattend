import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoEye, IoEyeOff, IoChevronForward } from 'react-icons/io5';
import { getCoinLogo } from '../utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Savings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  
  // REAL DATA FROM BACKEND ONLY
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

  const handleStartSaving = () => {
    navigate('/savings/deposit');
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
        }}>Loading Savings...</div>
      </div>
    );
  }

  const hasSavings = savingsAssets.length > 0;

  return (
    <div style={{
      background: '#060B1A',
      fontFamily: 'Inter, sans-serif',
      minHeight: '100vh',
      paddingBottom: 0
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', paddingBottom: 0 }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          paddingTop: '20px'
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
            onClick={handleStartSaving}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #00E5FF, #00C5D7)',
              border: 'none',
              borderRadius: '24px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 229, 255, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            Transfer from Wallet
          </button>
        </div>

        {/* SAVINGS SUMMARY STRIP */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {/* Total Savings */}
          <div style={{
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 229, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                fontSize: '11px',
                color: '#8FA3C8',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Total Savings</div>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8FA3C8',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                {balanceVisible ? <IoEye size={16} /> : <IoEyeOff size={16} />}
              </button>
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#FFFFFF'
            }}>
              {balanceVisible ? `£${totalSavings.toFixed(2)}` : '••••••'}
            </div>
          </div>

          {/* Available */}
          <div style={{
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(138, 92, 246, 0.1)'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#8FA3C8',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>Available</div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#FFFFFF'
            }}>
              {balanceVisible ? `£${availableToWithdraw.toFixed(2)}` : '••••••'}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#8FA3C8',
              marginTop: '4px'
            }}>Ready to withdraw</div>
          </div>

          {/* Total Interest */}
          <div style={{
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(22, 199, 132, 0.15)'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#8FA3C8',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>Total Interest Earned</div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#16C784'
            }}>
              {balanceVisible ? `£${totalInterestEarned.toFixed(2)}` : '••••••'}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#8FA3C8',
              marginTop: '4px'
            }}>Lifetime earnings</div>
          </div>
        </div>

        {/* EMPTY STATE OR ASSET LIST */}
        {!hasSavings ? (
          <div style={{
            padding: '80px 20px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              opacity: 0.3
            }}>📈</div>
            <div style={{
              fontSize: '16px',
              color: '#FFFFFF',
              fontWeight: '600',
              marginBottom: '8px'
            }}>No assets in savings yet</div>
            <div style={{
              fontSize: '14px',
              color: '#8FA3C8',
              marginBottom: '24px'
            }}>Transfer crypto from your wallet to start earning passive yield</div>
            <button
              onClick={handleStartSaving}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #00E5FF, #00C5D7)',
                border: 'none',
                borderRadius: '24px',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 229, 255, 0.3)'
              }}
            >
              Start Saving
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '24px' }}>
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
                        e.target.onerror = (err) => {
                          err.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzAwRTVGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4kPC90ZXh0Pjwvc3ZnPg==';
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
                      }}>Saving</div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flex: 1,
                    justifyContent: 'center'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#FFFFFF'
                      }}>
                        {amount.toFixed(8)} {currency}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#8FA3C8',
                        marginTop: '2px'
                      }}>
                        £{gbpValue.toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      background: 'rgba(22, 199, 132, 0.15)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#16C784'
                    }}>
                      {apy.toFixed(1)}% APY
                    </div>
                  </div>

                  <div style={{
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '13px',
                        color: '#16C784',
                        fontWeight: '600'
                      }}>
                        +£{interestEarned.toFixed(2)}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#8FA3C8',
                        marginTop: '2px'
                      }}>
                        Interest
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
