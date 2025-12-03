import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  IoCopyOutline, 
  IoLogoWhatsapp,
  IoLogoFacebook,
  IoLogoTwitter,
  IoCheckmarkCircleOutline,
  IoInformationCircleOutline,
  IoTrendingUpOutline,
  IoPeopleOutline,
  IoTimeOutline,
  IoTrophyOutline,
  IoFilterOutline,
  IoQrCodeOutline,
  IoGlobeOutline,
  IoPhonePortraitOutline
} from 'react-icons/io5';
import QRCode from 'qrcode';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import API_BASE_URL from '@/config/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API = API_BASE_URL;

export default function ReferralDashboardComprehensive() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comprehensiveData, setComprehensiveData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [commissionFilter, setCommissionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [chartPeriod, setChartPeriod] = useState('weekly');

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  useEffect(() => {
    if (user?.user_id) {
      fetchComprehensiveData();
    }
  }, [user]);

  useEffect(() => {
    if (comprehensiveData?.referral_link) {
      generateQRCode(comprehensiveData.referral_link);
    }
  }, [comprehensiveData]);

  const fetchComprehensiveData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/referral/dashboard/comprehensive/${user.user_id}`);
      if (response.data.success) {
        setComprehensiveData(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (text) => {
    try {
      const url = await QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('QR Code generation error:', error);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(type);
    toast.success(`${type} copied!`);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const shareVia = (platform) => {
    const link = comprehensiveData?.referral_link || '';
    const text = `Join CoinHub X and start trading! Use my link: ${link}`;
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join CoinHub X')}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
    };
    
    if (urls[platform]) window.open(urls[platform], '_blank');
  };

  const getEarningsChartData = () => {
    const period = chartPeriod;
    let labels = [];
    let data = [];

    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
        data.push(Math.random() * 50); // Replace with real data
      }
    } else if (period === 'weekly') {
      for (let i = 7; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        labels.push(`Week ${8-i}`);
        data.push(Math.random() * 150); // Replace with real data
      }
    } else {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      data = Array(12).fill(0).map(() => Math.random() * 500); // Replace with real data
    }

    return {
      labels,
      datasets: [{
        label: 'Earnings (£)',
        data,
        fill: true,
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        borderColor: '#00F0FF',
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: '#00F0FF',
        pointBorderColor: '#000',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    };
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0b1a 0%, #1a1f3a 50%, #0a0b1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(0, 240, 255, 0.1)',
            borderTop: '4px solid #00F0FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '600' }}>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const totalEarnings = comprehensiveData?.total_earnings?.total_gbp || 0;
  const monthEarnings = comprehensiveData?.earnings_by_period?.month?.amount || 0;
  const activeReferrals = comprehensiveData?.referral_stats?.active_referrals || 0;
  const pendingSignups = comprehensiveData?.referral_stats?.pending_signups || 0;
  const tier = comprehensiveData?.tier || 'standard';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0b1a 0%, #1a1f3a 50%, #0a0b1a 100%)',
      padding: '1rem',
      paddingTop: '80px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF, #FFD700, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            🚀 Referral Dashboard
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>Complete referral analytics and earnings tracker</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          overflowX: 'auto',
          padding: '0.5rem',
          background: 'rgba(26, 31, 58, 0.5)',
          borderRadius: '12px'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📋' },
            { id: 'earnings', label: 'Earnings', icon: '💰' },
            { id: 'activity', label: 'Activity', icon: '📊' },
            { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
            { id: 'links', label: 'Links & QR', icon: '🔗' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '0.75rem 1rem',
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #00F0FF, #A855F7)' 
                  : 'rgba(0, 0, 0, 0.3)',
                border: activeTab === tab.id ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: activeTab === tab.id ? '#000' : '#fff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT BASED ON ACTIVE TAB */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {/* Total Earnings */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 240, 255, 0.05))',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid rgba(0, 240, 255, 0.3)'
              }}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>Total Lifetime Earnings</div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
                  £{totalEarnings.toFixed(2)}
                </div>
                <div style={{ color: '#00FF88', fontSize: '12px', fontWeight: '600' }}>
                  ↑ +£{monthEarnings.toFixed(2)} this month
                </div>
              </div>

              {/* Active Referrals */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05))',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid rgba(255, 215, 0, 0.3)'
              }}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>Active Referrals</div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#FFD700' }}>
                  {activeReferrals}
                </div>
                <div style={{ color: '#888', fontSize: '12px', fontWeight: '600' }}>
                  {pendingSignups} pending
                </div>
              </div>

              {/* Current Tier */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid rgba(168, 85, 247, 0.3)'
              }}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>Your Tier</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#A855F7', textTransform: 'capitalize' }}>
                  {tier === 'golden' ? '🏆 Golden' : '🎯 Standard'}
                </div>
                <div style={{ color: '#888', fontSize: '12px', fontWeight: '600' }}>
                  {tier === 'golden' ? '50%' : '20%'} commission rate
                </div>
              </div>

              {/* Projected Monthly */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.1), rgba(255, 107, 157, 0.05))',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid rgba(255, 107, 157, 0.3)'
              }}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>Projected Monthly</div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#FF6B9D' }}>
                  £{(monthEarnings * 1.2).toFixed(2)}
                </div>
                <div style={{ color: '#888', fontSize: '12px', fontWeight: '600' }}>
                  Based on current activity
                </div>
              </div>
            </div>

            {/* Earnings Graph */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '900', margin: 0 }}>
                  📊 Lifetime Earnings Graph
                </h3>
                <select
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#00F0FF',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <Line 
                data={getEarningsChartData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: '#00F0FF',
                      bodyColor: '#fff',
                      borderColor: '#00F0FF',
                      borderWidth: 1
                    }
                  },
                  scales: {
                    x: {
                      grid: { color: 'rgba(255, 255, 255, 0.05)' },
                      ticks: { color: '#888' }
                    },
                    y: {
                      grid: { color: 'rgba(255, 255, 255, 0.05)' },
                      ticks: { color: '#888' }
                    }
                  }
                }}
              />
            </div>

            {/* Commission Breakdown */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid rgba(0, 240, 255, 0.3)'
            }}>
              <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '900', marginBottom: '1rem' }}>
                📋 Commission Breakdown by Fee Type
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {comprehensiveData?.earnings_by_stream?.slice(0, 5).map((stream, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 240, 255, 0.2)'
                  }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px', textTransform: 'capitalize' }}>
                        {stream.stream.replace('_', ' ')}
                      </div>
                      <div style={{ color: '#888', fontSize: '12px' }}>
                        {stream.count} transactions
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#00FF88', fontWeight: '900', fontSize: '18px' }}>
                        £{stream.amount.toFixed(2)}
                      </div>
                      <div style={{ color: '#00F0FF', fontSize: '11px' }}>
                        {stream.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )) || <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No commission data yet</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div>
            {/* QR Code Section */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
              borderRadius: '16px',
              padding: '2rem',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '900', marginBottom: '1.5rem' }}>
                🔗 Your Referral QR Code
              </h3>
              {qrCodeUrl && (
                <div style={{
                  display: 'inline-block',
                  padding: '1rem',
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 240, 255, 0.4)'
                }}>
                  <img src={qrCodeUrl} alt="QR Code" style={{ width: '200px', height: '200px' }} />
                </div>
              )}
              <p style={{ color: '#888', marginTop: '1rem', fontSize: '13px' }}>
                Scan this QR code to join via your referral link
              </p>
            </div>

            {/* Referral Links */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid rgba(0, 240, 255, 0.3)'
            }}>
              <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '900', marginBottom: '1rem' }}>
                🔗 Your Referral Links
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '700' }}>Referral Code</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 240, 255, 0.2)'
                }}>
                  <div style={{ flex: 1, color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
                    {comprehensiveData?.referral_code}
                  </div>
                  <button
                    onClick={() => copyToClipboard(comprehensiveData?.referral_code, 'Code')}
                    style={{
                      padding: '8px 16px',
                      background: copySuccess === 'Code' ? '#00FF88' : 'rgba(0, 240, 255, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      color: copySuccess === 'Code' ? '#000' : '#00F0FF',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    {copySuccess === 'Code' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '700' }}>Referral Link</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 240, 255, 0.2)'
                }}>
                  <div style={{ flex: 1, color: '#00F0FF', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {comprehensiveData?.referral_link}
                  </div>
                  <button
                    onClick={() => copyToClipboard(comprehensiveData?.referral_link, 'Link')}
                    style={{
                      padding: '8px 16px',
                      background: copySuccess === 'Link' ? '#00FF88' : 'rgba(0, 240, 255, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      color: copySuccess === 'Link' ? '#000' : '#00F0FF',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    {copySuccess === 'Link' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '0.75rem', textTransform: 'uppercase', fontWeight: '700' }}>Share Via</div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  {[
                    { platform: 'whatsapp', color: '#25D366', icon: <IoLogoWhatsapp size={24} /> },
                    { platform: 'telegram', color: '#0088cc', label: '✈️' },
                    { platform: 'twitter', color: '#1DA1F2', icon: <IoLogoTwitter size={24} /> },
                    { platform: 'facebook', color: '#1877F2', icon: <IoLogoFacebook size={24} /> }
                  ].map(({ platform, color, icon, label }) => (
                    <button
                      key={platform}
                      onClick={() => shareVia(platform)}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: color,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: label ? '24px' : 'inherit',
                        fontWeight: '700',
                        boxShadow: `0 4px 12px ${color}40`
                      }}
                    >
                      {icon || label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== 'overview' && activeTab !== 'links' && (
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '16px',
            padding: '3rem',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🚧</div>
            <h3 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '0.5rem' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section
            </h3>
            <p style={{ color: '#888', fontSize: '14px' }}>
              This section is under development and will be available soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
