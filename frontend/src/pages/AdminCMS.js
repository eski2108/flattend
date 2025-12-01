import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IoSettings as Settings, IoCash as DollarSign, IoPeople as Users, IoDocument as FileText, IoWallet as Wallet, IoShield as Shield } from 'react-icons/io5';;
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function AdminCMS() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('platform');
  const [loading, setLoading] = useState(true);
  
  // Platform Settings
  const [platformSettings, setPlatformSettings] = useState({
    withdrawal_fee_percent: 1.0,
    p2p_trade_fee_percent: 1.0,
    referral_commission_percent: 20.0,
    referral_bonus_amount: 10.0,
    referral_bonus_threshold: 150.0
  });
  
  // Disputes
  const [disputes, setDisputes] = useState([]);
  
  // KYC Submissions
  const [kycSubmissions, setKycSubmissions] = useState([]);
  
  // Transactions
  const [transactions, setTransactions] = useState([]);
  
  // Wallet Balances
  const [walletBalances, setWalletBalances] = useState({});

  useEffect(() => {
    checkAdminAuth();
    fetchAllData();
  }, []);

  const checkAdminAuth = () => {
    const adminData = localStorage.getItem('cryptobank_admin');
    if (!adminData) {
      navigate('/admin/login');
    }
  };

  const fetchAllData = async () => {
    try {
      const [settingsRes, walletRes, kycRes, txRes] = await Promise.all([
        axios.get(`${API}/api/admin/platform-settings`),
        axios.get(`${API}/api/admin/wallet-balances`),
        axios.get(`${API}/api/admin/kyc-submissions`),
        axios.get(`${API}/api/admin/all-transactions`)
      ]);

      if (settingsRes.data.success) {
        setPlatformSettings(settingsRes.data.settings);
      }

      if (walletRes.data.success) {
        setWalletBalances(walletRes.data);
      }

      if (kycRes.data.success) {
        setKycSubmissions(kycRes.data.submissions || []);
      }

      if (txRes.data.success) {
        setTransactions(txRes.data.crypto_transactions || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
      setLoading(false);
    }
  };

  const updatePlatformSettings = async () => {
    try {
      const response = await axios.post(`${API}/api/admin/platform-settings`, platformSettings);
      
      if (response.data.success) {
        toast.success('Platform settings updated successfully!');
        await fetchAllData();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const approveKYC = async (verificationId, approved) => {
    try {
      const adminData = JSON.parse(localStorage.getItem('cryptobank_admin'));
      const response = await axios.post(`${API}/api/admin/kyc/review`, {
        verification_id: verificationId,
        approved: approved,
        tier: approved ? 1 : 0,
        notes: approved ? 'Approved by admin' : 'Rejected by admin',
        admin_user_id: adminData.user_id
      });

      if (response.data.success) {
        toast.success(approved ? 'KYC Approved!' : 'KYC Rejected');
        await fetchAllData();
      }
    } catch (error) {
      console.error('Error reviewing KYC:', error);
      toast.error('Failed to review KYC');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
          Loading Admin CMS...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
          Admin CMS
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
          Control everything about your platform
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { id: 'platform', label: 'Platform Settings', icon: Settings },
            { id: 'fees', label: 'Fees & Commission', icon: Percent },
            { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
            { id: 'kyc', label: 'KYC Review', icon: Shield },
            { id: 'transactions', label: 'Transactions', icon: DollarSign },
            { id: 'wallets', label: 'Wallets', icon: Wallet }
          ].map(tab => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #00F0FF, #A855F7)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                padding: '0.75rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Platform Settings Tab */}
        {activeTab === 'platform' && (
          <Card style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Platform Configuration
            </h2>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                  Withdrawal Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={platformSettings.withdrawal_fee_percent}
                  onChange={(e) => setPlatformSettings({
                    ...platformSettings,
                    withdrawal_fee_percent: parseFloat(e.target.value)
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                  P2P Trade Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={platformSettings.p2p_trade_fee_percent}
                  onChange={(e) => setPlatformSettings({
                    ...platformSettings,
                    p2p_trade_fee_percent: parseFloat(e.target.value)
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                  Referral Commission (%)
                </label>
                <input
                  type="number"
                  step="1"
                  value={platformSettings.referral_commission_percent}
                  onChange={(e) => setPlatformSettings({
                    ...platformSettings,
                    referral_commission_percent: parseFloat(e.target.value)
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                  Referral Bonus Amount (£)
                </label>
                <input
                  type="number"
                  step="1"
                  value={platformSettings.referral_bonus_amount}
                  onChange={(e) => setPlatformSettings({
                    ...platformSettings,
                    referral_bonus_amount: parseFloat(e.target.value)
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                  Referral Bonus Threshold (£)
                </label>
                <input
                  type="number"
                  step="10"
                  value={platformSettings.referral_bonus_threshold}
                  onChange={(e) => setPlatformSettings({
                    ...platformSettings,
                    referral_bonus_threshold: parseFloat(e.target.value)
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              <Button
                onClick={updatePlatformSettings}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  padding: '1rem'
                }}
              >
                Save Platform Settings
              </Button>
            </div>
          </Card>
        )}

        {/* KYC Review Tab */}
        {activeTab === 'kyc' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>
              KYC Submissions ({kycSubmissions.length})
            </h2>
            
            {kycSubmissions.length === 0 ? (
              <Card style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>No KYC submissions</p>
              </Card>
            ) : (
              kycSubmissions.map(kyc => (
                <Card key={kyc.verification_id} style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                        {kyc.full_name}
                      </h3>
                      <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>
                        DOB: {kyc.date_of_birth}
                      </div>
                      <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>
                        Nationality: {kyc.nationality}
                      </div>
                      <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>
                        ID Type: {kyc.id_type}
                      </div>
                      <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                        Status: <span style={{
                          color: kyc.status === 'pending' ? '#FBB F24' : kyc.status === 'approved' ? '#10B981' : '#EF4444',
                          fontWeight: '600'
                        }}>{kyc.status}</span>
                      </div>
                    </div>
                    
                    {kyc.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button
                          onClick={() => approveKYC(kyc.verification_id, true)}
                          style={{
                            background: '#10B981',
                            border: 'none',
                            padding: '0.5rem 1rem'
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => approveKYC(kyc.verification_id, false)}
                          style={{
                            background: '#EF4444',
                            border: 'none',
                            padding: '0.5rem 1rem'
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <Card style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Recent Transactions ({transactions.length})
            </h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)' }}>Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)' }}>Amount</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)' }}>Currency</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((tx, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', color: '#fff' }}>{tx.transaction_type}</td>
                      <td style={{ padding: '1rem', color: '#fff' }}>{tx.amount}</td>
                      <td style={{ padding: '1rem', color: '#fff' }}>{tx.currency}</td>
                      <td style={{ padding: '1rem', color: tx.status === 'completed' ? '#10B981' : '#FBB F24' }}>
                        {tx.status}
                      </td>
                      <td style={{ padding: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Wallets Tab */}
        {activeTab === 'wallets' && (
          <Card style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Admin Wallet Balances
            </h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#00F0FF', marginBottom: '1rem' }}>
                  Referral Payout Wallet
                </h3>
                {walletBalances.referral_wallet_balances && Object.keys(walletBalances.referral_wallet_balances).length > 0 ? (
                  Object.entries(walletBalances.referral_wallet_balances).map(([currency, amount]) => (
                    <div key={currency} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ color: '#fff' }}>{currency}:</span>
                      <span style={{ color: '#00F0FF', fontWeight: '600' }}>{amount}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>No balances found</p>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
