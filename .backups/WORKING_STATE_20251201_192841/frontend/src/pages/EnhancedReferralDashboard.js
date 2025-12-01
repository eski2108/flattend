import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IoCash, IoCheckmark, IoCopy, IoPeople, IoTrendingUp } from 'react-icons/io5';
import axios from 'axios';
import Layout from '@/components/Layout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function EnhancedReferralDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [creatingPrivate, setCreatingPrivate] = useState(false);
  const [creatingPublic, setCreatingPublic] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  useEffect(() => {
    if (user?.user_id) {
      fetchDashboard();
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/referral/enhanced-dashboard/${user.user_id}`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPrivateCode = async () => {
    setCreatingPrivate(true);
    try {
      await axios.post(`${API}/referral/create-private-code?user_id=${user.user_id}`);
      await fetchDashboard();
    } catch (error) {
      alert('Failed to create private code');
    } finally {
      setCreatingPrivate(false);
    }
  };

  const createPublicCode = async () => {
    setCreatingPublic(true);
    try {
      await axios.post(`${API}/referral/create-public-code?user_id=${user.user_id}`);
      await fetchDashboard();
    } catch (error) {
      alert('Failed to create public code');
    } finally {
      setCreatingPublic(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
          Loading referral dashboard...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
          Referral Dashboard
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
          Earn commissions by referring users to CoinHubX
        </p>

        {/* Overall Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <Card style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <IoPeople size={28} color="#00F0FF" />
              <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>Total Referrals</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff' }}>
              {dashboard?.overall_stats?.total_referrals || 0}
            </div>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(168, 85, 247, 0.1))',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <IoTrendingUp size={28} color="#22C55E" />
              <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>Lifetime Commission</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#22C55E' }}>
              £{(dashboard?.overall_stats?.total_commission_earned_gbp || 0).toFixed(2)}
            </div>
          </Card>
        </div>

        {/* Private Referral Link */}
        <Card style={{
          background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Gift size={32} color="#FFC107" />
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                Private Referral Link (£10 Bonus)
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                Earn £10 when referred user deposits £150+ | Plus 20% lifetime commission
              </p>
            </div>
          </div>

          {dashboard?.private_code?.code ? (
            <>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.5rem' }}>
                      YOUR PRIVATE CODE
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFC107', fontFamily: 'monospace' }}>
                      {dashboard.private_code.code}
                    </div>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(dashboard.private_code.link, 'private')}
                    style={{
                      background: 'linear-gradient(135deg, #FFC107, #FF9800)',
                      border: 'none'
                    }}
                  >
                    {copiedCode === 'private' ? <IoCheckmark size={18} /> : <IoCopy size={18} />}
                    {copiedCode === 'private' ? ' Copied!' : ' Copy Link'}
                  </Button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.25rem' }}>
                    Total Sign-ups
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>
                    {dashboard.private_code.total_signups}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.25rem' }}>
                    Deposited £150+
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#22C55E' }}>
                    {dashboard.private_code.users_deposited_150}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.25rem' }}>
                    Total Bonuses
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFC107' }}>
                    £{(dashboard.private_code.total_bonus_earned_gbp || 0).toFixed(0)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Button
              onClick={createPrivateCode}
              disabled={creatingPrivate}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #FFC107, #FF9800)',
                border: 'none',
                padding: '1rem',
                fontSize: '16px',
                fontWeight: '700'
              }}
            >
              {creatingPrivate ? 'Creating...' : 'Create Private Referral Link'}
            </Button>
          )}
        </Card>

        {/* Public Referral Link */}
        <Card style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <IoCash size={32} color="#00F0FF" />
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                Public Referral Link
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                20% lifetime commission on all trading fees (no bonus)
              </p>
            </div>
          </div>

          {dashboard?.public_code?.code ? (
            <>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.5rem' }}>
                      YOUR PUBLIC CODE
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#00F0FF', fontFamily: 'monospace' }}>
                      {dashboard.public_code.code}
                    </div>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(dashboard.public_code.link, 'public')}
                    style={{
                      background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                      border: 'none'
                    }}
                  >
                    {copiedCode === 'public' ? <IoCheckmark size={18} /> : <IoCopy size={18} />}
                    {copiedCode === 'public' ? ' Copied!' : ' Copy Link'}
                  </Button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.25rem' }}>
                  Total Sign-ups
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>
                  {dashboard.public_code.total_signups}
                </div>
              </div>
            </>
          ) : (
            <Button
              onClick={createPublicCode}
              disabled={creatingPublic}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                padding: '1rem',
                fontSize: '16px',
                fontWeight: '700'
              }}
            >
              {creatingPublic ? 'Creating...' : 'Create Public Referral Link'}
            </Button>
          )}
        </Card>

        {/* Referral List */}
        {dashboard?.referral_list && dashboard.referral_list.length > 0 && (
          <Card style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Your Referrals ({dashboard.referral_list.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {dashboard.referral_list.map((ref, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '12px',
                    border: `1px solid ${ref.type === 'private' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(0, 240, 255, 0.3)'}`
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>
                      User {ref.user_id.substring(0, 8)}...
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                      Signed up: {new Date(ref.signup_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '12px',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      background: ref.type === 'private' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(0, 240, 255, 0.2)',
                      color: ref.type === 'private' ? '#FFC107' : '#00F0FF',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}>
                      {ref.type === 'private' ? 'Private (£10 Bonus)' : 'Public'}
                    </div>
                    {ref.type === 'private' && (
                      <div style={{ fontSize: '12px', color: ref.reached_150 ? '#22C55E' : 'rgba(255, 255, 255, 0.5)' }}>
                        {ref.reached_150 ? '✓ £150 Deposited' : `£${ref.total_deposits_gbp.toFixed(2)} deposited`}
                        {ref.bonus_paid && ' | Bonus Paid'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
