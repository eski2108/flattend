/* eslint-disable */
import { BiArrowToTop } from 'react-icons/bi';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoArrowForward, IoCash, IoFlash, IoPieChart as PieChart, IoRefresh, IoTrendingDown, IoTrendingUp } from 'react-icons/io5';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import Chart from 'react-apexcharts';

const API = process.env.REACT_APP_BACKEND_URL;

export default function PortfolioPageEnhanced() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalPL, setTotalPL] = useState(0);
  const [totalPLPercent, setTotalPLPercent] = useState(0);
  const [user, setUser] = useState(null);

  const fetchPortfolio = async (userId) => {
    try {
      // Use SAME endpoint as WalletPage for consistency
      const response = await axios.get(`${API}/api/wallets/balances/${userId}?_t=${Date.now()}`);
      if (response.data.success) {
        const transformedAllocations = response.data.balances.map(bal => ({
          currency: bal.currency,
          wallet_amount: bal.total_balance || 0,
          savings_amount: 0,
          total_amount: bal.total_balance || 0,
          avg_buy_price: bal.gbp_value / bal.total_balance || 0,
          current_price: bal.gbp_value / bal.total_balance || 0,
          current_value_usd: bal.gbp_value || 0,
          unrealized_pl_usd: 0,
          unrealized_pl_percent: 0,
          allocation_percent: 0
        }));
        
        // Calculate total
        const totalGBP = response.data.balances.reduce((sum, bal) => sum + (bal.gbp_value || 0), 0);
        
        // Calculate percentages
        transformedAllocations.forEach(alloc => {
          alloc.allocation_percent = totalGBP > 0 ? (alloc.current_value_usd / totalGBP * 100) : 0;
        });
        
        setPortfolio(transformedAllocations);
        setTotalValue(totalGBP);
        setTotalInvested(totalGBP);
        setTotalPL(0);
        setTotalPLPercent(0);
        // console.log('💵 PortfolioPage Total: £' + totalGBP.toFixed(2));
      }
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setLoading(false);
      setRefreshing(false);
      toast.error('Failed to load portfolio');
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
  }, [navigate]);

  useEffect(() => {
    if (user?.user_id) {
      fetchPortfolio(user.user_id);

      // Auto-refresh portfolio every 10 seconds
      const refreshInterval = setInterval(() => {
        // console.log('🔄 Auto-refreshing portfolio...');
        fetchPortfolio(user.user_id);
      }, 10000); // 10 seconds

      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [user?.user_id]);

  const handleRefresh = () => {
    if (!refreshing && user) {
      setRefreshing(true);
      fetchPortfolio(user.user_id);
      toast.success('Refreshing portfolio...');
    }
  };

  const isProfit = totalPL >= 0;

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', color: '#00F0FF', fontWeight: '700', marginBottom: '12px' }}>Loading Portfolio...</div>
            <div style={{ fontSize: '14px', color: '#A3AEC2' }}>Fetching your holdings</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.05); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header with Refresh */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Portfolio Overview
            </h1>
            <p style={{ color: '#A3AEC2', fontSize: '16px' }}>
              Track your crypto holdings and performance
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '12px 24px',
              background: refreshing ? 'rgba(0,240,255,0.1)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '12px',
              color: refreshing ? '#00F0FF' : '#000',
              fontWeight: '700',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            <IoRefresh size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Total Value */}
          <div style={{
            background: 'rgba(0, 240, 255, 0.05)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00F0FF, #00C8D7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0,240,255,0.4)'
              }}>
                <IoCash size={22} style={{ color: '#000' }} />
              </div>
              <div style={{ fontSize: '14px', color: '#A3AEC2', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                Total Value
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF', marginBottom: '4px' }}>
              £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '14px', color: '#6EE7B7' }}>
              ≈ ${(totalValue * 1.27).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>

          {/* Total P/L */}
          <div style={{
            background: isProfit ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            border: `2px solid ${isProfit ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '16px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '150px',
              height: '150px',
              background: `radial-gradient(circle, ${isProfit ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'} 0%, transparent 70%)`,
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isProfit ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 20px ${isProfit ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`
              }}>
                {isProfit ? <IoTrendingUp size={22} style={{ color: '#FFF' }} /> : <IoTrendingDown size={22} style={{ color: '#FFF' }} />}
              </div>
              <div style={{ fontSize: '14px', color: '#A3AEC2', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                Total P/L
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: isProfit ? '#22C55E' : '#EF4444', marginBottom: '4px' }}>
              {isProfit ? '+' : ''}£{Math.abs(totalPL).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: isProfit ? '#22C55E' : '#EF4444' }}>
              {isProfit ? '+' : ''}{totalPLPercent.toFixed(2)}%
            </div>
          </div>

          {/* Holdings Count */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.05)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #A855F7, #9333EA)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(168,85,247,0.4)'
              }}>
                <PieChart size={22} style={{ color: '#FFF' }} />
              </div>
              <div style={{ fontSize: '14px', color: '#A3AEC2', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                Holdings
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7', marginBottom: '4px' }}>
              {portfolio.length}
            </div>
            <div style={{ fontSize: '14px', color: '#C4B5FD' }}>
              {portfolio.filter(p => p.total_amount > 0).length} Active Assets
            </div>
          </div>
        </div>

        {/* Portfolio Allocation Pie Chart */}
        {portfolio.length > 0 && portfolio.some(p => p.total_amount > 0) && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '2px solid rgba(0,240,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated background glow */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(0,240,255,0.05) 0%, transparent 50%)',
              animation: 'pulse 4s ease-in-out infinite',
              pointerEvents: 'none'
            }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(0,240,255,0.6)'
              }}>
                <PieChart size={28} style={{ color: '#000' }} />
              </div>
              <div>
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                  textShadow: '0 0 30px rgba(0,240,255,0.3)'
                }}>
                  Portfolio Allocation
                </h2>
                <p style={{ 
                  color: '#A3AEC2', 
                  fontSize: '16px', 
                  margin: 0,
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  Asset distribution breakdown
                </p>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 400px', 
              gap: '3rem', 
              alignItems: 'center',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Pie Chart */}
              <div style={{ position: 'relative' }}>
                <Chart
                  options={{
                    chart: {
                      type: 'pie',
                      background: 'transparent',
                      animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: {
                          enabled: true,
                          delay: 150
                        },
                        dynamicAnimation: {
                          enabled: true,
                          speed: 800
                        }
                      }
                    },
                    colors: ['#00F0FF', '#A855F7', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
                    labels: portfolio.filter(p => p.total_amount > 0).map(p => p.currency),
                    legend: {
                      show: false
                    },
                    dataLabels: {
                      enabled: true,
                      style: {
                        fontSize: '20px',
                        fontFamily: '"Inter", "Montserrat", system-ui, -apple-system, sans-serif',
                        fontWeight: 'bold',
                        colors: ['#FFFFFF']
                      },
                      formatter: function(val, opts) {
                        return opts.w.config.series[opts.seriesIndex] > 5 ? val.toFixed(1) + '%' : '';
                      },
                      dropShadow: {
                        enabled: true,
                        top: 3,
                        left: 3,
                        blur: 6,
                        color: '#000000',
                        opacity: 0.95
                      }
                    },
                    plotOptions: {
                      pie: {
                        size: 300,
                        donut: {
                          size: '0%'
                        },
                        expandOnClick: true,
                        customScale: 1.1
                      }
                    },
                    stroke: {
                      show: true,
                      width: 4,
                      colors: ['rgba(10, 14, 39, 0.8)']
                    },
                    tooltip: {
                      enabled: true,
                      theme: 'dark',
                      style: {
                        fontSize: '14px',
                        fontFamily: 'Inter, system-ui, sans-serif'
                      },
                      y: {
                        formatter: function(val, opts) {
                          const currency = opts.w.config.labels[opts.seriesIndex];
                          const holding = portfolio.find(p => p.currency === currency);
                          return `£${holding?.current_value_usd?.toFixed(2) || '0.00'} (${val.toFixed(1)}%)`;
                        }
                      }
                    },
                    responsive: [{
                      breakpoint: 768,
                      options: {
                        plotOptions: {
                          pie: {
                            size: 250
                          }
                        }
                      }
                    }]
                  }}
                  series={portfolio.filter(p => p.total_amount > 0).map(p => p.allocation_percent)}
                  type="pie"
                  height={350}
                />
              </div>

              {/* Legend with Premium Styling */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {portfolio.filter(p => p.total_amount > 0).map((holding, index) => {
                  const colors = ['#00F0FF', '#A855F7', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
                  return (
                    <div key={index} style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: `2px solid ${colors[index % colors.length]}40`,
                      borderRadius: '16px',
                      padding: '1.5rem',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 32px ${colors[index % colors.length]}40`;
                      e.currentTarget.style.borderColor = colors[index % colors.length];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = `${colors[index % colors.length]}40`;
                    }}
                    >
                      {/* Glow effect */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: `linear-gradient(90deg, transparent, ${colors[index % colors.length]}, transparent)`,
                        opacity: 0.8
                      }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: colors[index % colors.length],
                          boxShadow: `0 0 20px ${colors[index % colors.length]}80`,
                          border: '2px solid rgba(255,255,255,0.2)'
                        }} />
                        <div style={{
                          fontSize: '20px',
                          fontWeight: '900',
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          textShadow: '0 0 10px rgba(255,255,255,0.3)'
                        }}>
                          {holding.currency}
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: '#A3AEC2',
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            fontWeight: '700',
                            marginBottom: '4px'
                          }}>
                            VALUE
                          </div>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: '900',
                            background: `linear-gradient(135deg, ${colors[index % colors.length]}, #FFFFFF)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: `0 0 20px ${colors[index % colors.length]}50`
                          }}>
                            £{holding.current_value_usd.toFixed(2)}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: '#A3AEC2',
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            fontWeight: '700',
                            marginBottom: '4px'
                          }}>
                            ALLOCATION
                          </div>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: '900',
                            color: colors[index % colors.length],
                            textShadow: `0 0 20px ${colors[index % colors.length]}50`
                          }}>
                            {holding.allocation_percent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#A3AEC2',
                          textTransform: 'uppercase',
                          letterSpacing: '1.5px',
                          fontWeight: '700',
                          marginBottom: '4px'
                        }}>
                          BALANCE
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#FFFFFF',
                          opacity: 0.9
                        }}>
                          {holding.total_amount.toFixed(8)} {holding.currency}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TradingView Widget Section */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <IoFlash size={24} color="#00F0FF" />
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0 }}>Live Market Data</h2>
          </div>
          
          {/* Market Overview Widget */}
          <div style={{ height: '450px', borderRadius: '12px', overflow: 'hidden' }}>
            <iframe
              style={{ width: '100%', height: '100%', border: 'none' }}
              src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BITSTAMP%3ABTCUSD&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0e27&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=coinhubx&utm_medium=widget"
              title="TradingView Widget"
            />
          </div>
        </div>

        {/* Portfolio Holdings */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
            Your Holdings
          </h2>

          {portfolio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#A3AEC2' }}>
              <PieChart size={64} style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>No Holdings Yet</h3>
              <p style={{ marginBottom: '1.5rem' }}>Start by depositing crypto to see your portfolio here</p>
              <button
                onClick={() => navigate('/wallet')}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Go to Wallet
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', color: '#A3AEC2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asset</th>
                    <th style={{ textAlign: 'right', padding: '16px', fontSize: '14px', color: '#A3AEC2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</th>
                    <th style={{ textAlign: 'right', padding: '16px', fontSize: '14px', color: '#A3AEC2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '16px', fontSize: '14px', color: '#A3AEC2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value</th>
                    <th style={{ textAlign: 'right', padding: '16px', fontSize: '14px', color: '#A3AEC2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allocation</th>
                    <th style={{ textAlign: 'center', padding: '16px', fontSize: '14px', color: '#A3AEC2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((holding, index) => {
                    if (holding.total_amount === 0) return null;
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,240,255,0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: '700',
                              color: '#000'
                            }}>
                              {holding.currency[0]}
                            </div>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{holding.currency}</div>
                              <div style={{ fontSize: '12px', color: '#A3AEC2' }}>{holding.currency === 'BTC' ? 'Bitcoin' : holding.currency === 'ETH' ? 'Ethereum' : holding.currency === 'USDT' ? 'Tether' : 'Cryptocurrency'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                            {holding.total_amount.toFixed(8)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#A3AEC2' }}>{holding.currency}</div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '16px', color: '#fff', fontWeight: '600' }}>
                          £{holding.current_price.toFixed(2)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#00F0FF' }}>
                            £{holding.current_value_usd.toFixed(2)}
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            background: 'rgba(0,240,255,0.1)',
                            border: '1px solid rgba(0,240,255,0.3)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#00F0FF'
                          }}>
                            {holding.allocation_percent.toFixed(1)}%
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button
                            onClick={() => navigate(`/swap-crypto?from=${holding.currency.toLowerCase()}`)}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#000',
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontSize: '14px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            Swap
                            <BiArrowToTop size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </Layout>
  );
}
