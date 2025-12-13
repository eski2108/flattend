import React, { useState } from 'react';
import Layout from '../components/Layout';

export default function Staking() {
  const [selectedCoin, setSelectedCoin] = useState('ETH');
  const [stakeAmount, setStakeAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState('flexible');
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [userBalances, setUserBalances] = useState({
    ETH: 25.4832,
    BNB: 42.3456,
    SOL: 158.9234,
    MATIC: 1250.5678,
    DOT: 35.1234,
    AVAX: 18.7654
  });

  // Animate stats on load
  React.useEffect(() => {
    setTimeout(() => setStatsLoaded(true), 300);
  }, []);

  // Placeholder staking options
  const stakingOptions = [
    {
      coin: 'ETH',
      name: 'Ethereum',
      icon: '⟠',
      apr: '4.2',
      minStake: '0.01',
      lockPeriod: 'Flexible',
      totalStaked: '2,458,392',
      yourStake: '2.5',
      pendingRewards: '0.0234'
    },
    {
      coin: 'BNB',
      name: 'Binance Coin',
      icon: '◆',
      apr: '5.8',
      minStake: '0.1',
      lockPeriod: 'Flexible',
      totalStaked: '8,923,441',
      yourStake: '5.0',
      pendingRewards: '0.0582'
    },
    {
      coin: 'SOL',
      name: 'Solana',
      icon: '◎',
      apr: '6.5',
      minStake: '1',
      lockPeriod: 'Flexible',
      totalStaked: '12,384,920',
      yourStake: '10.0',
      pendingRewards: '0.1950'
    },
    {
      coin: 'MATIC',
      name: 'Polygon',
      icon: '⬡',
      apr: '7.2',
      minStake: '10',
      lockPeriod: 'Flexible',
      totalStaked: '45,293,822',
      yourStake: '50.0',
      pendingRewards: '1.0800'
    },
    {
      coin: 'DOT',
      name: 'Polkadot',
      icon: '●',
      apr: '12.5',
      minStake: '1',
      lockPeriod: '28 Days',
      totalStaked: '3,482,103',
      yourStake: '0',
      pendingRewards: '0'
    },
    {
      coin: 'AVAX',
      name: 'Avalanche',
      icon: '▲',
      apr: '8.3',
      minStake: '0.5',
      lockPeriod: 'Flexible',
      totalStaked: '6,283,491',
      yourStake: '0',
      pendingRewards: '0'
    }
  ];

  const selectedOption = stakingOptions.find(opt => opt.coin === selectedCoin);

  const calculateRewards = () => {
    if (!stakeAmount || !selectedOption) return '0.000000';
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) return '0.000000';
    
    // Apply APR boost for locked period
    const apr = lockPeriod === 'locked' 
      ? parseFloat(selectedOption.apr) + 1.5 
      : parseFloat(selectedOption.apr);
    
    const daily = (amount * (apr / 100)) / 365;
    return daily.toFixed(6);
  };

  const calculateMonthlyRewards = () => {
    const daily = parseFloat(calculateRewards());
    return (daily * 30).toFixed(6);
  };

  const calculateYearlyRewards = () => {
    const daily = parseFloat(calculateRewards());
    return (daily * 365).toFixed(6);
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }

    const amount = parseFloat(stakeAmount);
    const balance = userBalances[selectedOption.coin];
    
    if (amount > balance) {
      alert(`Insufficient ${selectedOption.coin} balance`);
      return;
    }

    setIsStaking(true);
    
    // Simulate staking transaction
    setTimeout(() => {
      // Update user balances
      setUserBalances(prev => ({
        ...prev,
        [selectedOption.coin]: prev[selectedOption.coin] - amount
      }));
      
      // Update staked amount
      const updatedOptions = stakingOptions.map(opt => {
        if (opt.coin === selectedOption.coin) {
          return {
            ...opt,
            yourStake: (parseFloat(opt.yourStake) + amount).toFixed(4)
          };
        }
        return opt;
      });
      
      setIsStaking(false);
      setStakeAmount('');
      setSuccessMessage(`Successfully staked ${amount} ${selectedOption.coin}!`);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    }, 2000);
  };

  const handleUnstake = async () => {
    if (!selectedOption || parseFloat(selectedOption.yourStake) <= 0) {
      alert('No staked amount to unstake');
      return;
    }

    setIsUnstaking(true);
    
    // Simulate unstaking transaction
    setTimeout(() => {
      const stakedAmount = parseFloat(selectedOption.yourStake);
      
      // Return funds to balance
      setUserBalances(prev => ({
        ...prev,
        [selectedOption.coin]: prev[selectedOption.coin] + stakedAmount
      }));
      
      setIsUnstaking(false);
      setSuccessMessage(`Successfully unstaked ${stakedAmount} ${selectedOption.coin}!`);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    }, 2000);
  };

  const handleClaimRewards = async () => {
    if (!selectedOption || parseFloat(selectedOption.pendingRewards) <= 0) {
      alert('No rewards to claim');
      return;
    }

    setIsClaiming(true);
    
    // Simulate claiming rewards
    setTimeout(() => {
      const rewards = parseFloat(selectedOption.pendingRewards);
      
      // Add rewards to balance
      setUserBalances(prev => ({
        ...prev,
        [selectedOption.coin]: prev[selectedOption.coin] + rewards
      }));
      
      setIsClaiming(false);
      setSuccessMessage(`Successfully claimed ${rewards} ${selectedOption.coin} rewards!`);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    }, 2000);
  };

  return (
    <Layout>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 240, 255, 0.5);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        
        .staking-card-hover {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .staking-card-hover:hover {
          transform: translateY(-6px) scale(1.01);
        }
        
        .loading-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        @media (max-width: 1024px) {
          .staking-grid {
            grid-template-columns: 1fr !important;
          }
          .staking-option-card {
            grid-template-columns: 1fr !important;
            padding: 1.25rem !important;
          }
          .staking-panel {
            position: static !important;
            margin-top: 2rem;
          }
          .hero-title {
            font-size: 2rem !important;
          }
          .hero-description {
            font-size: 1rem !important;
          }
        }
        
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .hero-title {
            font-size: 1.75rem !important;
          }
          .staking-option-card {
            padding: 1rem !important;
          }
        }
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        padding: '2rem 1rem'
      }}>
        {/* Hero Section */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '3rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            borderRadius: '24px',
            padding: '3rem 2rem',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInUp 0.8s ease-out'
          }}>
            <div style={{ 
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}/>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 className="hero-title" style={{ 
                fontSize: '3rem', 
                fontWeight: '700',
                background: 'linear-gradient(90deg, #00F0FF 0%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '1rem',
                lineHeight: '1.2',
                letterSpacing: '-1px'
              }}>
                Earn Passive Income with Staking
              </h1>
              <p className="hero-description" style={{ 
                fontSize: '1.2rem', 
                color: '#ccc', 
                marginBottom: '2rem',
                maxWidth: '600px',
                lineHeight: '1.6'
              }}>
                Stake your crypto assets and earn rewards. Your funds are secured by industry-leading validators with competitive APR rates.
              </p>

              {/* Stats Grid - Animated */}
              <div className="stats-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '2rem',
                marginTop: '2rem'
              }}>
                <div style={{
                  opacity: statsLoaded ? 1 : 0,
                  transform: statsLoaded ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transitionDelay: '0.1s',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#888', 
                    marginBottom: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600'
                  }}>
                    Total Value Staked
                  </div>
                  <div style={{ 
                    fontSize: '2.2rem', 
                    fontWeight: '700', 
                    color: '#00F0FF',
                    letterSpacing: '-1px'
                  }}>
                    $342.8M
                  </div>
                </div>
                <div style={{
                  opacity: statsLoaded ? 1 : 0,
                  transform: statsLoaded ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transitionDelay: '0.2s',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#888', 
                    marginBottom: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600'
                  }}>
                    Your Total Staked
                  </div>
                  <div style={{ 
                    fontSize: '2.2rem', 
                    fontWeight: '700', 
                    color: '#fff',
                    letterSpacing: '-1px'
                  }}>
                    $8,450.32
                  </div>
                </div>
                <div style={{
                  opacity: statsLoaded ? 1 : 0,
                  transform: statsLoaded ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transitionDelay: '0.3s',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#888', 
                    marginBottom: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600'
                  }}>
                    Pending Rewards
                  </div>
                  <div style={{ 
                    fontSize: '2.2rem', 
                    fontWeight: '700', 
                    color: '#A855F7',
                    letterSpacing: '-1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    💎 $12.84
                  </div>
                </div>
                <div style={{
                  opacity: statsLoaded ? 1 : 0,
                  transform: statsLoaded ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transitionDelay: '0.4s',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(0, 240, 0, 0.05)',
                  border: '1px solid rgba(0, 240, 0, 0.2)'
                }}>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#888', 
                    marginBottom: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600'
                  }}>
                    Average APR
                  </div>
                  <div style={{ 
                    fontSize: '2.2rem', 
                    fontWeight: '700', 
                    color: '#00F000',
                    letterSpacing: '-1px'
                  }}>
                    6.8%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="staking-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 400px', 
            gap: '2rem'
          }}>
            
            {/* Staking Options */}
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '700', 
                color: '#fff',
                marginBottom: '1.5rem'
              }}>
                Available Staking Options
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stakingOptions.map(option => (
                  <div
                    className="staking-option-card"
                    key={option.coin}
                    onClick={() => setSelectedCoin(option.coin)}
                    onMouseEnter={(e) => {
                      if (selectedCoin !== option.coin) {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 240, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCoin !== option.coin) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    style={{
                      background: selectedCoin === option.coin 
                        ? 'rgba(0, 240, 255, 0.1)' 
                        : 'rgba(0, 0, 0, 0.3)',
                      border: selectedCoin === option.coin
                        ? '2px solid #00F0FF'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto auto',
                      gap: '2rem',
                      alignItems: 'center',
                      boxShadow: selectedCoin === option.coin ? '0 8px 30px rgba(0, 240, 255, 0.3)' : 'none',
                      transform: selectedCoin === option.coin ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                  >
                    {/* Coin Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        fontSize: '2.5rem',
                        width: '56px',
                        height: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: selectedCoin === option.coin 
                          ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)'
                          : 'rgba(0, 240, 255, 0.1)',
                        borderRadius: '14px',
                        border: selectedCoin === option.coin ? '2px solid rgba(0, 240, 255, 0.4)' : 'none',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: selectedCoin === option.coin ? '0 4px 20px rgba(0, 240, 255, 0.3)' : 'none'
                      }}>
                        {option.icon}
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: '700', 
                          color: '#fff',
                          letterSpacing: '-0.3px'
                        }}>
                          {option.coin}
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#888', marginTop: '0.2rem' }}>
                          {option.name}
                        </div>
                      </div>
                    </div>

                    {/* APR */}
                    <div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888', 
                        marginBottom: '0.4rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: '600'
                      }}>
                        APR
                      </div>
                      <div style={{ 
                        fontSize: '1.8rem', 
                        fontWeight: '700', 
                        color: '#00F000',
                        letterSpacing: '-0.5px',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.2rem'
                      }}>
                        {option.apr}
                        <span style={{ fontSize: '1rem', opacity: 0.8 }}>%</span>
                      </div>
                    </div>

                    {/* Lock Period */}
                    <div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888', 
                        marginBottom: '0.4rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: '600'
                      }}>
                        Lock Period
                      </div>
                      <div style={{ 
                        fontSize: '1.05rem', 
                        color: '#fff',
                        fontWeight: '600'
                      }}>
                        {option.lockPeriod}
                      </div>
                    </div>

                    {/* Your Stake */}
                    <div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888', 
                        marginBottom: '0.4rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: '600'
                      }}>
                        Your Stake
                      </div>
                      <div style={{ 
                        fontSize: '1.05rem', 
                        color: '#fff',
                        fontWeight: '600'
                      }}>
                        {option.yourStake} {option.coin}
                      </div>
                    </div>

                    {/* Pending Rewards */}
                    <div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888', 
                        marginBottom: '0.4rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: '600'
                      }}>
                        Pending
                      </div>
                      <div style={{ 
                        fontSize: '1.05rem', 
                        color: '#A855F7', 
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        {parseFloat(option.pendingRewards) > 0 && (
                          <span style={{ fontSize: '0.9rem' }}>💎</span>
                        )}
                        {option.pendingRewards}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staking Panel */}
            <div>
              <div className="staking-panel" style={{
                background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.4) 100%)',
                border: '2px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '20px',
                padding: '2rem',
                position: 'sticky',
                top: '2rem',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: '#fff',
                  marginBottom: '1.5rem'
                }}>
                  Stake {selectedOption?.name}
                </h3>

                {/* Balance Display */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0.03) 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 15px rgba(0, 240, 255, 0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ 
                      color: '#888', 
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600'
                    }}>
                      Available Balance
                    </span>
                    <span 
                      onClick={() => {
                        const balance = userBalances[selectedOption?.coin] || 0;
                        setStakeAmount(balance.toFixed(4));
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#00F0FF';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      style={{ 
                        color: '#00F0FF', 
                        fontSize: '0.85rem', 
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.3s ease',
                        padding: '0.3rem 0.6rem',
                        background: 'rgba(0, 240, 255, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(0, 240, 255, 0.3)'
                      }}>
                      MAX
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: '700', 
                    color: '#fff',
                    letterSpacing: '-0.5px',
                    marginBottom: '0.4rem'
                  }}>
                    {userBalances[selectedOption?.coin]?.toFixed(4) || '0.0000'} {selectedOption?.coin}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#aaa' }}>
                    ≈ ${(userBalances[selectedOption?.coin] * 1680).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
                  </div>
                </div>

                {/* Lock Period Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#fff', 
                    fontSize: '0.95rem',
                    marginBottom: '0.8rem',
                    fontWeight: '600'
                  }}>
                    Lock Period
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <button
                      onClick={() => setLockPeriod('flexible')}
                      onMouseEnter={(e) => {
                        if (lockPeriod !== 'flexible') {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (lockPeriod !== 'flexible') {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                      style={{
                        background: lockPeriod === 'flexible' 
                          ? 'linear-gradient(90deg, #00F0FF 0%, #A855F7 100%)'
                          : 'rgba(0, 0, 0, 0.3)',
                        border: lockPeriod === 'flexible' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '1rem',
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        boxShadow: lockPeriod === 'flexible' ? '0 4px 15px rgba(0, 240, 255, 0.3)' : 'none'
                      }}
                    >
                      <div>Flexible</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.3rem' }}>
                        {selectedOption?.apr}% APR
                      </div>
                    </button>
                    <button
                      onClick={() => setLockPeriod('locked')}
                      onMouseEnter={(e) => {
                        if (lockPeriod !== 'locked') {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (lockPeriod !== 'locked') {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                      style={{
                        background: lockPeriod === 'locked' 
                          ? 'linear-gradient(90deg, #00F0FF 0%, #A855F7 100%)'
                          : 'rgba(0, 0, 0, 0.3)',
                        border: lockPeriod === 'locked' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '1rem',
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        boxShadow: lockPeriod === 'locked' ? '0 4px 15px rgba(0, 240, 255, 0.3)' : 'none'
                      }}
                    >
                      <div>30 Days</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.3rem' }}>
                        {(parseFloat(selectedOption?.apr || 0) + 1.5).toFixed(1)}% APR
                      </div>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#fff', 
                    fontSize: '0.9rem',
                    marginBottom: '0.8rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Amount to Stake
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)'}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '14px',
                      padding: '1.2rem',
                      color: '#fff',
                      fontSize: '1.4rem',
                      fontWeight: '700',
                      outline: 'none',
                      transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                      letterSpacing: '-0.3px'
                    }}
                  />
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    marginTop: '0.8rem'
                  }}>
                    {['25%', '50%', '75%', '100%'].map(percent => (
                      <button
                        key={percent}
                        onClick={() => {
                          const balance = userBalances[selectedOption?.coin] || 0;
                          const amount = balance * (parseInt(percent) / 100);
                          setStakeAmount(amount.toFixed(4));
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        style={{
                          flex: 1,
                          background: 'rgba(0, 240, 255, 0.1)',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          color: '#00F0FF',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {percent}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rewards Calculator - Enhanced */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
                  border: '2px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 20px rgba(168, 85, 247, 0.2)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.8rem' 
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>💰</span>
                    <div style={{ fontSize: '0.9rem', color: '#A855F7', fontWeight: '600' }}>
                      Estimated Daily Rewards
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700', 
                    color: '#fff',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.5px'
                  }}>
                    {calculateRewards()} {selectedOption?.coin}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#aaa' }}>
                    ≈ ${(parseFloat(calculateRewards()) * 1680).toFixed(2)} USD
                  </div>
                  <div style={{ 
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(168, 85, 247, 0.2)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    fontSize: '0.85rem'
                  }}>
                    <div>
                      <div style={{ color: '#888', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Monthly</div>
                      <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.95rem' }}>
                        {calculateMonthlyRewards()} {selectedOption?.coin}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#888', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Yearly</div>
                      <div style={{ color: '#00F000', fontWeight: '600', fontSize: '0.95rem' }}>
                        {calculateYearlyRewards()} {selectedOption?.coin}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stake Button */}
                <button 
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  onMouseEnter={(e) => {
                    if (!isStaking) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 240, 255, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isStaking) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 240, 255, 0.3)';
                    }
                  }}
                  style={{
                    width: '100%',
                    background: isStaking 
                      ? 'rgba(0, 240, 255, 0.3)'
                      : 'linear-gradient(90deg, #00F0FF 0%, #A855F7 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.2rem',
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    cursor: isStaking ? 'not-allowed' : 'pointer',
                    marginBottom: '0.8rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 20px rgba(0, 240, 255, 0.3)',
                    opacity: isStaking ? 0.6 : 1
                  }}>
                  {isStaking ? '⏳ Staking...' : `Stake ${selectedOption?.coin}`}
                </button>

                {/* Unstake Button */}
                {parseFloat(selectedOption?.yourStake || 0) > 0 && (
                  <button 
                    onClick={handleUnstake}
                    disabled={isUnstaking}
                    onMouseEnter={(e) => {
                      if (!isUnstaking) {
                        e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUnstaking) {
                        e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                      }
                    }}
                    style={{
                      width: '100%',
                      background: isUnstaking ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 0, 0, 0.1)',
                      border: '1px solid rgba(255, 0, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: '#FF4444',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: isUnstaking ? 'not-allowed' : 'pointer',
                      marginBottom: '0.8rem',
                      transition: 'all 0.3s ease',
                      opacity: isUnstaking ? 0.6 : 1
                    }}>
                    {isUnstaking ? '⏳ Unstaking...' : `Unstake ${selectedOption?.yourStake} ${selectedOption?.coin}`}
                  </button>
                )}

                {/* Claim Rewards Button */}
                {parseFloat(selectedOption?.pendingRewards || 0) > 0 && (
                  <button 
                    onClick={handleClaimRewards}
                    disabled={isClaiming}
                    onMouseEnter={(e) => {
                      if (!isClaiming) {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isClaiming) {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                    style={{
                      width: '100%',
                      background: isClaiming ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)',
                      border: '1px solid rgba(168, 85, 247, 0.5)',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: '#A855F7',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: isClaiming ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: 'none',
                      opacity: isClaiming ? 0.6 : 1
                    }}>
                    {isClaiming ? '⏳ Claiming...' : `💎 Claim ${selectedOption?.pendingRewards} ${selectedOption?.coin}`}
                  </button>
                )}

                {/* Info */}
                <div style={{ 
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(0, 240, 0, 0.05)',
                  border: '1px solid rgba(0, 240, 0, 0.2)',
                  borderRadius: '10px'
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#888', lineHeight: '1.6' }}>
                    🔒 <strong style={{ color: '#00F000' }}>Safe & Secure</strong><br/>
                    Your funds are staked with industry-leading validators. All staking is handled by Ankr's trusted network.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Modal - Enhanced */}
        {showSuccessModal && (
          <div style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            background: 'linear-gradient(135deg, rgba(0, 240, 0, 0.98) 0%, rgba(0, 200, 0, 0.98) 100%)',
            border: '2px solid rgba(0, 255, 0, 0.6)',
            borderRadius: '20px',
            padding: '1.5rem 2rem',
            boxShadow: '0 20px 60px rgba(0, 255, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset',
            zIndex: 9999,
            animation: 'slideInRight 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            minWidth: '350px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                fontSize: '2.5rem',
                animation: 'pulse 1s ease-in-out infinite'
              }}>
                ✅
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginBottom: '0.4rem', letterSpacing: '-0.3px' }}>
                  Transaction Successful!
                </div>
                <div style={{ fontSize: '0.95rem', color: '#fff', opacity: 0.95, lineHeight: '1.4' }}>
                  {successMessage}
                </div>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
