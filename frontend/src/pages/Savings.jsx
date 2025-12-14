import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoArrowForward, IoLockClosed, IoTime, IoWarning } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

// GLOBAL VISUAL SYSTEM - NON-NEGOTIABLE
const COLORS = {
  BG_PRIMARY: '#0B0F1A',
  BG_CARD: '#12182A',
  BG_PANEL: '#161D33',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#AAB0C0',
  TEXT_MUTED: '#7A8095',
  ACTION_PRIMARY: '#4DA3FF',
  ACTION_HOVER: '#6AB6FF',
  ACTION_DISABLED: '#2A3B55'
};

const GLOW_PRIMARY = '0 0 18px rgba(77,163,255,0.35)';

export default function SavingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [savingsBalances, setSavingsBalances] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [lockedInVaults, setLockedInVaults] = useState(0);
  
  // Modal states
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
        // Only show assets with balance > 0
        const nonZeroBalances = balances.filter(b => b.savings_balance > 0);
        setSavingsBalances(nonZeroBalances);
        
        // Calculate available balance
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
        
        // Calculate locked in vaults
        const locked = (response.data.vaults || []).reduce((sum, v) => sum + (v.gbp_value || 0), 0);
        setLockedInVaults(locked);
      }
    } catch (error) {
      console.error('Error loading vaults:', error);
      throw error;
    }
  };

  // Calculate total savings
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
        background: COLORS.BG_PRIMARY,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.TEXT_PRIMARY
      }}>
        Loading savings...
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 50%, #0A0E27 100%)',
      minHeight: '100vh',
      padding: '24px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 1) PAGE HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
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
              transition: 'all 0.3s',
              boxShadow: '0 0 20px rgba(0,229,255,0.5), 0 4px 12px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,255,0.7), 0 6px 16px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.5), 0 4px 12px rgba(0,0,0,0.3)';
            }}
          >
            Transfer from Wallet
          </button>
        </div>

        {/* 2) SAVINGS SUMMARY PANEL */}
        <div style={{
          background: COLORS.BG_CARD,
          padding: '24px',
          borderRadius: '16px',
          marginBottom: '32px',
          display: 'grid',
          gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(3, 1fr)',
          gap: '24px'
        }}>
          <div>
            <div style={{
              fontSize: '12px',
              color: COLORS.TEXT_MUTED,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Total Savings</div>
            <div style={{
              fontSize: '26px',
              fontWeight: '700',
              color: COLORS.TEXT_PRIMARY
            }}>£{totalSavings.toFixed(2)}</div>
          </div>
          
          <div>
            <div style={{
              fontSize: '12px',
              color: COLORS.TEXT_MUTED,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Available Balance</div>
            <div style={{
              fontSize: '26px',
              fontWeight: '700',
              color: COLORS.TEXT_PRIMARY
            }}>£{availableBalance.toFixed(2)}</div>
          </div>
          
          <div>
            <div style={{
              fontSize: '12px',
              color: COLORS.TEXT_MUTED,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Locked in Vaults</div>
            <div style={{
              fontSize: '26px',
              fontWeight: '700',
              color: COLORS.TEXT_PRIMARY
            }}>£{lockedInVaults.toFixed(2)}</div>
          </div>
        </div>

        {/* 3) FLEXIBLE SAVINGS SECTION */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: COLORS.TEXT_PRIMARY,
            marginBottom: '20px'
          }}>Flexible Savings</h2>
          
          {savingsBalances.length === 0 ? (
            <div style={{
              background: COLORS.BG_CARD,
              padding: '40px',
              borderRadius: '16px',
              textAlign: 'center',
              color: COLORS.TEXT_SECONDARY
            }}>
              No assets in flexible savings. Transfer from wallet to start saving.
            </div>
          ) : (
            <div style={{
              background: COLORS.BG_CARD,
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              {savingsBalances.map((asset, index) => (
                <div
                  key={asset.currency}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: index < savingsBalances.length - 1 ? `1px solid ${COLORS.BG_PANEL}` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <img
                      src={getCoinLogo(asset.currency)}
                      alt={asset.currency}
                      style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                    />
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: COLORS.TEXT_PRIMARY
                      }}>{asset.currency}</div>
                      <div style={{
                        fontSize: '13px',
                        color: COLORS.TEXT_SECONDARY
                      }}>{asset.coin_name || asset.currency}</div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', marginRight: '24px' }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: COLORS.TEXT_PRIMARY
                    }}>{asset.savings_balance.toFixed(8)}</div>
                    <div style={{
                      fontSize: '13px',
                      color: COLORS.TEXT_SECONDARY
                    }}>£{(asset.gbp_value || 0).toFixed(2)}</div>
                  </div>
                  
                  <button
                    onClick={() => handleWithdrawToWallet(asset.currency, asset.savings_balance)}
                    style={{
                      height: '36px',
                      padding: '0 20px',
                      borderRadius: '8px',
                      border: `1px solid ${COLORS.ACTION_PRIMARY}`,
                      background: 'transparent',
                      color: COLORS.ACTION_PRIMARY,
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = COLORS.ACTION_PRIMARY;
                      e.currentTarget.style.color = COLORS.TEXT_PRIMARY;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = COLORS.ACTION_PRIMARY;
                    }}
                  >
                    Withdraw to Wallet
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4) LOCKED VAULTS SECTION */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: COLORS.TEXT_PRIMARY,
              margin: 0
            }}>Locked Vaults</h2>
            
            <button
              onClick={() => setShowCreateVaultModal(true)}
              style={{
                height: '44px',
                padding: '0 24px',
                borderRadius: '10px',
                background: COLORS.ACTION_PRIMARY,
                color: COLORS.TEXT_PRIMARY,
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: GLOW_PRIMARY
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = COLORS.ACTION_HOVER}
              onMouseLeave={(e) => e.currentTarget.style.background = COLORS.ACTION_PRIMARY}
            >
              Create Vault
            </button>
          </div>
          
          {vaults.length === 0 ? (
            <div style={{
              background: COLORS.BG_CARD,
              padding: '40px',
              borderRadius: '16px',
              textAlign: 'center',
              color: COLORS.TEXT_SECONDARY
            }}>
              No vaults created yet. Lock your savings for secure storage.
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

      {/* MODALS */}
      {showTransferModal && <TransferModal onClose={() => setShowTransferModal(false)} userId={user.user_id} onSuccess={() => loadAllData(user.user_id)} />}
      {showCreateVaultModal && <CreateVaultModal onClose={() => setShowCreateVaultModal(false)} userId={user.user_id} savingsBalances={savingsBalances} onSuccess={() => loadAllData(user.user_id)} />}
      {showEarlyUnlockModal && selectedVault && <EarlyUnlockModal vault={selectedVault} onClose={() => setShowEarlyUnlockModal(false)} userId={user.user_id} onSuccess={() => loadAllData(user.user_id)} />}
    </div>
  );
}

// VAULT CARD COMPONENT
function VaultCard({ vault, onEarlyUnlock }) {
  const now = new Date();
  const unlockDate = new Date(vault.unlock_date);
  const daysRemaining = Math.max(0, Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24)));
  const isCompleted = daysRemaining === 0;
  const status = isCompleted ? 'completed' : (daysRemaining <= 7 ? 'unlocking' : 'locked');
  
  const statusColors = {
    locked: '#4DA3FF',
    unlocking: '#F59E0B',
    completed: '#10B981'
  };

  return (
    <div style={{
      background: COLORS.BG_CARD,
      borderRadius: '16px',
      padding: '24px',
      border: `1px solid ${COLORS.BG_PANEL}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={getCoinLogo(vault.currency)} alt={vault.currency} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.TEXT_PRIMARY }}>{vault.currency}</div>
            <div style={{ fontSize: '13px', color: COLORS.TEXT_SECONDARY }}>{vault.amount.toFixed(8)}</div>
          </div>
        </div>
        
        <div style={{
          padding: '4px 12px',
          borderRadius: '6px',
          background: `${statusColors[status]}20`,
          border: `1px solid ${statusColors[status]}`,
          color: statusColors[status],
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          {status}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', color: COLORS.TEXT_MUTED, marginBottom: '4px' }}>Lock Duration</div>
          <div style={{ fontSize: '14px', color: COLORS.TEXT_PRIMARY, fontWeight: '600' }}>{vault.lock_period} days</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: COLORS.TEXT_MUTED, marginBottom: '4px' }}>Days Remaining</div>
          <div style={{ fontSize: '14px', color: COLORS.TEXT_PRIMARY, fontWeight: '600' }}>{daysRemaining} days</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: COLORS.TEXT_MUTED, marginBottom: '4px' }}>Unlock Date</div>
          <div style={{ fontSize: '14px', color: COLORS.TEXT_PRIMARY, fontWeight: '600' }}>{unlockDate.toLocaleDateString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: COLORS.TEXT_MUTED, marginBottom: '4px' }}>Value</div>
          <div style={{ fontSize: '14px', color: COLORS.TEXT_PRIMARY, fontWeight: '600' }}>£{(vault.gbp_value || 0).toFixed(2)}</div>
        </div>
      </div>
      
      {!isCompleted ? (
        <button
          onClick={onEarlyUnlock}
          style={{
            width: '100%',
            height: '36px',
            borderRadius: '8px',
            border: `1px solid ${COLORS.ACTION_PRIMARY}`,
            background: 'transparent',
            color: COLORS.ACTION_PRIMARY,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Early Unlock
        </button>
      ) : (
        <button
          style={{
            width: '100%',
            height: '36px',
            borderRadius: '8px',
            background: COLORS.ACTION_PRIMARY,
            color: COLORS.TEXT_PRIMARY,
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Withdraw to Savings
        </button>
      )}
    </div>
  );
}

// TRANSFER MODAL (Wallet → Savings)
function TransferModal({ onClose, userId, onSuccess }) {
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
