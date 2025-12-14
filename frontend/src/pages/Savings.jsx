import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoLockClosed, IoWallet, IoArrowForward } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SavingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('flexible');
  
  const [savingsBalances, setSavingsBalances] = useState([]);
  const [vaults, setVaults] = useState([]);
  
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
      }
    } catch (error) {
      console.error('Error loading vaults:', error);
      throw error;
    }
  };

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
        background: '#F8F9FA',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', borderColor: '#00A8E8', borderTopColor: 'transparent' }}></div>
          <div>Loading savings...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#F8F9FA',
      minHeight: '100vh',
      padding: '0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: '#FFF' }}>
        
        {/* HEADER */}
        <div style={{
          padding: '32px 40px',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 8px 0'
          }}>Savings</h1>
          <p style={{
            fontSize: '15px',
            color: '#6B7280',
            margin: 0
          }}>Earn on your crypto holdings</p>
        </div>

        {/* TABS */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '24px 40px 0 40px',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <button
            onClick={() => setActiveTab('flexible')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'flexible' ? '#F3F4F6' : 'transparent',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '15px',
              fontWeight: '600',
              color: activeTab === 'flexible' ? '#111827' : '#6B7280',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Flexible Savings
          </button>
          <button
            onClick={() => setActiveTab('fixed')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'fixed' ? '#F3F4F6' : 'transparent',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              fontSize: '15px',
              fontWeight: '600',
              color: activeTab === 'fixed' ? '#111827' : '#6B7280',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Fixed-term Savings
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '24px 40px',
          background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <button
            onClick={() => setShowTransferModal(true)}
            style={{
              flex: 1,
              height: '48px',
              borderRadius: '8px',
              background: '#00A8E8',
              border: 'none',
              color: '#FFF',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#0094D0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#00A8E8'}
          >
            <IoArrowForward size={18} />
            Transfer from Wallet
          </button>
          {activeTab === 'fixed' && (
            <button
              onClick={() => setShowCreateVaultModal(true)}
              style={{
                flex: 1,
                height: '48px',
                borderRadius: '8px',
                background: '#10B981',
                border: 'none',
                color: '#FFF',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#10B981'}
            >
              <IoLockClosed size={18} />
              Create Vault
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div style={{ padding: '0' }}>
          {activeTab === 'flexible' ? (
            <FlexibleSavingsContent 
              savingsBalances={savingsBalances}
              onWithdraw={handleWithdrawToWallet}
              onTransfer={() => setShowTransferModal(true)}
            />
          ) : (
            <FixedTermContent 
              vaults={vaults}
              onEarlyUnlock={(vault) => {
                setSelectedVault(vault);
                setShowEarlyUnlockModal(true);
              }}
              onCreate={() => setShowCreateVaultModal(true)}
            />
          )}
        </div>

      </div>

      {showTransferModal && <TransferModal onClose={() => setShowTransferModal(false)} userId={user.user_id} onSuccess={() => loadAllData(user.user_id)} />}
      {showCreateVaultModal && <CreateVaultModal onClose={() => setShowCreateVaultModal(false)} userId={user.user_id} savingsBalances={savingsBalances} onSuccess={() => loadAllData(user.user_id)} />}
      {showEarlyUnlockModal && selectedVault && <EarlyUnlockModal vault={selectedVault} onClose={() => setShowEarlyUnlockModal(false)} userId={user.user_id} onSuccess={() => loadAllData(user.user_id)} />}
    </div>
  );
}

// FLEXIBLE SAVINGS CONTENT - NEXO STYLE (SIMPLE LIST)
function FlexibleSavingsContent({ savingsBalances, onWithdraw, onTransfer }) {
  const availableAssets = [
    { currency: 'USDC', amount: 0, rate: '13%' },
    { currency: 'BTC', amount: 0, rate: '6.5%' },
    { currency: 'ETH', amount: 0, rate: '7.5%' },
    { currency: 'USDT', amount: 0, rate: '13%' },
    { currency: 'LTC', amount: 0, rate: '8%' },
    { currency: 'XRP', amount: 0, rate: '12%' }
  ];

  // Merge user balances with available assets
  const displayAssets = availableAssets.map(available => {
    const userBalance = savingsBalances.find(b => b.currency === available.currency);
    return {
      ...available,
      amount: userBalance ? userBalance.savings_balance : 0,
      hasBalance: !!userBalance
    };
  });

  return (
    <div style={{ padding: '8px 0' }}>
      {displayAssets.map((asset, index) => (
        <div
          key={asset.currency}
          onClick={() => asset.hasBalance && onWithdraw(asset.currency, asset.amount)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 32px',
            borderBottom: '1px solid #F3F4F6',
            cursor: asset.hasBalance ? 'pointer' : 'default',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => asset.hasBalance && (e.currentTarget.style.background = '#FAFAFA')}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={getCoinLogo(asset.currency)}
              alt={asset.currency}
              style={{ width: '44px', height: '44px', borderRadius: '50%' }}
            />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                {asset.currency}
              </div>
              <div style={{ fontSize: '16px', color: '#9CA3AF' }}>
                {asset.amount > 0 ? asset.amount.toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#10B981',
              letterSpacing: '-0.5px'
            }}>
              Up to {asset.rate}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// FIXED-TERM CONTENT - NEXO STYLE (SIMPLE LIST)
function FixedTermContent({ vaults, onEarlyUnlock, onCreate }) {
  const availableAssets = [
    { currency: 'USDC', amount: 0, rate: '15%' },
    { currency: 'BTC', amount: 0, rate: '8%' },
    { currency: 'ETH', amount: 0, rate: '9%' },
    { currency: 'USDT', amount: 0, rate: '15%' },
    { currency: 'LTC', amount: 0, rate: '10%' },
    { currency: 'XRP', amount: 0, rate: '14%' }
  ];

  // Merge user vaults with available assets
  const displayAssets = availableAssets.map(available => {
    const userVault = vaults.find(v => v.currency === available.currency);
    return {
      ...available,
      amount: userVault ? userVault.amount : 0,
      hasVault: !!userVault,
      vault: userVault
    };
  });

  return (
    <div style={{ padding: '8px 0' }}>
      {displayAssets.map((asset, index) => (
        <div
          key={asset.currency}
          onClick={() => asset.hasVault && onEarlyUnlock(asset.vault)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 32px',
            borderBottom: '1px solid #F3F4F6',
            cursor: asset.hasVault ? 'pointer' : 'default',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => asset.hasVault && (e.currentTarget.style.background = '#FAFAFA')}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={getCoinLogo(asset.currency)}
              alt={asset.currency}
              style={{ width: '44px', height: '44px', borderRadius: '50%' }}
            />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                {asset.currency}
              </div>
              <div style={{ fontSize: '16px', color: '#9CA3AF' }}>
                {asset.amount > 0 ? asset.amount.toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#10B981',
              letterSpacing: '-0.5px'
            }}>
              Up to {asset.rate}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Keep existing modals
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
