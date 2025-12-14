import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoEye, IoEyeOff, IoWallet, IoLockClosed, IoTime, IoShieldCheckmark, IoWarning, IoArrowForward, IoTrendingUp } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SavingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balancesHidden, setBalancesHidden] = useState(false);
  
  const [savingsBalances, setSavingsBalances] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [lockedInVaults, setLockedInVaults] = useState(0);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCreateVaultModal, setShowCreateVaultModal] = useState(false);
  const [showEarlyUnlockModal, setShowEarlyUnlockModal] = useState(false);
  const [selectedVault, setSelectedVault] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadAllData(parsedUser.user_id);
  }, [navigate]);

  const loadAllData = async (userId) => {
    setLoading(true);
    try {
      await Promise.all([
        loadSavingsBalances(userId),
        loadVaults(userId)
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load savings data');
    } finally {
      setLoading(false);
    }
  };

  const loadSavingsBalances = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/savings/balances/${userId}`);
      if (response.data.success) {
        const balances = response.data.balances || [];
        const nonZeroBalances = balances.filter(b => b.savings_balance > 0);
        setSavingsBalances(nonZeroBalances);
        const available = nonZeroBalances.reduce((sum, b) => sum + (b.gbp_value || 0), 0);
        setAvailableBalance(available);
      }
    } catch (error) {
      console.error('Error loading savings balances:', error);
      throw error;
    }
  };

  const loadVaults = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/vaults/${userId}`);
      if (response.data.success) {
        setVaults(response.data.vaults || []);
        const locked = (response.data.vaults || []).reduce((sum, v) => sum + (v.gbp_value || 0), 0);
        setLockedInVaults(locked);
      }
    } catch (error) {
      console.error('Error loading vaults:', error);
      throw error;
    }
  };

  useEffect(() => {
    setTotalSavings(availableBalance + lockedInVaults);
  }, [availableBalance, lockedInVaults]);

  const handleWithdrawToWallet = async (currency, amount) => {
    try {
      const response = await axios.post(`${API}/api/savings/withdraw`, {
        user_id: user.user_id,
        currency,
        amount
      });
      
      if (response.data.success) {
        toast.success('Withdrawn to wallet successfully');
        loadAllData(user.user_id);
      } else {
        toast.error(response.data.error || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to withdraw to wallet');
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0B0F1A 0%, #0E1C2F 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#FFF' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', borderColor: '#00E5FF', borderTopColor: 'transparent' }}></div>
          <div style={{ fontSize: '16px', color: '#8FA3C8' }}>Loading savings...</div>
        </div>
      </div>
    );
  }

  const formatBalance = (value) => {
    return balancesHidden ? '••••••' : `£${value.toFixed(2)}`;
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0B0F1A 0%, #0E1C2F 100%)',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* SUMMARY CARD */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(0,150,255,0.08) 100%)',
          border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 40px rgba(0,229,255,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ambient glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}></div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#8FA3C8',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>Total Savings Balance</h1>
              <button
                onClick={() => setBalancesHidden(!balancesHidden)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  color: '#8FA3C8',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#00E5FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#8FA3C8';
                }}
              >
                {balancesHidden ? <IoEye size={20} /> : <IoEyeOff size={20} />}
              </button>
            </div>

            <div style={{
              fontSize: '56px',
              fontWeight: '700',
              color: '#FFF',
              marginBottom: '32px',
              letterSpacing: '-2px'
            }}>
              {formatBalance(totalSavings)}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(123,44,255,0.15)',
                  border: '1px solid rgba(123,44,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IoWallet size={20} color="#7B2CFF" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#8FA3C8', marginBottom: '4px' }}>Available Balance</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFF' }}>{formatBalance(availableBalance)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IoLockClosed size={20} color="#10B981" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#8FA3C8', marginBottom: '4px' }}>Locked in Vaults</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFF' }}>{formatBalance(lockedInVaults)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '40px'
        }}>
          <button
            onClick={() => setShowTransferModal(true)}
            style={{
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #00E5FF 0%, #0096FF 100%)',
              border: 'none',
              color: '#FFF',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(0,229,255,0.3)',
              transition: 'all 0.3s',
              transform: 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,229,255,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,229,255,0.3)';
            }}
          >
            <IoArrowForward size={22} />
            Transfer from Wallet
          </button>

          <button
            onClick={() => setShowCreateVaultModal(true)}
            style={{
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              color: '#FFF',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
              transition: 'all 0.3s',
              transform: 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(16,185,129,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.3)';
            }}
          >
            <IoLockClosed size={22} />
            Create Vault
          </button>
        </div>

        {/* FLEXIBLE SAVINGS ACCOUNT */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(123,44,255,0.15) 100%)',
              border: '1px solid rgba(0,229,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IoTrendingUp size={20} color="#00E5FF" />
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#FFF',
              margin: 0
            }}>Flexible Savings Account</h2>
          </div>
          
          {savingsBalances.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '56px 32px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 24px',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(123,44,255,0.1) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(0,229,255,0.2)'
              }}>
                <IoWallet size={56} color="#00E5FF" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#FFF',
                marginBottom: '12px'
              }}>Start Your Savings Journey</h3>
              <p style={{
                fontSize: '15px',
                color: '#8FA3C8',
                maxWidth: '460px',
                margin: '0 auto 32px',
                lineHeight: '1.6'
              }}>
                Transfer crypto from your wallet to start saving with instant access to your funds anytime
              </p>
              <button
                onClick={() => setShowTransferModal(true)}
                style={{
                  height: '56px',
                  padding: '0 40px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #00E5FF 0%, #0096FF 100%)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,229,255,0.3)',
                  transition: 'all 0.3s'
                }}
              >
                Start Saving
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {savingsBalances.map((asset) => (
                <div
                  key={asset.currency}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(123,44,255,0.1) 100%)',
                      border: '2px solid rgba(0,229,255,0.2)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={getCoinLogo(asset.currency)}
                        alt={asset.currency}
                        style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFF', marginBottom: '4px' }}>
                        {asset.currency}
                      </div>
                      <div style={{ fontSize: '14px', color: '#8FA3C8' }}>{asset.coin_name || 'Cryptocurrency'}</div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', marginRight: '24px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#00E5FF', marginBottom: '4px' }}>
                      {balancesHidden ? '••••••' : asset.savings_balance.toFixed(8)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#8FA3C8' }}>
                      {balancesHidden ? '••••' : `£${(asset.gbp_value || 0).toFixed(2)}`}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '4px 10px',
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#10B981',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Instant Withdraw</div>
                  </div>
                  
                  <button
                    onClick={() => handleWithdrawToWallet(asset.currency, asset.savings_balance)}
                    style={{
                      height: '48px',
                      padding: '0 28px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,229,255,0.3)',
                      background: 'rgba(0,229,255,0.08)',
                      color: '#00E5FF',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,229,255,0.15)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Withdraw
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TIME-LOCKED VAULTS */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.15) 100%)',
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IoShieldCheckmark size={20} color="#10B981" />
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#FFF',
              margin: 0
            }}>Time-Locked Vaults</h2>
          </div>
          
          {vaults.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '56px 32px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 24px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.1) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(16,185,129,0.2)'
              }}>
                <IoLockClosed size={56} color="#10B981" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#FFF',
                marginBottom: '12px'
              }}>Maximum Security Storage</h3>
              <p style={{
                fontSize: '15px',
                color: '#8FA3C8',
                maxWidth: '460px',
                margin: '0 auto',
                lineHeight: '1.6'
              }}>
                Lock your crypto for enhanced security. Choose 30, 60, or 90-day periods. Early withdrawal available with penalty.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {vaults.map(vault => <VaultCard key={vault.vault_id} vault={vault} balancesHidden={balancesHidden} onEarlyUnlock={() => {
                setSelectedVault(vault);
                setShowEarlyUnlockModal(true);
              }} />)}
            </div>
          )}
        </div>

      </div>

      {showTransferModal && <TransferModal onClose={() => setShowTransferModal(false)} userId={user.user_id} onSuccess={() => loadAllData(user.user_id)} />}
      {showCreateVaultModal && <CreateVaultModal onClose={() => setShowCreateVaultModal(false)} userId={user.user_id} savingsBalances={savingsBalances} onSuccess={() => loadAllData(user.user_id)} />}
      {showEarlyUnlockModal && selectedVault && <EarlyUnlockModal vault={selectedVault} onClose={() => setShowEarlyUnlockModal(false)} userId={user.user_id} onSuccess={() => loadAllData(user.user_id)} />}
    </div>
  );
}

// PREMIUM VAULT CARD
function VaultCard({ vault, balancesHidden, onEarlyUnlock }) {
  const now = new Date();
  const unlockDate = new Date(vault.unlock_date);
  const daysRemaining = Math.max(0, Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24)));
  const isCompleted = daysRemaining === 0;
  const status = isCompleted ? 'Matured' : (daysRemaining <= 7 ? 'Unlocking' : 'Locked');
  
  const statusColors = {
    Locked: { bg: 'rgba(16,185,129,0.15)', border: '#10B981', text: '#10B981' },
    Unlocking: { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', text: '#F59E0B' },
    Matured: { bg: 'rgba(0,229,255,0.15)', border: '#00E5FF', text: '#00E5FF' }
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${statusColors[status].border}40`,
      borderRadius: '20px',
      padding: '28px',
      boxShadow: `0 4px 24px ${statusColors[status].border}15`,
      transition: 'all 0.3s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={getCoinLogo(vault.currency)} alt={vault.currency} style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFF', marginBottom: '4px' }}>{vault.vault_name || `${vault.currency} Vault`}</div>
            <div style={{ fontSize: '14px', color: '#8FA3C8' }}>{vault.currency}</div>
          </div>
        </div>
        
        <div style={{
          padding: '8px 16px',
          borderRadius: '10px',
          background: statusColors[status].bg,
          border: `1px solid ${statusColors[status].border}`,
          color: statusColors[status].text,
          fontSize: '13px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {status}
        </div>
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', color: '#8FA3C8', marginBottom: '8px' }}>Locked Amount</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFF', marginBottom: '4px' }}>
          {balancesHidden ? '••••••' : vault.amount.toFixed(8)}
        </div>
        <div style={{ fontSize: '16px', color: '#8FA3C8' }}>
          {balancesHidden ? '••••' : `£${(vault.gbp_value || 0).toFixed(2)}`}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px',
        padding: '20px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '6px', textTransform: 'uppercase' }}>Duration</div>
          <div style={{ fontSize: '18px', color: '#FFF', fontWeight: '700' }}>{vault.lock_period} days</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '6px', textTransform: 'uppercase' }}>Remaining</div>
          <div style={{ fontSize: '18px', color: statusColors[status].text, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IoTime size={18} />
            {daysRemaining} days
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '6px', textTransform: 'uppercase' }}>Unlocks</div>
          <div style={{ fontSize: '14px', color: '#FFF', fontWeight: '600' }}>{unlockDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>
      
      {!isCompleted ? (
        <button
          onClick={onEarlyUnlock}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '12px',
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.08)',
            color: '#F59E0B',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(245,158,11,0.15)';
            e.currentTarget.style.transform = 'scale(1.01)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(245,158,11,0.08)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <IoWarning size={20} />
          Early Unlock (Penalty Applies)
        </button>
      ) : (
        <button
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00E5FF 0%, #0096FF 100%)',
            color: '#FFF',
            border: 'none',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,229,255,0.3)',
            transition: 'all 0.3s'
          }}
        >
          Withdraw to Savings
        </button>
      )}
    </div>
  );
}

// Keep existing TransferModal, CreateVaultModal, EarlyUnlockModal implementations
