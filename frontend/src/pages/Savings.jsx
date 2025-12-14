import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoArrowForward, IoLockClosed, IoTime, IoWarning, IoWallet, IoTrendingUp, IoShieldCheckmark } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SavingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
        background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 50%, #0A0E27 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFF'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <div>Loading savings...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 50%, #0A0E27 100%)',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* PREMIUM HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #00E5FF 0%, #7B2CFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              marginBottom: '4px'
            }}>Savings Vault</h1>
            <p style={{ fontSize: '14px', color: '#8FA3C8', margin: 0 }}>Secure your crypto assets</p>
          </div>
          
          <button
            onClick={() => setShowTransferModal(true)}
            style={{
              height: '48px',
              padding: '0 28px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00E5FF 0%, #0096FF 100%)',
              color: '#FFF',
              border: 'none',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0,229,255,0.4), 0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,255,0.6), 0 6px 16px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.4), 0 4px 12px rgba(0,0,0,0.3)';
            }}
          >
            <IoWallet size={20} />
            Transfer from Wallet
          </button>
        </div>

        {/* STATS CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'rgba(0,229,255,0.05)',
            border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)',
              borderRadius: '50%'
            }}></div>
            <div style={{ fontSize: '13px', color: '#8FA3C8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Savings</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#00E5FF', marginBottom: '4px' }}>£{totalSavings.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#6B7A99' }}>Combined balance</div>
          </div>
          
          <div style={{
            background: 'rgba(123,44,255,0.05)',
            border: '1px solid rgba(123,44,255,0.2)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(123,44,255,0.15) 0%, transparent 70%)',
              borderRadius: '50%'
            }}></div>
            <div style={{ fontSize: '13px', color: '#8FA3C8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#7B2CFF', marginBottom: '4px' }}>£{availableBalance.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#6B7A99' }}>Flexible access</div>
          </div>
          
          <div style={{
            background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
              borderRadius: '50%'
            }}></div>
            <div style={{ fontSize: '13px', color: '#8FA3C8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Locked</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>£{lockedInVaults.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: '#6B7A99' }}>In vaults</div>
          </div>
        </div>

        {/* FLEXIBLE SAVINGS */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <IoTrendingUp size={24} color="#00E5FF" />
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#FFF', margin: 0 }}>Flexible Savings</h2>
          </div>
          
          {savingsBalances.length === 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.03) 0%, rgba(123,44,255,0.03) 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '48px 24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 20px',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(123,44,255,0.1) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IoWallet size={40} color="#00E5FF" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#FFF', marginBottom: '12px' }}>Start Saving Today</h3>
              <p style={{ color: '#8FA3C8', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                Transfer crypto from your wallet to start earning secure savings
              </p>
              <button
                onClick={() => setShowTransferModal(true)}
                style={{
                  height: '48px',
                  padding: '0 32px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #00E5FF 0%, #0096FF 100%)',
                  color: '#FFF',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(0,229,255,0.4)',
                  transition: 'all 0.3s'
                }}
              >
                Transfer from Wallet
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {savingsBalances.map((asset, index) => (
                <div
                  key={asset.currency}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(123,44,255,0.1) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px'
                    }}>
                      <img
                        src={getCoinLogo(asset.currency)}
                        alt={asset.currency}
                        style={{ width: '44px', height: '44px', borderRadius: '50%' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#FFF', marginBottom: '4px' }}>{asset.currency}</div>
                      <div style={{ fontSize: '13px', color: '#8FA3C8' }}>{asset.coin_name || asset.currency}</div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', marginRight: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#00E5FF', marginBottom: '4px' }}>
                      {asset.savings_balance.toFixed(8)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#8FA3C8' }}>£{(asset.gbp_value || 0).toFixed(2)}</div>
                  </div>
                  
                  <button
                    onClick={() => handleWithdrawToWallet(asset.currency, asset.savings_balance)}
                    style={{
                      height: '40px',
                      padding: '0 20px',
                      borderRadius: '10px',
                      border: '1px solid rgba(0,229,255,0.3)',
                      background: 'rgba(0,229,255,0.05)',
                      color: '#00E5FF',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,229,255,0.15)';
                      e.currentTarget.style.borderColor = 'rgba(0,229,255,0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0,229,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)';
                    }}
                  >
                    Withdraw
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LOCKED VAULTS */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IoShieldCheckmark size={24} color="#10B981" />
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#FFF', margin: 0 }}>Locked Vaults</h2>
            </div>
            
            <button
              onClick={() => setShowCreateVaultModal(true)}
              style={{
                height: '48px',
                padding: '0 28px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFF',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(16,185,129,0.4)',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <IoLockClosed size={18} />
              Create Vault
            </button>
          </div>
          
          {vaults.length === 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.03) 0%, rgba(5,150,105,0.03) 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '48px 24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 20px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.1) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IoLockClosed size={40} color="#10B981" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#FFF', marginBottom: '12px' }}>Secure Storage</h3>
              <p style={{ color: '#8FA3C8', maxWidth: '400px', margin: '0 auto' }}>
                Lock your savings for enhanced security. Create your first vault to get started.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {vaults.map(vault => <VaultCard key={vault.vault_id} vault={vault} onEarlyUnlock={() => {
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

// VAULT CARD (keeping existing implementation)
function VaultCard({ vault, onEarlyUnlock }) {
  const now = new Date();
  const unlockDate = new Date(vault.unlock_date);
  const daysRemaining = Math.max(0, Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24)));
  const isCompleted = daysRemaining === 0;
  const status = isCompleted ? 'completed' : (daysRemaining <= 7 ? 'unlocking' : 'locked');
  
  const statusColors = {
    locked: '#10B981',
    unlocking: '#F59E0B',
    completed: '#00E5FF'
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${statusColors[status]}40`,
      borderRadius: '16px',
      padding: '24px',
      transition: 'all 0.3s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={getCoinLogo(vault.currency)} alt={vault.currency} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFF' }}>{vault.currency}</div>
            <div style={{ fontSize: '13px', color: '#8FA3C8' }}>{vault.amount.toFixed(8)}</div>
          </div>
        </div>
        
        <div style={{
          padding: '6px 14px',
          borderRadius: '8px',
          background: `${statusColors[status]}20`,
          border: `1px solid ${statusColors[status]}`,
          color: statusColors[status],
          fontSize: '12px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {status}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '4px' }}>Duration</div>
          <div style={{ fontSize: '16px', color: '#FFF', fontWeight: '600' }}>{vault.lock_period} days</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '4px' }}>Remaining</div>
          <div style={{ fontSize: '16px', color: statusColors[status], fontWeight: '600' }}>{daysRemaining} days</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '4px' }}>Unlock Date</div>
          <div style={{ fontSize: '14px', color: '#FFF', fontWeight: '600' }}>{unlockDate.toLocaleDateString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '4px' }}>Value</div>
          <div style={{ fontSize: '16px', color: '#00E5FF', fontWeight: '700' }}>£{(vault.gbp_value || 0).toFixed(2)}</div>
        </div>
      </div>
      
      {!isCompleted ? (
        <button
          onClick={onEarlyUnlock}
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '10px',
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.05)',
            color: '#F59E0B',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          Early Unlock (Penalty)
        </button>
      ) : (
        <button
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00E5FF 0%, #0096FF 100%)',
            color: '#FFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(0,229,255,0.3)'
          }}
        >
          Withdraw to Savings
        </button>
      )}
    </div>
  );
}

        padding: '32px',
        maxWidth: '480px',
        width: '90%'
      }}>
        <h3 style={{ fontSize: '20px', color: COLORS.TEXT_PRIMARY, marginBottom: '16px' }}>Transfer from Wallet</h3>
        <p style={{ color: COLORS.TEXT_SECONDARY, marginBottom: '24px' }}>Select asset and amount to transfer to savings.</p>
        {/* Implementation needed */}
        <button onClick={onClose} style={{
          width: '100%',
          height: '44px',
          background: COLORS.ACTION_PRIMARY,
          color: COLORS.TEXT_PRIMARY,
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>Close</button>
      </div>
    </div>
  );
}

// CREATE VAULT MODAL
function CreateVaultModal({ onClose, userId, savingsBalances, onSuccess }) {
  const [step, setStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState(null);
  
  const handleCreate = async () => {
    try {
      const response = await axios.post(`${API}/api/vaults/create`, {
        user_id: userId,
        currency: selectedAsset.currency,
        amount: parseFloat(amount),
        lock_period: lockPeriod
      });
      
      if (response.data.success) {
        toast.success('Vault created successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.error || 'Failed to create vault');
      }
    } catch (error) {
      console.error('Create vault error:', error);
      toast.error('Failed to create vault');
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: COLORS.BG_CARD,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '480px',
        width: '90%'
      }}>
        <h3 style={{ fontSize: '20px', color: COLORS.TEXT_PRIMARY, marginBottom: '24px' }}>Create Vault</h3>
        
        {step === 1 && (
          <div>
            <div style={{ fontSize: '14px', color: COLORS.TEXT_SECONDARY, marginBottom: '12px' }}>Step 1: Select Asset</div>
            {savingsBalances.map(asset => (
              <div
                key={asset.currency}
                onClick={() => { setSelectedAsset(asset); setStep(2); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: COLORS.BG_PANEL,
                  borderRadius: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${COLORS.BG_PANEL}`
                }}
              >
                <img src={getCoinLogo(asset.currency)} alt={asset.currency} style={{ width: '32px', height: '32px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORS.TEXT_PRIMARY, fontWeight: '600' }}>{asset.currency}</div>
                  <div style={{ fontSize: '13px', color: COLORS.TEXT_SECONDARY }}>Available: {asset.savings_balance.toFixed(8)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {step === 2 && (
          <div>
            <div style={{ fontSize: '14px', color: COLORS.TEXT_SECONDARY, marginBottom: '12px' }}>Step 2: Enter Amount</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 16px',
                background: COLORS.BG_PANEL,
                border: `1px solid ${COLORS.BG_PANEL}`,
                borderRadius: '10px',
                color: COLORS.TEXT_PRIMARY,
                fontSize: '14px',
                marginBottom: '12px'
              }}
            />
            <button
              onClick={() => setAmount(selectedAsset.savings_balance.toString())}
              style={{
                padding: '8px 16px',
                background: COLORS.BG_PANEL,
                color: COLORS.ACTION_PRIMARY,
                border: `1px solid ${COLORS.ACTION_PRIMARY}`,
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: '24px'
              }}
            >
              Max
            </button>
            <button onClick={() => setStep(3)} style={{
              width: '100%',
              height: '44px',
              background: COLORS.ACTION_PRIMARY,
              color: COLORS.TEXT_PRIMARY,
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>Continue</button>
          </div>
        )}
        
        {step === 3 && (
          <div>
            <div style={{ fontSize: '14px', color: COLORS.TEXT_SECONDARY, marginBottom: '12px' }}>Step 3: Select Lock Period</div>
            {[30, 60, 90].map(period => (
              <button
                key={period}
                onClick={() => setLockPeriod(period)}
                style={{
                  width: '100%',
                  height: '44px',
                  background: lockPeriod === period ? 'transparent' : COLORS.BG_PANEL,
                  border: lockPeriod === period ? `2px solid ${COLORS.ACTION_PRIMARY}` : `1px solid ${COLORS.BG_PANEL}`,
                  borderRadius: '10px',
                  color: COLORS.TEXT_PRIMARY,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
              >
                {period} days
              </button>
            ))}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: `${COLORS.ACTION_PRIMARY}10`,
              border: `1px solid ${COLORS.ACTION_PRIMARY}30`,
              borderRadius: '10px',
              fontSize: '13px',
              color: COLORS.TEXT_SECONDARY
            }}>
              <div style={{ marginBottom: '8px' }}>⚠️ Lock Rules:</div>
              <div>• Funds cannot be withdrawn before expiry</div>
              <div>• Early unlock incurs a penalty</div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!lockPeriod}
              style={{
                width: '100%',
                height: '44px',
                background: lockPeriod ? COLORS.ACTION_PRIMARY : COLORS.ACTION_DISABLED,
                color: COLORS.TEXT_PRIMARY,
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: lockPeriod ? 'pointer' : 'not-allowed',
                marginTop: '24px',
                boxShadow: lockPeriod ? GLOW_PRIMARY : 'none'
              }}
            >
              Create Vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// EARLY UNLOCK MODAL
function EarlyUnlockModal({ vault, onClose, userId, onSuccess }) {
  const penaltyPercent = 10;
  const penaltyAmount = vault.amount * (penaltyPercent / 100);
  const finalAmount = vault.amount - penaltyAmount;
  
  const handleEarlyUnlock = async () => {
    try {
      const response = await axios.post(`${API}/api/vaults/early-unlock`, {
        user_id: userId,
        vault_id: vault.vault_id
      });
      
      if (response.data.success) {
        toast.success('Vault unlocked with penalty applied');
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.error || 'Failed to unlock vault');
      }
    } catch (error) {
      console.error('Early unlock error:', error);
      toast.error('Failed to unlock vault');
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: COLORS.BG_CARD,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '480px',
        width: '90%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <IoWarning size={48} color="#F59E0B" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', color: COLORS.TEXT_PRIMARY, marginBottom: '8px' }}>Early Unlock Warning</h3>
          <p style={{ color: COLORS.TEXT_SECONDARY, fontSize: '14px' }}>Unlocking before expiry will incur a penalty</p>
        </div>
        
        <div style={{
          background: COLORS.BG_PANEL,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: COLORS.TEXT_SECONDARY }}>Original Amount:</span>
            <span style={{ color: COLORS.TEXT_PRIMARY, fontWeight: '600' }}>{vault.amount.toFixed(8)} {vault.currency}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: COLORS.TEXT_SECONDARY }}>Penalty ({penaltyPercent}%):</span>
            <span style={{ color: '#F59E0B', fontWeight: '600' }}>-{penaltyAmount.toFixed(8)} {vault.currency}</span>
          </div>
          <div style={{ height: '1px', background: COLORS.BG_CARD, margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: COLORS.TEXT_SECONDARY }}>You'll Receive:</span>
            <span style={{ color: COLORS.TEXT_PRIMARY, fontWeight: '700', fontSize: '16px' }}>{finalAmount.toFixed(8)} {vault.currency}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{
            flex: 1,
            height: '44px',
            background: 'transparent',
            color: COLORS.TEXT_SECONDARY,
            border: `1px solid ${COLORS.BG_PANEL}`,
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>Cancel</button>
          <button onClick={handleEarlyUnlock} style={{
            flex: 1,
            height: '44px',
            background: '#F59E0B',
            color: COLORS.TEXT_PRIMARY,
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>Confirm Unlock</button>
        </div>
      </div>
    </div>
  );
}
