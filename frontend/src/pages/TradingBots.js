/**
 * 🔴🟥 LOCKED: EXISTING TRADING MATCHING/ROUTING/PRICING/LIQUIDITY MUST NOT BE MODIFIED.
 * BOT FEATURE IS ADDITIVE ONLY. ANY CORE CHANGE REQUIRES WRITTEN APPROVAL. 🟥🔴
 * 
 * Trading Bots Page - Grid Bot & DCA Bot
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { IoRocket, IoPlay, IoPause, IoStop, IoTrash, IoAdd, IoChevronBack, IoGrid, IoTrendingUp, IoWallet, IoTime, IoCheckmarkCircle, IoAlertCircle, IoPauseCircle } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function TradingBots() {
  const navigate = useNavigate();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBotType, setSelectedBotType] = useState(null);
  const [tradingPairs, setTradingPairs] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchBots();
    fetchTradingPairs();
  }, []);

  const fetchBots = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.get(`${API}/api/bots/list`, {
        headers: { 'x-user-id': userId }
      });
      if (response.data.success) {
        setBots(response.data.bots);
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTradingPairs = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices) {
        const pairs = Object.keys(response.data.prices).map(symbol => ({
          symbol: `${symbol}USD`,
          name: `${symbol}/USD`
        }));
        setTradingPairs(pairs);
      }
    } catch (error) {
      console.error('Error fetching pairs:', error);
    }
  };

  const handleStartBot = async (botId) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.post(`${API}/api/bots/start`, 
        { bot_id: botId },
        { headers: { 'x-user-id': userId } }
      );
      if (response.data.success) {
        toast.success('Bot started!');
        fetchBots();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start bot');
    }
  };

  const handlePauseBot = async (botId) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.post(`${API}/api/bots/pause`,
        { bot_id: botId },
        { headers: { 'x-user-id': userId } }
      );
      if (response.data.success) {
        toast.success('Bot paused');
        fetchBots();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to pause bot');
    }
  };

  const handleStopBot = async (botId) => {
    if (!window.confirm('Stop this bot and cancel all orders?')) return;
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.post(`${API}/api/bots/stop`,
        { bot_id: botId, cancel_orders: true },
        { headers: { 'x-user-id': userId } }
      );
      if (response.data.success) {
        toast.success('Bot stopped');
        fetchBots();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop bot');
    }
  };

  const handleDeleteBot = async (botId) => {
    if (!window.confirm('Delete this bot permanently?')) return;
    try {
      const userId = localStorage.getItem('userId');
      await axios.delete(`${API}/api/bots/${botId}`, {
        headers: { 'x-user-id': userId }
      });
      toast.success('Bot deleted');
      fetchBots();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete bot');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      running: { bg: 'rgba(0,229,153,0.15)', color: '#00E599', icon: IoCheckmarkCircle, text: 'RUNNING' },
      paused: { bg: 'rgba(255,193,7,0.15)', color: '#FFC107', icon: IoPauseCircle, text: 'PAUSED' },
      stopped: { bg: 'rgba(108,117,125,0.15)', color: '#6C757D', icon: IoStop, text: 'STOPPED' },
      error: { bg: 'rgba(255,92,92,0.15)', color: '#FF5C5C', icon: IoAlertCircle, text: 'ERROR' }
    };
    const style = styles[status] || styles.stopped;
    const Icon = style.icon;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        background: style.bg,
        color: style.color,
        fontSize: '11px',
        fontWeight: '700'
      }}>
        <Icon size={12} />
        {style.text}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0E1626 0%, #070B14 60%)',
      padding: isMobile ? '16px' : '24px 32px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/trading')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8B9BB4',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '8px'
            }}
          >
            <IoChevronBack size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <IoRocket size={24} style={{ color: '#00E599' }} />
              Trading Bots
            </h1>
            <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '4px 0 0' }}>
              Automate your trading with Grid and DCA bots
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)',
            border: 'none',
            color: '#020617',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,229,153,0.3)'
          }}
        >
          <IoAdd size={18} />
          Create Bot
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '12px 16px',
        borderRadius: '10px',
        background: 'rgba(255,193,7,0.1)',
        border: '1px solid rgba(255,193,7,0.3)',
        marginBottom: '24px',
        fontSize: '12px',
        color: '#FFC107'
      }}>
        ⚠️ Bots do not guarantee profit. Trades use your wallet balance. Past performance does not indicate future results.
      </div>

      {/* Bot Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8B9BB4' }}>
          Loading bots...
        </div>
      ) : bots.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#0B1220',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <IoRocket size={48} style={{ color: '#8B9BB4', marginBottom: '16px' }} />
          <h3 style={{ color: '#FFFFFF', margin: '0 0 8px' }}>No bots yet</h3>
          <p style={{ color: '#8B9BB4', margin: '0 0 20px', fontSize: '14px' }}>
            Create your first trading bot to start automating your trades
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)',
              border: 'none',
              color: '#020617',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Create Your First Bot
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {bots.map(bot => (
            <div key={bot.bot_id} style={{
              background: '#0B1220',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '20px',
              transition: 'all 150ms ease'
            }}>
              {/* Bot Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    {bot.type === 'grid' ? <IoGrid size={18} style={{ color: '#00E599' }} /> : <IoTrendingUp size={18} style={{ color: '#00B8D4' }} />}
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>
                      {bot.type === 'grid' ? 'Grid Bot' : 'DCA Bot'}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#8B9BB4' }}>{bot.pair}</div>
                </div>
                {getStatusBadge(bot.status)}
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '4px' }}>Invested</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}>
                    ${bot.pnl?.total_invested?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '4px' }}>PnL</div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: (bot.pnl?.realized_pnl || 0) >= 0 ? '#00E599' : '#FF5C5C'
                  }}>
                    {(bot.pnl?.realized_pnl || 0) >= 0 ? '+' : ''}${bot.pnl?.realized_pnl?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '4px' }}>Orders</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}>
                    {bot.state?.total_orders_placed || 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '4px' }}>Active</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}>
                    {bot.state?.active_orders_count || 0}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {bot.status === 'paused' || bot.status === 'stopped' ? (
                  <button
                    onClick={() => handleStartBot(bot.bot_id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(0,229,153,0.15)',
                      border: '1px solid rgba(0,229,153,0.3)',
                      color: '#00E599',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <IoPlay size={14} /> Start
                  </button>
                ) : (
                  <button
                    onClick={() => handlePauseBot(bot.bot_id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(255,193,7,0.15)',
                      border: '1px solid rgba(255,193,7,0.3)',
                      color: '#FFC107',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <IoPause size={14} /> Pause
                  </button>
                )}
                <button
                  onClick={() => handleStopBot(bot.bot_id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(108,117,125,0.15)',
                    border: '1px solid rgba(108,117,125,0.3)',
                    color: '#6C757D',
                    cursor: 'pointer'
                  }}
                >
                  <IoStop size={14} />
                </button>
                <button
                  onClick={() => handleDeleteBot(bot.bot_id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,92,92,0.15)',
                    border: '1px solid rgba(255,92,92,0.3)',
                    color: '#FF5C5C',
                    cursor: 'pointer'
                  }}
                >
                  <IoTrash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Bot Modal */}
      {showCreateModal && (
        <CreateBotModal
          onClose={() => { setShowCreateModal(false); setSelectedBotType(null); }}
          onSuccess={() => { setShowCreateModal(false); setSelectedBotType(null); fetchBots(); }}
          tradingPairs={tradingPairs}
          selectedType={selectedBotType}
          setSelectedType={setSelectedBotType}
        />
      )}
    </div>
  );
}

// Create Bot Modal Component - 5-STEP WIZARD
function CreateBotModal({ onClose, onSuccess, tradingPairs, selectedType, setSelectedType }) {
  const [step, setStep] = useState(1);
  const [pair, setPair] = useState('');
  const [params, setParams] = useState({
    // Grid defaults
    investment_amount: '',
    lower_price: '',
    upper_price: '',
    grid_count: 10,
    mode: 'arithmetic',
    // DCA defaults
    amount_per_interval: '',
    interval: 'daily',
    total_budget: '',
    side: 'buy',
    // Advanced (both)
    stop_loss_price: '',
    take_profit_price: '',
    max_drawdown_percent: '',
    max_daily_loss: '',
    max_open_orders: 20
  });
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [botCreated, setBotCreated] = useState(null);

  const stepTitles = [
    'Choose Bot Type',
    'Select Trading Pair',
    'Configure Strategy',
    'Review Settings',
    'Bot Created'
  ];

  const fetchPreview = async () => {
    try {
      const response = await axios.post(`${API}/api/bots/preview`, {
        bot_type: selectedType,
        pair,
        params
      });
      if (response.data.success) {
        setPreview(response.data.preview);
        setStep(4);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate preview');
    }
  };

  const handleCreate = async () => {
    if (!agreed) {
      toast.error('Please acknowledge the risk disclaimer');
      return;
    }
    setCreating(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.post(`${API}/api/bots/create`, {
        bot_type: selectedType,
        pair,
        params
      }, {
        headers: { 'x-user-id': userId }
      });
      if (response.data.success) {
        setBotCreated(response.data);
        setStep(5);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create bot');
    } finally {
      setCreating(false);
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
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0B1220',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#FFFFFF' }}>
            {step === 1 ? 'Choose Bot Type' : step === 2 ? 'Configure Bot' : 'Review & Create'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8B9BB4',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '20px' }}>
          {/* Step 1: Choose Type */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => { setSelectedType('grid'); setStep(2); }}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: selectedType === 'grid' ? 'rgba(0,229,153,0.15)' : 'rgba(255,255,255,0.03)',
                  border: selectedType === 'grid' ? '2px solid #00E599' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <IoGrid size={24} style={{ color: '#00E599' }} />
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>Grid Bot</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#8B9BB4' }}>
                  Automatically buy low and sell high within a price range. Best for sideways markets.
                </p>
              </button>
              <button
                onClick={() => { setSelectedType('dca'); setStep(2); }}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: selectedType === 'dca' ? 'rgba(0,184,212,0.15)' : 'rgba(255,255,255,0.03)',
                  border: selectedType === 'dca' ? '2px solid #00B8D4' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <IoTrendingUp size={24} style={{ color: '#00B8D4' }} />
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>DCA Bot</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#8B9BB4' }}>
                  Dollar-cost average into a position over time. Best for long-term accumulation.
                </p>
              </button>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Pair Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8B9BB4' }}>Trading Pair</label>
                <select
                  value={pair}
                  onChange={(e) => setPair(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#0E1626',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select a pair</option>
                  {tradingPairs.map(p => (
                    <option key={p.symbol} value={p.symbol}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Grid Bot Params */}
              {selectedType === 'grid' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8B9BB4' }}>Investment Amount (USD)</label>
                    <input
                      type="number"
                      value={params.investment_amount || ''}
                      onChange={(e) => setParams({ ...params, investment_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g., 1000"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: '#0E1626',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8B9BB4' }}>Lower Price</label>
                      <input
                        type="number"
                        value={params.lower_price || ''}
                        onChange={(e) => setParams({ ...params, lower_price: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g., 80000"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          background: '#0E1626',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8B9BB4' }}>Upper Price</label>
                      <input
                        type="number"
                        value={params.upper_price || ''}
                        onChange={(e) => setParams({ ...params, upper_price: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g., 100000"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          background: '#0E1626',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8B9BB4' }}>Grid Count (2-100)</label>
                    <input
                      type="number"
                      value={params.grid_count || ''}
                      onChange={(e) => setParams({ ...params, grid_count: parseInt(e.target.value) || 0 })}
                      placeholder="e.g., 10"
                      min="2"
                      max="100"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: '#0E1626',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}

              {/* DCA Bot Params */}
              {selectedType === 'dca' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8B9BB4' }}>Amount Per Order (USD)</label>
                    <input
                      type="number"
                      value={params.amount_per_interval || ''}
                      onChange={(e) => setParams({ ...params, amount_per_interval: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g., 100"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: '#0E1626',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8B9BB4' }}>Interval</label>
                    <select
                      value={params.interval || ''}
                      onChange={(e) => setParams({ ...params, interval: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: '#0E1626',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select interval</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#8B9BB4' }}>Total Budget (USD)</label>
                    <input
                      type="number"
                      value={params.total_budget || ''}
                      onChange={(e) => setParams({ ...params, total_budget: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g., 1000"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: '#0E1626',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </>
              )}

              <button
                onClick={fetchPreview}
                disabled={!pair}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  background: pair ? 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)' : '#2A3441',
                  border: 'none',
                  color: pair ? '#020617' : '#6C757D',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: pair ? 'pointer' : 'not-allowed'
                }}
              >
                Preview Bot
              </button>
            </div>
          )}

          {/* Step 3: Review & Create */}
          {step === 3 && preview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <h4 style={{ margin: '0 0 12px', color: '#FFFFFF', fontSize: '14px' }}>Bot Summary</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Type</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>
                      {preview.bot_type === 'grid' ? 'Grid Bot' : 'DCA Bot'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Pair</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>{preview.pair}</span>
                  </div>
                  {preview.bot_type === 'grid' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Price Range</span>
                        <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>{preview.price_range}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Grid Levels</span>
                        <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>{preview.grid_count}</span>
                      </div>
                    </>
                  )}
                  {preview.bot_type === 'dca' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Interval</span>
                        <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{preview.interval}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Duration</span>
                        <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>{preview.estimated_duration_days} days</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Estimated Orders</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>{preview.estimated_orders}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Total Investment</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>${preview.total_investment || preview.total_budget}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Est. Fees</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>${preview.estimated_fees}</span>
                  </div>
                </div>
              </div>

              {/* Risk Acknowledgment */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
                padding: '12px',
                background: 'rgba(255,193,7,0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(255,193,7,0.3)'
              }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ fontSize: '12px', color: '#FFC107' }}>
                  I understand that trading bots do not guarantee profit. Trades will use my wallet balance. I accept all risks associated with automated trading.
                </span>
              </label>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#8B9BB4',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!agreed || creating}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '10px',
                    background: agreed ? 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)' : '#2A3441',
                    border: 'none',
                    color: agreed ? '#020617' : '#6C757D',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: agreed ? 'pointer' : 'not-allowed'
                  }}
                >
                  {creating ? 'Creating...' : 'Create Bot'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
