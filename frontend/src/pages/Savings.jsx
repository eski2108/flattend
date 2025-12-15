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

        {/* PREMIUM SAVINGS SUMMARY CARD */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.03) 0%, rgba(0, 197, 215, 0.02) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(0, 229, 255, 0.08)',
          boxShadow: `
            0 0 40px rgba(0, 229, 255, 0.06),
            0 8px 32px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.02)
          `,
          padding: '32px',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `
            0 0 60px rgba(0, 229, 255, 0.1),
            0 12px 48px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.03)
          `;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `
            0 0 40px rgba(0, 229, 255, 0.06),
            0 8px 32px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.02)
          `;
          e.currentTarget.style.transform = 'translateY(0px)';
        }}
        >
          {/* Subtle glow overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.3), transparent)'
          }} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '48px'
          }}>
            {/* Total Savings */}
            <div style={{
              flex: 1,
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '11px',
                  color: '#8FA3C8',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>Total Savings</div>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8FA3C8',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
                    e.currentTarget.style.color = '#00E5FF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#8FA3C8';
                  }}
                >
                  {balanceVisible ? <IoEye size={16} /> : <IoEyeOff size={16} />}
                </button>
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#FFFFFF',
                marginBottom: '4px',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                {balanceVisible ? `£${totalSavings.toFixed(2)}` : '••••••'}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6B7A99',
                fontWeight: '500'
              }}>Portfolio Value</div>
            </div>

            {/* Subtle Divider */}
            <div style={{
              width: '1px',
              height: '80px',
              background: 'linear-gradient(180deg, transparent, rgba(0, 229, 255, 0.15), transparent)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '3px',
                height: '3px',
                background: '#00E5FF',
                borderRadius: '50%',
                boxShadow: '0 0 8px rgba(0, 229, 255, 0.6)'
              }} />
            </div>

            {/* Available to Withdraw */}
            <div style={{
              flex: 1,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '11px',
                color: '#8FA3C8',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px'
              }}>Available</div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#FFFFFF',
                marginBottom: '4px',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                {balanceVisible ? `£${availableToWithdraw.toFixed(2)}` : '••••••'}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6B7A99',
                fontWeight: '500'
              }}>Ready to withdraw</div>
            </div>

            {/* Subtle Divider */}
            <div style={{
              width: '1px',
              height: '80px',
              background: 'linear-gradient(180deg, transparent, rgba(22, 199, 132, 0.15), transparent)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '3px',
                height: '3px',
                background: '#16C784',
                borderRadius: '50%',
                boxShadow: '0 0 8px rgba(22, 199, 132, 0.6)'
              }} />
            </div>

            {/* Total Interest Earned */}
            <div style={{
              flex: 1,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '11px',
                color: '#8FA3C8',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px'
              }}>Total Earned</div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#16C784',
                marginBottom: '4px',
                textShadow: '0 2px 8px rgba(22, 199, 132, 0.2)'
              }}>
                {balanceVisible ? `£${totalInterestEarned.toFixed(2)}` : '••••••'}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6B7A99',
                fontWeight: '500'
              }}>Lifetime earnings</div>
            </div>
          </div>
        </div>

        {/* PREMIUM EMPTY STATE OR ASSET LIST */}
        {!hasSavings ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, rgba(0, 229, 255, 0.01) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.03)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.1), rgba(0, 197, 215, 0.05))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              border: '1px solid rgba(0, 229, 255, 0.1)'
            }}>📈</div>
            <div style={{
              fontSize: '18px',
              color: '#FFFFFF',
              fontWeight: '600',
              marginBottom: '8px'
            }}>Start Your Savings Journey</div>
            <div style={{
              fontSize: '14px',
              color: '#8FA3C8',
              marginBottom: '32px',
              maxWidth: '400px',
              margin: '0 auto 32px'
            }}>Transfer crypto from your wallet to earn competitive yields with our secure savings products</div>
            <button
              onClick={handleStartSaving}
              style={{
                padding: '14px 36px',
                background: 'linear-gradient(135deg, #00E5FF, #00C5D7)',
                border: 'none',
                borderRadius: '28px',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0, 229, 255, 0.25)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 229, 255, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 229, 255, 0.25)';
              }}
            >
              Transfer from Wallet
            </button>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(0, 229, 255, 0.01) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '16px',
              color: '#FFFFFF',
              fontWeight: '600',
              marginBottom: '0px',
              padding: '24px 24px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}>Your Savings Portfolio</div>
            
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
                    padding: '18px 24px',
                    background: 'transparent',
                    borderBottom: idx === savingsAssets.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0, 229, 255, 0.03), rgba(0, 197, 215, 0.02))';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0px)';
                  }}
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
