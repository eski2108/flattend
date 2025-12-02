import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  IoCopyOutline, 
  IoShareSocialOutline, 
  IoTrendingUpOutline, 
  IoPeopleOutline,
  IoGiftOutline,
  IoStatsChartOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoHourglassOutline
} from 'react-icons/io5';
import API_BASE_URL from '@/config/api';

const API = API_BASE_URL;

export default function ReferralDashboardNew() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({
    total_earned: 0,
    pending: 0,
    completed: 0,
    this_month: 0,
    last_30_days: []
  });

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
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      
      // Fetch referral dashboard data
      const dashboardRes = await axios.get(`${API}/api/referral/dashboard/${user.user_id}`);
      setReferralData(dashboardRes.data);
      
      // Fetch commissions
      const commissionsRes = await axios.get(`${API}/api/referral/commissions/${user.user_id}`);
      setCommissions(commissionsRes.data.commissions || []);
      
      // Calculate stats
      const totalEarned = commissionsRes.data.commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      const completed = commissionsRes.data.commissions?.filter(c => c.status === 'completed').length || 0;
      const pending = commissionsRes.data.commissions?.filter(c => c.status === 'pending').length || 0;
      
      // Calculate this month earnings
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = commissionsRes.data.commissions?.filter(c => {
        const date = new Date(c.created_at);
        return date >= thisMonthStart;
      }).reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      
      // Calculate last 30 days for chart
      const last30Days = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().split('T')[0];
        const dayEarnings = commissionsRes.data.commissions?.filter(c => {
          return c.created_at?.startsWith(dayStr);
        }).reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
        last30Days.push({ date: dayStr, amount: dayEarnings });
      }
      
      setStats({
        total_earned: totalEarned,
        pending: pending,
        completed: completed,
        this_month: thisMonth,
        last_30_days: last30Days
      });
      
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (referralData?.referral_link) {
      navigator.clipboard.writeText(referralData.referral_link);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const copyReferralCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      toast.success('Referral code copied!');
    }
  };

  const getTierInfo = (tier) => {
    if (!tier) return { name: 'Standard', rate: '20%', color: '#00F0FF' };
    
    const tierLower = tier.toLowerCase();
    if (tierLower === 'vip') return { name: 'VIP', rate: '20%', color: '#A855F7' };
    if (tierLower === 'golden') return { name: 'Golden', rate: '50%', color: '#FFD700' };
    return { name: 'Standard', rate: '20%', color: '#00F0FF' };
  };

  const tierInfo = getTierInfo(referralData?.tier);

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
          <p style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '600' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0b1a 0%, #1a1f3a 50%, #0a0b1a 100%)',
      padding: '2rem',
      paddingTop: '100px'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem'
        }}>
          🎁 Referral Dashboard
        </h1>
        <p style={{ color: '#888', fontSize: '16px' }}>Invite friends and earn commission on every transaction</p>
      </div>

      {/* Stats Cards */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Total Earned */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 240, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <IoTrendingUpOutline size={28} color="#00F0FF" />
            <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>TOTAL EARNED</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF' }}>
            £{stats.total_earned.toFixed(2)}
          </div>
        </div>

        {/* Completed Commissions */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid rgba(34, 197, 94, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <IoCheckmarkCircleOutline size={28} color="#22C55E" />
            <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>COMPLETED</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#22C55E' }}>
            {stats.completed}
          </div>
        </div>

        {/* Pending Commissions */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid rgba(251, 191, 36, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <IoHourglassOutline size={28} color="#FBBF24" />
            <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>PENDING</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FBBF24' }}>
            {stats.pending}
          </div>
        </div>

        {/* This Month */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.1))',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid rgba(168, 85, 247, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <IoTimeOutline size={28} color="#A855F7" />
            <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>THIS MONTH</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7' }}>
            £{stats.this_month.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column */}
        <div>
          {/* Tier Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            border: `2px solid ${tierInfo.color}`,
            boxShadow: `0 8px 32px ${tierInfo.color}40`,
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: '#888', fontSize: '14px', marginBottom: '0.5rem' }}>YOUR TIER</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: tierInfo.color }}>
                  {tierInfo.name}
                </div>
              </div>
              <div style={{
                background: `${tierInfo.color}20`,
                borderRadius: '50%',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px'
              }}>
                {tierInfo.name === 'VIP' ? '👑' : tierInfo.name === 'Golden' ? '⭐' : '🎯'}
              </div>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>COMMISSION RATE</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: tierInfo.color }}>
                {tierInfo.rate}
              </div>
              <div style={{ color: '#888', fontSize: '12px', marginTop: '0.5rem' }}>
                You earn {tierInfo.rate} of all fees generated by your referrals
              </div>
            </div>
          </div>

          {/* Referral Link Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            border: '2px solid rgba(0, 240, 255, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <IoShareSocialOutline size={28} color="#00F0FF" />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Share Your Link</h3>
            </div>

            {/* Referral Code */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>YOUR REFERRAL CODE</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                <code style={{
                  flex: 1,
                  color: '#00F0FF',
                  fontSize: '18px',
                  fontWeight: '700',
                  letterSpacing: '2px'
                }}>
                  {referralData?.referral_code || 'Loading...'}
                </code>
                <button
                  onClick={copyReferralCode}
                  style={{
                    background: '#00F0FF',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <IoCopyOutline size={18} />
                  COPY
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>YOUR REFERRAL LINK</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                <div style={{
                  flex: 1,
                  color: '#00F0FF',
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {referralData?.referral_link || 'Loading...'}
                </div>
                <button
                  onClick={copyReferralLink}
                  style={{
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <IoCopyOutline size={18} />
                  COPY
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Referral Stats */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <IoPeopleOutline size={28} color="#00F0FF" />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Referral Stats</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{
                background: 'rgba(0, 240, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF' }}>
                  {referralData?.total_signups || 0}
                </div>
                <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>Total Signups</div>
              </div>
              <div style={{
                background: 'rgba(168, 85, 247, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7' }}>
                  {referralData?.active_referrals || 0}
                </div>
                <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>Active Referrals</div>
              </div>
            </div>
          </div>

          {/* Recent Commissions */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            border: '2px solid rgba(0, 240, 255, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <IoStatsChartOutline size={28} color="#00F0FF" />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Recent Commissions</h3>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {commissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  <IoGiftOutline size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>No commissions yet</p>
                  <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>Start referring friends to earn commissions!</p>
                </div>
              ) : (
                commissions.slice(0, 10).map((commission, index) => (
                  <div key={index} style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid rgba(0, 240, 255, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
                        £{commission.commission_amount?.toFixed(2) || '0.00'}
                      </div>
                      <div style={{
                        background: commission.status === 'completed' ? '#22C55E20' : '#FBBF2420',
                        color: commission.status === 'completed' ? '#22C55E' : '#FBBF24',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {commission.status || 'pending'}
                      </div>
                    </div>
                    <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.25rem' }}>
                      {commission.fee_type || 'Trading'}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {new Date(commission.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
