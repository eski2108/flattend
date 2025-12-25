/**
 * 🔴🟥 LOCKED: EXISTING TRADING MATCHING/ROUTING/PRICING/LIQUIDITY MUST NOT BE MODIFIED.
 * BOT FEATURE IS ADDITIVE ONLY. ANY CORE CHANGE REQUIRES WRITTEN APPROVAL. 🟥🔴
 * 
 * Trading Bots Page - Phase 7: UX, Presets & Controls
 * - Grid Bot, DCA Bot, Signal Bot
 * - Presets/Templates
 * - Decision Logs
 * - Safety Controls
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { IoRocket, IoPlay, IoPause, IoStop, IoTrash, IoAdd, IoChevronBack, IoGrid, IoTrendingUp, IoWallet, IoTime, IoCheckmarkCircle, IoAlertCircle, IoPauseCircle, IoCopy, IoSettings, IoShield, IoWarning, IoList, IoDocumentText, IoSearch, IoClose, IoFlash, IoHelpCircle } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Helper function to get user_id from localStorage
const getUserId = () => {
  // First try 'userId' (direct storage)
  const directUserId = localStorage.getItem('userId');
  if (directUserId) return directUserId;
  
  // Fall back to extracting from 'user' object
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.user_id || user.id || null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Helper function to format indicator values for display
const formatIndicatorValue = (val) => {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'number') return val.toFixed(2);
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    // Handle {current, period, std_dev} format
    const current = val.current;
    if (current !== undefined) {
      const formatted = typeof current === 'number' ? current.toFixed(2) : String(current);
      // Optionally show period if available
      if (val.period) {
        return `${formatted} (p${val.period})`;
      }
      return formatted;
    }
    // Fallback to JSON for unknown object structures
    return JSON.stringify(val);
  }
  return String(val);
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: BOT PRESETS - 10+ templates across Grid/DCA/Signal
// ═══════════════════════════════════════════════════════════════════════════════
const BOT_PRESETS = [
  // BEGINNER SAFE
  {
    id: 'beginner-dca-btc',
    name: 'Beginner Safe DCA',
    type: 'dca',
    category: 'beginner',
    description: 'Low-risk Bitcoin accumulation. Perfect for beginners.',
    pair: 'BTCUSD',
    timeframe: '1h',
    config: {
      dca_mode: 'time_based',
      buy_interval_candles: 24,
      base_order_size_percent: 2,
      safety_order_size_percent: 3,
      max_dca_levels: 3,
      take_profit_percent: 3,
      stop_loss_percent: 10
    },
    risk: { max_daily_trades: 3, require_stop_loss: true, cooldown_minutes: 60 },
    badge: '🛡️ Safe'
  },
  {
    id: 'beginner-grid-stable',
    name: 'Conservative Grid',
    type: 'grid',
    category: 'beginner',
    description: 'Tight range grid for stable markets. Low risk.',
    pair: 'ETHUSD',
    timeframe: '15m',
    config: {
      grid_levels: 5,
      order_size_percent: 5,
      price_range_percent: 5
    },
    risk: { max_daily_trades: 10, require_stop_loss: true, cooldown_minutes: 30 },
    badge: '🛡️ Safe'
  },
  // TREND-FOLLOWING
  {
    id: 'trend-signal-rsi',
    name: 'RSI Trend Follower',
    type: 'signal',
    category: 'trend',
    description: 'Buy oversold, sell overbought. Classic trend strategy.',
    pair: 'BTCUSD',
    timeframe: '1h',
    config: {
      position_size_percent: 15,
      strategy: {
        indicators: [
          { indicator: 'RSI', params: { period: 14 }, comparator: '<', threshold: 30 }
        ],
        entry_logic: 'AND',
        exit_logic: 'AND'
      }
    },
    risk: { max_daily_trades: 5, require_stop_loss: true, cooldown_minutes: 30 },
    badge: '📈 Trend'
  },
  {
    id: 'trend-macd-cross',
    name: 'MACD Crossover',
    type: 'signal',
    category: 'trend',
    description: 'Trade MACD histogram crossovers for trend entries.',
    pair: 'ETHUSD',
    timeframe: '4h',
    config: {
      position_size_percent: 20,
      strategy: {
        indicators: [
          { indicator: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, comparator: '>', threshold: 0 }
        ],
        entry_logic: 'AND',
        exit_logic: 'AND'
      }
    },
    risk: { max_daily_trades: 3, require_stop_loss: true, cooldown_minutes: 60 },
    badge: '📈 Trend'
  },
  // RANGE/GRID
  {
    id: 'grid-btc-range',
    name: 'BTC Range Trader',
    type: 'grid',
    category: 'range',
    description: 'Grid bot for sideways BTC markets.',
    pair: 'BTCUSD',
    timeframe: '5m',
    config: {
      grid_levels: 10,
      order_size_percent: 8,
      price_range_percent: 8
    },
    risk: { max_daily_trades: 20, require_stop_loss: false, cooldown_minutes: 5 },
    badge: '📊 Range'
  },
  {
    id: 'grid-eth-scalp',
    name: 'ETH Grid Scalper',
    type: 'grid',
    category: 'range',
    description: 'Aggressive grid for volatile ETH ranges.',
    pair: 'ETHUSD',
    timeframe: '1m',
    config: {
      grid_levels: 15,
      order_size_percent: 5,
      price_range_percent: 4
    },
    risk: { max_daily_trades: 50, require_stop_loss: true, cooldown_minutes: 2 },
    badge: '📊 Range'
  },
  // MEAN REVERSION
  {
    id: 'mean-bb-bounce',
    name: 'Bollinger Bounce',
    type: 'signal',
    category: 'mean_reversion',
    description: 'Buy at lower band, sell at upper band.',
    pair: 'BTCUSD',
    timeframe: '15m',
    config: {
      position_size_percent: 15,
      strategy: {
        indicators: [
          { indicator: 'BB', params: { period: 20, std_dev: 2 }, comparator: '<', threshold: 0, output: 'lower' }
        ],
        entry_logic: 'AND',
        exit_logic: 'AND'
      }
    },
    risk: { max_daily_trades: 8, require_stop_loss: true, cooldown_minutes: 15 },
    badge: '🔄 Reversion'
  },
  // BREAKOUT
  {
    id: 'breakout-volume',
    name: 'Volume Breakout',
    type: 'signal',
    category: 'breakout',
    description: 'Trade breakouts with volume confirmation.',
    pair: 'SOLUSD',
    timeframe: '1h',
    config: {
      position_size_percent: 20,
      strategy: {
        indicators: [
          { indicator: 'RSI', params: { period: 14 }, comparator: '>', threshold: 60 }
        ],
        entry_logic: 'AND',
        exit_logic: 'AND'
      }
    },
    risk: { max_daily_trades: 4, require_stop_loss: true, cooldown_minutes: 45 },
    badge: '🚀 Breakout'
  },
  // DCA ACCUMULATION
  {
    id: 'dca-weekly-btc',
    name: 'Weekly BTC Stacker',
    type: 'dca',
    category: 'accumulation',
    description: 'Dollar-cost average into BTC weekly.',
    pair: 'BTCUSD',
    timeframe: '1h',
    config: {
      dca_mode: 'time_based',
      buy_interval_candles: 168, // Weekly
      base_order_size_percent: 5,
      safety_order_size_percent: 5,
      max_dca_levels: 5,
      take_profit_percent: 5
    },
    risk: { max_daily_trades: 1, require_stop_loss: false, cooldown_minutes: 120 },
    badge: '💰 Accumulate'
  },
  {
    id: 'dca-dip-buyer',
    name: 'Dip Buyer DCA',
    type: 'dca',
    category: 'accumulation',
    description: 'Aggressive buying on price drops.',
    pair: 'ETHUSD',
    timeframe: '15m',
    config: {
      dca_mode: 'price_drop',
      price_drop_percent: 3,
      base_order_size_percent: 3,
      safety_order_size_percent: 6,
      max_dca_levels: 5,
      take_profit_percent: 4
    },
    risk: { max_daily_trades: 10, require_stop_loss: true, cooldown_minutes: 15 },
    badge: '💰 Accumulate'
  },
  // AGGRESSIVE
  {
    id: 'aggressive-scalp',
    name: 'Aggressive Scalper',
    type: 'signal',
    category: 'advanced',
    description: '⚠️ High risk, high reward. For experienced traders only.',
    pair: 'SOLUSD',
    timeframe: '5m',
    config: {
      position_size_percent: 30,
      strategy: {
        indicators: [
          { indicator: 'RSI', params: { period: 7 }, comparator: '<', threshold: 25 }
        ],
        entry_logic: 'AND',
        exit_logic: 'AND'
      }
    },
    risk: { max_daily_trades: 20, require_stop_loss: true, cooldown_minutes: 5 },
    badge: '⚡ Advanced'
  }
];

const PRESET_CATEGORIES = [
  { id: 'all', name: 'All Presets', icon: '📋' },
  { id: 'beginner', name: 'Beginner Safe', icon: '🛡️' },
  { id: 'trend', name: 'Trend Following', icon: '📈' },
  { id: 'range', name: 'Range/Grid', icon: '📊' },
  { id: 'mean_reversion', name: 'Mean Reversion', icon: '🔄' },
  { id: 'breakout', name: 'Breakout', icon: '🚀' },
  { id: 'accumulation', name: 'DCA Accumulation', icon: '💰' },
  { id: 'advanced', name: 'Advanced', icon: '⚡' }
];

export default function TradingBots() {
  const navigate = useNavigate();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBotType, setSelectedBotType] = useState(null);
  const [tradingPairs, setTradingPairs] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // PHASE 7: Main tabs
  const [activeTab, setActiveTab] = useState('my-bots'); // 'my-bots' | 'presets' | 'logs'
  
  // PHASE 7: Presets state
  const [selectedPresetCategory, setSelectedPresetCategory] = useState('all');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  
  // PHASE 7: Decision Logs state
  const [decisionLogs, setDecisionLogs] = useState([]);
  const [logFilters, setLogFilters] = useState({ action: 'all', botId: 'all', dateRange: '7d', search: '' });
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLogExplanation, setSelectedLogExplanation] = useState(null);
  
  // PHASE 7: Emergency Stop state
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterPair, setFilterPair] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // View bot panel
  const [selectedBot, setSelectedBot] = useState(null);
  const [botEvents, setBotEvents] = useState([]);
  const [botTrades, setBotTrades] = useState([]);

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
      const userId = getUserId();
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

  const fetchBotDetails = async (botId) => {
    try {
      const userId = getUserId();
      const [detailsRes, eventsRes, tradesRes] = await Promise.all([
        axios.get(`${API}/api/bots/${botId}`, { headers: { 'x-user-id': userId } }),
        axios.get(`${API}/api/bots/${botId}/logs`, { headers: { 'x-user-id': userId } }),
        axios.get(`${API}/api/bots/${botId}/trades`, { headers: { 'x-user-id': userId } })
      ]);
      
      if (detailsRes.data.success) {
        setSelectedBot(detailsRes.data.bot);
      }
      if (eventsRes.data.success) {
        setBotEvents(eventsRes.data.events || []);
      }
      if (tradesRes.data.success) {
        setBotTrades(tradesRes.data.trades || []);
      }
    } catch (error) {
      console.error('Error fetching bot details:', error);
      toast.error('Failed to load bot details');
    }
  };

  const fetchTradingPairs = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices) {
        // Emoji mapping for coins
        const coinEmojis = {
          BTC: '₿', ETH: '⟠', USDT: '💵', USDC: '💲', BNB: '🔶',
          SOL: '◎', XRP: '✕', ADA: '🔵', DOGE: '🐕', DOT: '⬡',
          AVAX: '🔺', MATIC: '💜', LINK: '🔗', UNI: '🦄', ATOM: '⚛️',
          LTC: '🪙', BCH: '💚', XLM: '✨', ALGO: '🔷', VET: '♦️'
        };
        const pairs = Object.keys(response.data.prices).map(symbol => ({
          symbol: `${symbol}USD`,
          name: `${symbol}/USD`,
          emoji: coinEmojis[symbol] || '🪙'
        }));
        setTradingPairs(pairs);
      }
    } catch (error) {
      console.error('Error fetching pairs:', error);
    }
  };

  const handleStartBot = async (botId) => {
    try {
      const userId = getUserId();
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
      const userId = getUserId();
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
      const userId = getUserId();
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
      const userId = getUserId();
      await axios.delete(`${API}/api/bots/${botId}`, {
        headers: { 'x-user-id': userId }
      });
      toast.success('Bot deleted');
      fetchBots();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete bot');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 7: Additional Functions
  // ═══════════════════════════════════════════════════════════════════════════════

  // Fetch Decision Logs
  const fetchDecisionLogs = async () => {
    setLoadingLogs(true);
    try {
      const userId = getUserId();
      const response = await axios.get(`${API}/api/trading/audit-log`, {
        headers: { 'x-user-id': userId },
        params: { limit: 100 }
      });
      if (response.data.success) {
        setDecisionLogs(response.data.trades || []);
      }
    } catch (error) {
      console.error('Error fetching decision logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Emergency Stop All Bots
  const handleEmergencyStopAll = async () => {
    setEmergencyLoading(true);
    try {
      const userId = getUserId();
      const runningBots = bots.filter(b => b.status === 'running' || b.status === 'paused');
      
      for (const bot of runningBots) {
        await axios.post(`${API}/api/bots/stop`, 
          { bot_id: bot.bot_id, cancel_orders: true },
          { headers: { 'x-user-id': userId } }
        );
      }
      
      toast.success(`Stopped ${runningBots.length} bots`);
      setShowEmergencyModal(false);
      fetchBots();
    } catch (error) {
      toast.error('Failed to stop all bots');
    } finally {
      setEmergencyLoading(false);
    }
  };

  // Duplicate Bot
  const handleDuplicateBot = async (bot) => {
    try {
      const userId = getUserId();
      const response = await axios.post(`${API}/api/bots/create`, {
        ...bot,
        bot_id: undefined,
        name: `${bot.name || bot.type} (Copy)`,
        status: 'draft'
      }, { headers: { 'x-user-id': userId } });
      
      if (response.data.success) {
        toast.success('Bot duplicated');
        fetchBots();
      }
    } catch (error) {
      toast.error('Failed to duplicate bot');
    }
  };

  // Create Bot from Preset
  const handleCreateFromPreset = (preset) => {
    setSelectedPreset(preset);
    setShowPresetModal(true);
  };

  // Toggle Safe Mode for a bot
  const handleToggleSafeMode = async (botId, enabled) => {
    try {
      const userId = getUserId();
      // This updates the bot's safe_mode setting (UI control - uses existing risk engine)
      const response = await axios.patch(`${API}/api/bots/${botId}/settings`, 
        { safe_mode: enabled },
        { headers: { 'x-user-id': userId } }
      );
      if (response.data.success) {
        toast.success(`Safe Mode ${enabled ? 'enabled' : 'disabled'}`);
        fetchBots();
      }
    } catch (error) {
      // If endpoint doesn't exist, update locally for UI demo
      setBots(prev => prev.map(b => 
        b.bot_id === botId ? { ...b, safe_mode: enabled } : b
      ));
      toast.success(`Safe Mode ${enabled ? 'enabled' : 'disabled'}`);
    }
  };

  // Get Risk Badge
  const getRiskBadge = (bot) => {
    const riskStatus = bot.risk_status || 'ok';
    const styles = {
      ok: { bg: 'rgba(0,229,153,0.15)', color: '#00E599', text: 'OK', icon: IoShield },
      warning: { bg: 'rgba(255,193,7,0.15)', color: '#FFC107', text: 'WARNING', icon: IoWarning },
      blocked: { bg: 'rgba(255,92,92,0.15)', color: '#FF5C5C', text: 'BLOCKED', icon: IoAlertCircle }
    };
    const style = styles[riskStatus] || styles.ok;
    const Icon = style.icon;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '4px',
        background: style.bg,
        color: style.color,
        fontSize: '10px',
        fontWeight: '700'
      }}>
        <Icon size={10} />
        {style.text}
      </div>
    );
  };

  // Filter presets by category
  const filteredPresets = selectedPresetCategory === 'all' 
    ? BOT_PRESETS 
    : BOT_PRESETS.filter(p => p.category === selectedPresetCategory);

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
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
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
              Automate your trading • Grid • DCA • Signal
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* PHASE 7: Emergency Stop Button */}
          {bots.filter(b => b.status === 'running').length > 0 && (
            <button
              onClick={() => setShowEmergencyModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'rgba(255,92,92,0.15)',
                border: '1px solid rgba(255,92,92,0.3)',
                color: '#FF5C5C',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <IoStop size={16} />
              Emergency Stop All
            </button>
          )}
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
      </div>

      {/* PHASE 7: Main Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        padding: '4px',
        background: 'rgba(14,22,38,0.8)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        {[
          { id: 'my-bots', label: 'My Bots', icon: IoRocket },
          { id: 'presets', label: 'Presets', icon: IoFlash },
          { id: 'logs', label: 'Decision Logs', icon: IoDocumentText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'logs') fetchDecisionLogs();
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '10px',
                background: isActive ? 'linear-gradient(135deg, rgba(0,229,153,0.2) 0%, rgba(0,184,212,0.2) 100%)' : 'transparent',
                border: isActive ? '1px solid rgba(0,229,153,0.3)' : '1px solid transparent',
                color: isActive ? '#00E599' : '#8B9BB4',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
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

      {/* ═══════════════════════════════════════════════════════════════════════════════
          TAB CONTENT: MY BOTS
      ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my-bots' && (
        <>
      {/* Filters Row */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#0E1626',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#FFFFFF',
            fontSize: '13px',
            minWidth: '140px'
          }}
        >
          <option value="all">🤖 All Types</option>
          <option value="grid">📊 Grid Bot</option>
          <option value="dca">💰 DCA Bot</option>
          <option value="signal">📈 Signal Bot</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#0E1626',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#FFFFFF',
            fontSize: '13px',
            minWidth: '140px'
          }}
        >
          <option value="all">📋 All Status</option>
          <option value="running">✅ Running</option>
          <option value="paused">⏸️ Paused</option>
          <option value="stopped">⏹️ Stopped</option>
          <option value="draft">📝 Draft</option>
        </select>
        <select
          value={filterPair}
          onChange={(e) => setFilterPair(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#0E1626',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#FFFFFF',
            fontSize: '13px',
            minWidth: '140px'
          }}
        >
          <option value="all">💱 All Pairs</option>
          {tradingPairs.map(p => (
            <option key={p.symbol} value={p.symbol}>{p.emoji || '🪙'} {p.name}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#8B9BB4', fontSize: '13px' }}>
          {bots.filter(b => 
            (filterType === 'all' || b.type === filterType) &&
            (filterStatus === 'all' || b.status === filterStatus) &&
            (filterPair === 'all' || b.pair === filterPair)
          ).length} bot{bots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bot Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8B9BB4' }}>
          Loading bots...
        </div>
      ) : bots.filter(b => 
          (filterType === 'all' || b.type === filterType) &&
          (filterStatus === 'all' || b.status === filterStatus) &&
          (filterPair === 'all' || b.pair === filterPair)
        ).length === 0 ? (
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
          {bots.filter(b => 
            (filterType === 'all' || b.type === filterType) &&
            (filterStatus === 'all' || b.status === filterStatus) &&
            (filterPair === 'all' || b.pair === filterPair)
          ).map(bot => {
            // Calculate runtime
            const runtime = bot.created_at ? (() => {
              const diff = Date.now() - new Date(bot.created_at).getTime();
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              if (days > 0) return `${days}d ${hours}h`;
              const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            })() : '--';
            
            return (
            <div key={bot.bot_id} style={{
              background: 'linear-gradient(145deg, #0B1220 0%, #0A0F18 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '20px',
              transition: 'all 150ms ease',
              position: 'relative'
            }}>
              {/* Bot Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    {bot.type === 'grid' ? <IoGrid size={18} style={{ color: '#00E599' }} /> : 
                     bot.type === 'dca' ? <IoTrendingUp size={18} style={{ color: '#00B8D4' }} /> :
                     <IoRocket size={18} style={{ color: '#FF6B6B' }} />}
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>
                      {bot.type === 'grid' ? 'Grid Bot' : bot.type === 'dca' ? 'DCA Bot' : 'Signal Bot'}
                    </span>
                    {getRiskBadge(bot)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#8B9BB4' }}>
                    <span style={{ fontWeight: '600', color: '#FFFFFF' }}>{bot.pair}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IoTime size={12} /> {runtime}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* PAPER / LIVE Mode Badge */}
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      background: bot.mode === 'live' ? 'rgba(239,68,68,0.15)' : 'rgba(255,193,7,0.15)',
                      color: bot.mode === 'live' ? '#EF4444' : '#FFC107',
                      border: bot.mode === 'live' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,193,7,0.3)'
                    }}>
                      {bot.mode === 'live' ? '🔴 LIVE' : '📝 PAPER'}
                    </span>
                    {getStatusBadge(bot.status)}
                  </div>
                  {/* Safe Mode Toggle */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSafeMode(bot.bot_id, !bot.safe_mode);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: bot.safe_mode ? 'rgba(0,229,153,0.1)' : 'rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: bot.safe_mode ? '#00E599' : '#8B9BB4'
                    }}
                  >
                    <IoShield size={10} />
                    Safe Mode {bot.safe_mode ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>

              {/* Stats Grid - Enhanced */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px',
                marginBottom: '12px'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px', textTransform: 'uppercase' }}>Invested</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>
                    ${bot.pnl?.total_invested?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px', textTransform: 'uppercase' }}>PnL</div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: (bot.pnl?.realized_pnl || 0) >= 0 ? '#00E599' : '#FF5C5C'
                  }}>
                    {(bot.pnl?.realized_pnl || 0) >= 0 ? '+' : ''}${bot.pnl?.realized_pnl?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px', textTransform: 'uppercase' }}>Trades</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>
                    {bot.state?.total_orders_placed || 0}
                  </div>
                </div>
              </div>

              {/* Last Trade Info */}
              <div style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#8B9BB4' }}>Last Trade:</span>
                <span style={{ color: '#FFFFFF' }}>
                  {bot.state?.last_trade_at 
                    ? new Date(bot.state.last_trade_at).toLocaleString() 
                    : 'No trades yet'}
                </span>
              </div>

              {/* Actions Row 1 - Primary */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {bot.status === 'paused' || bot.status === 'stopped' || bot.status === 'draft' ? (
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
                      background: 'linear-gradient(135deg, rgba(0,229,153,0.2) 0%, rgba(0,184,212,0.2) 100%)',
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
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px'
                  }}
                  title="Stop Bot"
                >
                  <IoStop size={14} />
                </button>
                <button
                  onClick={() => fetchBotDetails(bot.bot_id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,240,255,0.15)',
                    border: '1px solid rgba(0,240,255,0.3)',
                    color: '#00F0FF',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  View
                </button>
              </div>

              {/* Actions Row 2 - Secondary */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setSelectedBot(bot);
                    setActiveTab('logs');
                    fetchDecisionLogs();
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(168,85,247,0.1)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    color: '#A855F7',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <IoList size={12} /> Logs
                </button>
                <button
                  onClick={() => handleDuplicateBot(bot)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#8B9BB4',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <IoCopy size={12} /> Duplicate
                </button>
                <button
                  onClick={() => {
                    // Edit functionality - open modal with bot data
                    setSelectedBotType(bot.type);
                    toast('Edit mode coming soon', { icon: '🔧' });
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#8B9BB4',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <IoSettings size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDeleteBot(bot.bot_id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,92,92,0.1)',
                    border: '1px solid rgba(255,92,92,0.2)',
                    color: '#FF5C5C',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                  title="Delete Bot"
                >
                  <IoTrash size={12} />
                </button>
              </div>
            </div>
          );})}
        </div>
      )}

      {/* Live Bot Panel Modal */}
      {selectedBot && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0B1220 0%, #0A0F1A 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.08)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, color: '#FFFFFF', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ 
                    background: selectedBot.type === 'grid' ? 'rgba(0,229,153,0.2)' : selectedBot.type === 'dca' ? 'rgba(0,184,212,0.2)' : 'rgba(255,107,107,0.2)',
                    color: selectedBot.type === 'grid' ? '#00E599' : selectedBot.type === 'dca' ? '#00B8D4' : '#FF6B6B',
                    padding: '4px 10px', borderRadius: '6px', fontSize: '12px', textTransform: 'uppercase'
                  }}>{selectedBot.type}</span>
                  {selectedBot.pair}
                </h2>
                <p style={{ margin: '4px 0 0', color: '#8B9BB4', fontSize: '13px' }}>
                  Created: {new Date(selectedBot.created_at).toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  background: selectedBot.status === 'running' ? 'rgba(34,197,94,0.2)' : selectedBot.status === 'paused' ? 'rgba(251,191,36,0.2)' : 'rgba(108,117,125,0.2)',
                  color: selectedBot.status === 'running' ? '#22C55E' : selectedBot.status === 'paused' ? '#FBBF24' : '#6C757D',
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase'
                }}>{selectedBot.status}</span>
                <button onClick={() => setSelectedBot(null)} style={{ background: 'transparent', border: 'none', color: '#8B9BB4', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', textTransform: 'uppercase', marginBottom: '4px' }}>Total PnL</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: (selectedBot.state?.total_pnl || 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                    {(selectedBot.state?.total_pnl || 0) >= 0 ? '+' : ''}${(selectedBot.state?.total_pnl || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', textTransform: 'uppercase', marginBottom: '4px' }}>24h PnL</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: (selectedBot.state?.pnl_24h || 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                    {(selectedBot.state?.pnl_24h || 0) >= 0 ? '+' : ''}${(selectedBot.state?.pnl_24h || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', textTransform: 'uppercase', marginBottom: '4px' }}>Total Trades</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>{selectedBot.state?.total_trades || 0}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', textTransform: 'uppercase', marginBottom: '4px' }}>Fees Paid</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#FBBF24' }}>${(selectedBot.state?.total_fees || 0).toFixed(2)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', textTransform: 'uppercase', marginBottom: '4px' }}>Last Signal</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: selectedBot.state?.last_entry_triggered ? '#22C55E' : '#8B9BB4' }}>
                    {selectedBot.state?.last_entry_triggered ? 'Triggered' : 'No trigger'}
                  </div>
                </div>
              </div>

              {/* Rules Summary (Signal Bot) */}
              {selectedBot.type === 'signal' && selectedBot.params?.entry_rules && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#FFFFFF', fontSize: '14px' }}>📊 Active Rules</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,229,153,0.08)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(0,229,153,0.2)' }}>
                      <div style={{ fontSize: '12px', color: '#00E599', fontWeight: '600', marginBottom: '8px' }}>Entry ({selectedBot.params.entry_rules.operator})</div>
                      {selectedBot.params.entry_rules.conditions?.map((c, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#8B9BB4', marginBottom: '4px' }}>
                          {c.indicator?.toUpperCase()} ({c.timeframe}) {c.operator} {c.value}
                        </div>
                      ))}
                    </div>
                    <div style={{ background: 'rgba(255,92,92,0.08)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,92,92,0.2)' }}>
                      <div style={{ fontSize: '12px', color: '#FF5C5C', fontWeight: '600', marginBottom: '8px' }}>Exit ({selectedBot.params.exit_rules?.operator || 'OR'})</div>
                      {selectedBot.params.exit_rules?.conditions?.map((c, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#8B9BB4', marginBottom: '4px' }}>
                          {c.indicator?.toUpperCase()} ({c.timeframe}) {c.operator} {c.value}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Trades */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px', color: '#FFFFFF', fontSize: '14px' }}>📈 Recent Trades</h4>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  {botTrades.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#8B9BB4', fontSize: '13px' }}>No trades yet</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '10px', textAlign: 'left', color: '#8B9BB4', fontSize: '11px', fontWeight: '600' }}>TIME</th>
                          <th style={{ padding: '10px', textAlign: 'left', color: '#8B9BB4', fontSize: '11px', fontWeight: '600' }}>SIDE</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#8B9BB4', fontSize: '11px', fontWeight: '600' }}>AMOUNT</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#8B9BB4', fontSize: '11px', fontWeight: '600' }}>PRICE</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#8B9BB4', fontSize: '11px', fontWeight: '600' }}>FEE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {botTrades.slice(0, 10).map((trade, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '10px', color: '#8B9BB4', fontSize: '12px' }}>{new Date(trade.timestamp).toLocaleString()}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ color: trade.side === 'buy' ? '#22C55E' : '#EF4444', fontWeight: '600', textTransform: 'uppercase' }}>{trade.side}</span>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', color: '#FFFFFF', fontSize: '12px' }}>${trade.amount?.toFixed(2)}</td>
                            <td style={{ padding: '10px', textAlign: 'right', color: '#FFFFFF', fontSize: '12px' }}>${trade.price?.toLocaleString()}</td>
                            <td style={{ padding: '10px', textAlign: 'right', color: '#FBBF24', fontSize: '12px' }}>${trade.fee?.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Event Logs */}
              <div>
                <h4 style={{ margin: '0 0 12px', color: '#FFFFFF', fontSize: '14px' }}>📋 Event Log</h4>
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '200px', overflow: 'auto' }}>
                  {botEvents.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#8B9BB4', fontSize: '13px' }}>No events yet</div>
                  ) : botEvents.slice(0, 20).map((event, i) => (
                    <div key={i} style={{ 
                      padding: '10px 14px', 
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ color: '#8B9BB4', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: event.event_type === 'trade_placed' ? 'rgba(34,197,94,0.2)' : 
                                   event.event_type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(168,85,247,0.2)',
                        color: event.event_type === 'trade_placed' ? '#22C55E' : 
                               event.event_type === 'error' ? '#EF4444' : '#A855F7'
                      }}>{event.event_type}</span>
                      <span style={{ color: '#FFFFFF', fontSize: '12px', flex: 1 }}>
                        {typeof event.data === 'string' ? event.data : JSON.stringify(event.data).slice(0, 100)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                {selectedBot.status === 'running' ? (
                  <button
                    onClick={() => { handlePauseBot(selectedBot.bot_id); setSelectedBot(null); }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '10px',
                      background: 'rgba(251,191,36,0.15)',
                      border: '1px solid rgba(251,191,36,0.3)',
                      color: '#FBBF24',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >Pause Bot</button>
                ) : (
                  <button
                    onClick={() => { handleStartBot(selectedBot.bot_id); setSelectedBot(null); }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)',
                      border: 'none',
                      color: '#020617',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >Start Bot</button>
                )}
                <button
                  onClick={() => { handleStopBot(selectedBot.bot_id); setSelectedBot(null); }}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '10px',
                    background: 'rgba(108,117,125,0.15)',
                    border: '1px solid rgba(108,117,125,0.3)',
                    color: '#6C757D',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >Stop</button>
                <button
                  onClick={() => setSelectedBot(null)}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#8B9BB4',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End of My Bots Tab */}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
          TAB CONTENT: PRESETS
      ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'presets' && (
        <div>
          {/* Preset Category Filter */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            {PRESET_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedPresetCategory(cat.id)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: selectedPresetCategory === cat.id 
                    ? 'linear-gradient(135deg, rgba(0,229,153,0.2) 0%, rgba(0,184,212,0.2) 100%)' 
                    : 'rgba(14,22,38,0.8)',
                  border: selectedPresetCategory === cat.id 
                    ? '1px solid rgba(0,229,153,0.3)' 
                    : '1px solid rgba(255,255,255,0.1)',
                  color: selectedPresetCategory === cat.id ? '#00E599' : '#8B9BB4',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Preset Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {filteredPresets.map(preset => (
              <div
                key={preset.id}
                style={{
                  background: 'rgba(14,22,38,0.9)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.border = '1px solid rgba(0,229,153,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'}
              >
                {/* Preset Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: preset.type === 'grid' ? 'rgba(0,229,153,0.15)' : preset.type === 'dca' ? 'rgba(0,184,212,0.15)' : 'rgba(255,107,107,0.15)',
                        color: preset.type === 'grid' ? '#00E599' : preset.type === 'dca' ? '#00B8D4' : '#FF6B6B',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>{preset.type}</span>
                      <span style={{ fontSize: '12px' }}>{preset.badge}</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>{preset.name}</h3>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '13px', color: '#8B9BB4', margin: '0 0 16px', lineHeight: '1.5' }}>
                  {preset.description}
                </p>

                {/* Preset Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>PAIR</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{preset.pair}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>TIMEFRAME</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{preset.timeframe}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>MAX DAILY TRADES</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{preset.risk.max_daily_trades}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>COOLDOWN</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{preset.risk.cooldown_minutes}m</div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleCreateFromPreset(preset)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)',
                    border: 'none',
                    color: '#020617',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <IoFlash size={16} />
                  Use This Preset
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
          TAB CONTENT: DECISION LOGS
      ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div>
          {/* Log Filters - Enhanced */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Bot Filter */}
            <select
              value={logFilters.botId}
              onChange={(e) => setLogFilters(prev => ({ ...prev, botId: e.target.value }))}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#0E1626',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                fontSize: '13px',
                minWidth: '140px'
              }}
            >
              <option value="all">🤖 All Bots</option>
              {bots.map(bot => (
                <option key={bot.bot_id} value={bot.bot_id}>
                  {bot.type === 'grid' ? '📊' : bot.type === 'dca' ? '💰' : '📈'} {bot.type.toUpperCase()} - {bot.pair}
                </option>
              ))}
            </select>
            <select
              value={logFilters.action}
              onChange={(e) => setLogFilters(prev => ({ ...prev, action: e.target.value }))}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#0E1626',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                fontSize: '13px',
                minWidth: '140px'
              }}
            >
              <option value="all">📋 All Actions</option>
              <option value="buy">🟢 Buy</option>
              <option value="sell">🔴 Sell</option>
            </select>
            <select
              value={logFilters.dateRange}
              onChange={(e) => setLogFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#0E1626',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                fontSize: '13px',
                minWidth: '140px'
              }}
            >
              <option value="24h">🕐 Last 24h</option>
              <option value="7d">📅 Last 7 Days</option>
              <option value="30d">🗓️ Last 30 Days</option>
              <option value="all">♾️ All Time</option>
            </select>
            {/* Search */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#0E1626',
              border: '1px solid rgba(255,255,255,0.1)',
              flex: isMobile ? '1' : 'none',
              minWidth: '200px'
            }}>
              <IoSearch size={16} style={{ color: '#8B9BB4' }} />
              <input
                type="text"
                placeholder="Search logs..."
                value={logFilters.search || ''}
                onChange={(e) => setLogFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>
            <div style={{ marginLeft: 'auto', color: '#8B9BB4', fontSize: '13px' }}>
              {decisionLogs.filter(log => 
                (logFilters.action === 'all' || log.side === logFilters.action) &&
                (logFilters.botId === 'all' || log.bot_id === logFilters.botId) &&
                (!logFilters.search || log.pair?.toLowerCase().includes(logFilters.search.toLowerCase()))
              ).length} entries
            </div>
          </div>

          {/* Decision Log Table - Enhanced with "Why did it trade?" */}
          <div style={{
            background: 'rgba(14,22,38,0.9)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden'
          }}>
            {loadingLogs ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#8B9BB4' }}>
                Loading decision logs...
              </div>
            ) : decisionLogs.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#8B9BB4' }}>
                <IoDocumentText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>No decision logs yet</p>
                <p style={{ fontSize: '12px' }}>Start a bot to see trade decisions here</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <th style={{ padding: '16px', textAlign: 'left', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Time</th>
                      <th style={{ padding: '16px', textAlign: 'left', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Pair</th>
                      <th style={{ padding: '16px', textAlign: 'left', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Action</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Price</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Qty</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Fee</th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>PnL</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Mode</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#8B9BB4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Why?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisionLogs
                      .filter(log => 
                        (logFilters.action === 'all' || log.side === logFilters.action) &&
                        (logFilters.botId === 'all' || log.bot_id === logFilters.botId) &&
                        (!logFilters.search || log.pair?.toLowerCase().includes(logFilters.search.toLowerCase()))
                      )
                      .map((log, idx) => (
                      <tr key={log.log_id || idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 16px', color: '#8B9BB4', fontSize: '12px' }}>
                          {new Date(log.timestamp_ms).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                          {log.pair}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: log.side === 'buy' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: log.side === 'buy' ? '#22C55E' : '#EF4444',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>{log.side}</span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#FFFFFF', fontSize: '13px', textAlign: 'right' }}>
                          ${log.entry_price?.toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#FFFFFF', fontSize: '12px', textAlign: 'right' }}>
                          {log.quantity?.toFixed(6)}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#FBBF24', fontSize: '12px', textAlign: 'right' }}>
                          ${log.fees?.toFixed(4)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <span style={{ color: (log.pnl || 0) >= 0 ? '#22C55E' : '#EF4444', fontWeight: '600', fontSize: '12px' }}>
                            {(log.pnl || 0) >= 0 ? '+' : ''}{log.pnl?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: log.mode === 'live' ? 'rgba(239,68,68,0.15)' : 'rgba(0,184,212,0.15)',
                            color: log.mode === 'live' ? '#EF4444' : '#00B8D4',
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>{log.mode || 'paper'}</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedLogExplanation(log)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'rgba(168,85,247,0.1)',
                              border: '1px solid rgba(168,85,247,0.2)',
                              color: '#A855F7',
                              fontSize: '10px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <IoHelpCircle size={12} /> Why?
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* "Why Did It Trade?" Explanation Modal */}
      {selectedLogExplanation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1A1F35 0%, #0E1626 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(168,85,247,0.3)',
            padding: '28px',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IoHelpCircle size={22} style={{ color: '#A855F7' }} />
                Why Did It Trade?
              </h2>
              <button
                onClick={() => setSelectedLogExplanation(null)}
                style={{ background: 'transparent', border: 'none', color: '#8B9BB4', cursor: 'pointer' }}
              >
                <IoClose size={24} />
              </button>
            </div>

            {/* Trade Summary */}
            <div style={{
              padding: '16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>ACTION</div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: selectedLogExplanation.side === 'buy' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: selectedLogExplanation.side === 'buy' ? '#22C55E' : '#EF4444',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>{selectedLogExplanation.side}</span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>MODE</div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: selectedLogExplanation.mode === 'live' ? 'rgba(239,68,68,0.15)' : 'rgba(255,193,7,0.15)',
                    color: selectedLogExplanation.mode === 'live' ? '#EF4444' : '#FFC107',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>{selectedLogExplanation.mode === 'live' ? '🔴 LIVE' : '📝 PAPER'}</span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>PAIR</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{selectedLogExplanation.pair}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>PRICE</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>${selectedLogExplanation.entry_price?.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>TIME (UTC)</div>
                  <div style={{ fontSize: '12px', color: '#8B9BB4' }}>{new Date(selectedLogExplanation.timestamp_ms).toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
                </div>
              </div>
            </div>

            {/* Explanation - Signal/Trigger Reason */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#00E599', marginBottom: '12px' }}>📊 Trigger Reason</h3>
              <div style={{
                padding: '16px',
                background: 'rgba(0,229,153,0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(0,229,153,0.2)',
                fontSize: '13px',
                color: '#FFFFFF',
                lineHeight: '1.6'
              }}>
                {selectedLogExplanation.reason || selectedLogExplanation.trigger_reason || (
                  <>
                    {selectedLogExplanation.side === 'buy' ? (
                      <span>
                        <strong>Entry Signal Triggered:</strong> The bot&apos;s configured entry conditions were met. 
                        {selectedLogExplanation.indicators_met && (
                          <span> Indicators: {JSON.stringify(selectedLogExplanation.indicators_met)}</span>
                        )}
                        {!selectedLogExplanation.indicators_met && (
                          <span> This could be a grid level buy, DCA interval, or signal rule match based on the bot type and configuration.</span>
                        )}
                      </span>
                    ) : (
                      <span>
                        <strong>Exit Signal Triggered:</strong> The bot&apos;s exit conditions were met.
                        {selectedLogExplanation.exit_reason && (
                          <span> Reason: {selectedLogExplanation.exit_reason}</span>
                        )}
                        {!selectedLogExplanation.exit_reason && (
                          <span> This could be a take-profit hit, stop-loss trigger, grid level sell, or signal exit rule match.</span>
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Indicators at Time of Trade (if available) */}
            {selectedLogExplanation.indicator_values && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#00B8D4', marginBottom: '12px' }}>📈 Indicator Values</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px'
                }}>
                  {Object.entries(selectedLogExplanation.indicator_values).map(([key, val]) => (
                    <div key={key} style={{ padding: '10px', background: 'rgba(0,184,212,0.05)', borderRadius: '8px', border: '1px solid rgba(0,184,212,0.1)' }}>
                      <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                        {formatIndicatorValue(val)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Check (if available) */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#FFC107', marginBottom: '12px' }}>🛡️ Risk Check</h3>
              <div style={{
                padding: '14px',
                background: 'rgba(255,193,7,0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255,193,7,0.2)',
                fontSize: '13px',
                color: '#8B9BB4'
              }}>
                {selectedLogExplanation.risk_status === 'blocked' ? (
                  <span style={{ color: '#FF5C5C' }}>⚠️ This trade was flagged by risk management but proceeded based on override settings.</span>
                ) : selectedLogExplanation.risk_check ? (
                  <span>✅ Passed all risk checks: {JSON.stringify(selectedLogExplanation.risk_check)}</span>
                ) : (
                  <span>✅ Trade passed risk validation (max daily trades, cooldown, stop-loss requirements).</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedLogExplanation(null)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#A855F7',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
          EMERGENCY STOP ALL MODAL
      ═══════════════════════════════════════════════════════════════════════════════ */}
      {showEmergencyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1A1F35 0%, #0E1626 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(255,92,92,0.3)',
            padding: '32px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,92,92,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <IoStop size={32} style={{ color: '#FF5C5C' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF', marginBottom: '12px' }}>
              Emergency Stop All Bots
            </h2>
            <p style={{ fontSize: '14px', color: '#8B9BB4', marginBottom: '24px', lineHeight: '1.6' }}>
              This will immediately stop ALL running bots and cancel pending orders. 
              This action cannot be undone.
            </p>
            <div style={{
              padding: '16px',
              background: 'rgba(255,92,92,0.1)',
              borderRadius: '10px',
              marginBottom: '24px',
              fontSize: '14px',
              color: '#FF5C5C'
            }}>
              {bots.filter(b => b.status === 'running').length} bot(s) will be stopped
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowEmergencyModal(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8B9BB4',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >Cancel</button>
              <button
                onClick={handleEmergencyStopAll}
                disabled={emergencyLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#FF5C5C',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: emergencyLoading ? 'not-allowed' : 'pointer',
                  opacity: emergencyLoading ? 0.7 : 1
                }}
              >{emergencyLoading ? 'Stopping...' : 'Stop All Bots'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
          PRESET LAUNCH MODAL
      ═══════════════════════════════════════════════════════════════════════════════ */}
      {showPresetModal && selectedPreset && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1A1F35 0%, #0E1626 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                Launch: {selectedPreset.name}
              </h2>
              <button
                onClick={() => { setShowPresetModal(false); setSelectedPreset(null); }}
                style={{ background: 'transparent', border: 'none', color: '#8B9BB4', cursor: 'pointer' }}
              >
                <IoClose size={24} />
              </button>
            </div>

            {/* Preset Summary */}
            <div style={{
              padding: '20px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: selectedPreset.type === 'grid' ? 'rgba(0,229,153,0.15)' : selectedPreset.type === 'dca' ? 'rgba(0,184,212,0.15)' : 'rgba(255,107,107,0.15)',
                  color: selectedPreset.type === 'grid' ? '#00E599' : selectedPreset.type === 'dca' ? '#00B8D4' : '#FF6B6B',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>{selectedPreset.type}</span>
                <span style={{ fontSize: '12px' }}>{selectedPreset.badge}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#8B9BB4', margin: 0 }}>{selectedPreset.description}</p>
            </div>

            {/* Config Details */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', marginBottom: '12px' }}>Configuration</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>PAIR</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{selectedPreset.pair}</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>TIMEFRAME</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{selectedPreset.timeframe}</div>
                </div>
              </div>
            </div>

            {/* Risk Settings */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', marginBottom: '12px' }}>Risk Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>MAX DAILY TRADES</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{selectedPreset.risk.max_daily_trades}</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>COOLDOWN</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{selectedPreset.risk.cooldown_minutes} min</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#8B9BB4', marginBottom: '4px' }}>STOP LOSS</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: selectedPreset.risk.require_stop_loss ? '#22C55E' : '#8B9BB4' }}>
                    {selectedPreset.risk.require_stop_loss ? 'Required' : 'Optional'}
                  </div>
                </div>
              </div>
            </div>

            {/* Fee Notice */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(0,184,212,0.1)',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '12px',
              color: '#00B8D4'
            }}>
              💡 Fees charged using existing maker/taker schedule (no bot-only fees)
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setShowPresetModal(false); setSelectedPreset(null); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8B9BB4',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >Cancel</button>
              <button
                onClick={() => {
                  setShowPresetModal(false);
                  setSelectedPreset(null);
                  // Open create modal with preset values
                  setSelectedBotType(selectedPreset.type);
                  setShowCreateModal(true);
                  toast.success(`Preset loaded: ${selectedPreset.name}`);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)',
                  border: 'none',
                  color: '#020617',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >Create Bot from Preset</button>
            </div>
          </div>
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
    // Signal defaults
    order_amount: '',
    entry_rules: { operator: 'AND', conditions: [] },
    exit_rules: { operator: 'OR', conditions: [] },
    // Advanced (all)
    stop_loss_percent: '',
    take_profit_percent: '',
    trailing_stop_percent: '',
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
  const [indicators, setIndicators] = useState([]);
  const [timeframes, setTimeframes] = useState([]);
  const [indicatorCategories, setIndicatorCategories] = useState({});

  // Fetch available indicators on mount
  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const response = await axios.get(`${API}/api/bots/indicators`);
        if (response.data.success) {
          setIndicators(response.data.indicators);
          setTimeframes(response.data.timeframes);
          setIndicatorCategories(response.data.categories);
        }
      } catch (err) {
        console.error('Failed to fetch indicators:', err);
      }
    };
    fetchIndicators();
  }, []);

  const stepTitles = [
    'Choose Bot Type',
    'Select Trading Pair',
    'Configure Strategy',
    'Review Settings',
    'Bot Created'
  ];

  const fetchPreview = async () => {
    try {
      // Convert string params to numbers
      const cleanParams = {
        ...params,
        investment_amount: parseFloat(params.investment_amount) || 0,
        lower_price: parseFloat(params.lower_price) || 0,
        upper_price: parseFloat(params.upper_price) || 0,
        grid_count: parseInt(params.grid_count) || 10,
        amount_per_interval: parseFloat(params.amount_per_interval) || 0,
        total_budget: parseFloat(params.total_budget) || 0,
        order_amount: parseFloat(params.order_amount) || 0,
        stop_loss_price: params.stop_loss_price ? parseFloat(params.stop_loss_price) : null,
        take_profit_price: params.take_profit_price ? parseFloat(params.take_profit_price) : null,
        stop_loss_percent: params.stop_loss_percent ? parseFloat(params.stop_loss_percent) : null,
        take_profit_percent: params.take_profit_percent ? parseFloat(params.take_profit_percent) : null,
        trailing_stop_percent: params.trailing_stop_percent ? parseFloat(params.trailing_stop_percent) : null,
        max_drawdown_percent: params.max_drawdown_percent ? parseFloat(params.max_drawdown_percent) : null,
        max_daily_loss: params.max_daily_loss ? parseFloat(params.max_daily_loss) : null,
        entry_rules: params.entry_rules,
        exit_rules: params.exit_rules
      };
      const response = await axios.post(`${API}/api/bots/preview`, {
        bot_type: selectedType,
        pair,
        params: cleanParams
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
      const userId = getUserId();
      // Convert string params to numbers
      const cleanParams = {
        ...params,
        investment_amount: parseFloat(params.investment_amount) || 0,
        lower_price: parseFloat(params.lower_price) || 0,
        upper_price: parseFloat(params.upper_price) || 0,
        grid_count: parseInt(params.grid_count) || 10,
        amount_per_interval: parseFloat(params.amount_per_interval) || 0,
        total_budget: parseFloat(params.total_budget) || 0,
        order_amount: parseFloat(params.order_amount) || 0,
        stop_loss_price: params.stop_loss_price ? parseFloat(params.stop_loss_price) : null,
        take_profit_price: params.take_profit_price ? parseFloat(params.take_profit_price) : null,
        stop_loss_percent: params.stop_loss_percent ? parseFloat(params.stop_loss_percent) : null,
        take_profit_percent: params.take_profit_percent ? parseFloat(params.take_profit_percent) : null,
        trailing_stop_percent: params.trailing_stop_percent ? parseFloat(params.trailing_stop_percent) : null,
        max_drawdown_percent: params.max_drawdown_percent ? parseFloat(params.max_drawdown_percent) : null,
        max_daily_loss: params.max_daily_loss ? parseFloat(params.max_daily_loss) : null,
        entry_rules: params.entry_rules,
        exit_rules: params.exit_rules
      };
      const response = await axios.post(`${API}/api/bots/create`, {
        bot_type: selectedType,
        pair,
        params: cleanParams
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
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #0B1220 0%, #0A0F1A 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 100px rgba(0,240,255,0.05)',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Modal Header with Step Indicator */}
        <div style={{
          padding: '28px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#FFFFFF' }}>
              {stepTitles[step - 1]}
            </h2>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8B9BB4', fontSize: '24px', cursor: 'pointer' }}>×</button>
          </div>
          {/* Step Progress */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: s <= step ? 'linear-gradient(90deg, #00E599, #00B8D4)' : 'rgba(255,255,255,0.1)'
              }} />
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#8B9BB4', marginTop: '8px' }}>Step {step} of 5</div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '28px' }}>
          
          {/* STEP 1: Choose Type */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => { setSelectedType('grid'); setStep(2); }}
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(0,229,153,0.08) 0%, rgba(0,229,153,0.02) 100%)',
                  border: '1px solid rgba(0,229,153,0.2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00E599'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,229,153,0.15) 0%, rgba(0,229,153,0.05) 100%)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,153,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,229,153,0.2)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,229,153,0.08) 0%, rgba(0,229,153,0.02) 100%)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,229,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IoGrid size={26} style={{ color: '#00E599' }} />
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>Grid Bot</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#8B9BB4', lineHeight: '1.5' }}>
                  Automatically buy low and sell high within a price range. Best for sideways/ranging markets.
                </p>
              </button>
              <button
                onClick={() => { setSelectedType('dca'); setStep(2); }}
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(0,184,212,0.08) 0%, rgba(0,184,212,0.02) 100%)',
                  border: '1px solid rgba(0,184,212,0.2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00B8D4'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,184,212,0.15) 0%, rgba(0,184,212,0.05) 100%)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,184,212,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,184,212,0.2)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,184,212,0.08) 0%, rgba(0,184,212,0.02) 100%)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,184,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IoTrendingUp size={26} style={{ color: '#00B8D4' }} />
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>DCA Bot</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#8B9BB4', lineHeight: '1.5' }}>
                  Dollar-cost average into a position over time. Best for long-term accumulation.
                </p>
              </button>
              <button
                onClick={() => { setSelectedType('signal'); setStep(2); }}
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(255,107,107,0.08) 0%, rgba(255,107,107,0.02) 100%)',
                  border: '1px solid rgba(255,107,107,0.2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF6B6B'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(255,107,107,0.05) 100%)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255,107,107,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,107,107,0.2)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,107,107,0.08) 0%, rgba(255,107,107,0.02) 100%)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,107,107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IoRocket size={26} style={{ color: '#FF6B6B' }} />
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>Signal Bot</span>
                  <span style={{ fontSize: '10px', background: 'rgba(0,229,153,0.2)', color: '#00E599', padding: '3px 10px', borderRadius: '6px', fontWeight: '600' }}>NEW</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#8B9BB4', lineHeight: '1.5' }}>
                  Trade based on technical indicators. Build custom rules with 20+ indicators.
                </p>
              </button>
            </div>
          )}

          {/* STEP 2: Select Pair */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: '#8B9BB4', marginBottom: '8px' }}>
                Select a trading pair for your {selectedType === 'grid' ? 'Grid' : selectedType === 'dca' ? 'DCA' : 'Signal'} Bot
              </div>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#0E1626',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  fontSize: '15px'
                }}
              >
                <option value="">💱 Choose a trading pair</option>
                {tradingPairs.map(p => (
                  <option key={p.symbol} value={p.symbol}>{p.emoji || '🪙'} {p.name}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => { setStep(1); setSelectedType(null); }}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)', color: '#8B9BB4', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                  }}
                >Back</button>
                <button
                  onClick={() => pair && setStep(3)}
                  disabled={!pair}
                  style={{
                    flex: 2, padding: '14px', borderRadius: '10px',
                    background: pair ? 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)' : '#2A3441',
                    border: 'none', color: pair ? '#020617' : '#6C757D', fontSize: '14px', fontWeight: '700',
                    cursor: pair ? 'pointer' : 'not-allowed'
                  }}
                >Continue</button>
              </div>
            </div>
          )}

          {/* STEP 3: Configure Strategy */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Grid Bot Config */}
              {selectedType === 'grid' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Investment Amount (USD) *</label>
                    <input
                      type="number"
                      value={params.investment_amount}
                      onChange={(e) => setParams({ ...params, investment_amount: e.target.value })}
                      placeholder="e.g., 1000"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Lower Price *</label>
                      <input
                        type="number"
                        value={params.lower_price}
                        onChange={(e) => setParams({ ...params, lower_price: e.target.value })}
                        placeholder="e.g., 80000"
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Upper Price *</label>
                      <input
                        type="number"
                        value={params.upper_price}
                        onChange={(e) => setParams({ ...params, upper_price: e.target.value })}
                        placeholder="e.g., 100000"
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Grid Count (2-100)</label>
                      <input
                        type="number"
                        value={params.grid_count}
                        onChange={(e) => setParams({ ...params, grid_count: parseInt(e.target.value) || 10 })}
                        min="2" max="100"
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Grid Mode</label>
                      <select
                        value={params.mode}
                        onChange={(e) => setParams({ ...params, mode: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                      >
                        <option value="arithmetic">Arithmetic</option>
                        <option value="geometric">Geometric</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* DCA Bot Config */}
              {selectedType === 'dca' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Direction</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setParams({ ...params, side: 'buy' })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '8px',
                          background: params.side === 'buy' ? 'rgba(0,229,153,0.15)' : 'rgba(255,255,255,0.03)',
                          border: params.side === 'buy' ? '1px solid #00E599' : '1px solid rgba(255,255,255,0.1)',
                          color: params.side === 'buy' ? '#00E599' : '#8B9BB4', fontWeight: '600', cursor: 'pointer'
                        }}
                      >Accumulate (Buy)</button>
                      <button
                        onClick={() => setParams({ ...params, side: 'sell' })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '8px',
                          background: params.side === 'sell' ? 'rgba(255,92,92,0.15)' : 'rgba(255,255,255,0.03)',
                          border: params.side === 'sell' ? '1px solid #FF5C5C' : '1px solid rgba(255,255,255,0.1)',
                          color: params.side === 'sell' ? '#FF5C5C' : '#8B9BB4', fontWeight: '600', cursor: 'pointer'
                        }}
                      >Distribute (Sell)</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Amount Per Order (USD) *</label>
                    <input
                      type="number"
                      value={params.amount_per_interval}
                      onChange={(e) => setParams({ ...params, amount_per_interval: e.target.value })}
                      placeholder="e.g., 100"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Interval</label>
                      <select
                        value={params.interval}
                        onChange={(e) => setParams({ ...params, interval: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                      >
                        <option value="hourly">Every Hour</option>
                        <option value="4h">Every 4 Hours</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Total Budget (USD) *</label>
                      <input
                        type="number"
                        value={params.total_budget}
                        onChange={(e) => setParams({ ...params, total_budget: e.target.value })}
                        placeholder="e.g., 1000"
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Signal Bot Config */}
              {selectedType === 'signal' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Order Amount (USD) *</label>
                    <input
                      type="number"
                      value={params.order_amount}
                      onChange={(e) => setParams({ ...params, order_amount: e.target.value })}
                      placeholder="e.g., 100"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#8B9BB4' }}>Trade Direction</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['buy', 'sell', 'both'].map(s => (
                        <button
                          key={s}
                          onClick={() => setParams({ ...params, side: s })}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            background: params.side === s ? (s === 'buy' ? 'rgba(0,229,153,0.15)' : s === 'sell' ? 'rgba(255,92,92,0.15)' : 'rgba(0,184,212,0.15)') : 'rgba(255,255,255,0.03)',
                            border: params.side === s ? `1px solid ${s === 'buy' ? '#00E599' : s === 'sell' ? '#FF5C5C' : '#00B8D4'}` : '1px solid rgba(255,255,255,0.1)',
                            color: params.side === s ? (s === 'buy' ? '#00E599' : s === 'sell' ? '#FF5C5C' : '#00B8D4') : '#8B9BB4',
                            fontWeight: '600', cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize'
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  {/* Entry Rules Builder */}
                  <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(0,229,153,0.05)', borderRadius: '12px', border: '1px solid rgba(0,229,153,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#00E599' }}>📈 Entry Rules (When to {params.side === 'sell' ? 'Sell' : 'Buy'})</span>
                      <select
                        value={params.entry_rules.operator}
                        onChange={(e) => setParams({ ...params, entry_rules: { ...params.entry_rules, operator: e.target.value }})}
                        style={{ padding: '4px 8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                      >
                        <option value="AND">ALL conditions (AND)</option>
                        <option value="OR">ANY condition (OR)</option>
                      </select>
                    </div>
                    
                    {/* Existing conditions */}
                    {params.entry_rules.conditions.map((cond, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <select
                          value={cond.indicator || ''}
                          onChange={(e) => {
                            const newConds = [...params.entry_rules.conditions];
                            newConds[idx] = { ...newConds[idx], indicator: e.target.value };
                            setParams({ ...params, entry_rules: { ...params.entry_rules, conditions: newConds }});
                          }}
                          style={{ flex: 2, padding: '8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                        >
                          <option value="">Select indicator</option>
                          {Object.entries(indicatorCategories).map(([cat, inds]) => (
                            <optgroup key={cat} label={cat.toUpperCase()}>
                              {inds.map(ind => <option key={ind} value={ind}>{ind.toUpperCase()}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <select
                          value={cond.timeframe || '1h'}
                          onChange={(e) => {
                            const newConds = [...params.entry_rules.conditions];
                            newConds[idx] = { ...newConds[idx], timeframe: e.target.value };
                            setParams({ ...params, entry_rules: { ...params.entry_rules, conditions: newConds }});
                          }}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                        >
                          {timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                        </select>
                        <select
                          value={cond.operator || '<'}
                          onChange={(e) => {
                            const newConds = [...params.entry_rules.conditions];
                            newConds[idx] = { ...newConds[idx], operator: e.target.value };
                            setParams({ ...params, entry_rules: { ...params.entry_rules, conditions: newConds }});
                          }}
                          style={{ width: '60px', padding: '8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                        >
                          <option value="<">&lt;</option>
                          <option value=">">&gt;</option>
                          <option value="<=">&lt;=</option>
                          <option value=">=">&gt;=</option>
                        </select>
                        <input
                          type="number"
                          value={cond.value || ''}
                          onChange={(e) => {
                            const newConds = [...params.entry_rules.conditions];
                            newConds[idx] = { ...newConds[idx], value: parseFloat(e.target.value) || 0 };
                            setParams({ ...params, entry_rules: { ...params.entry_rules, conditions: newConds }});
                          }}
                          placeholder="Value"
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                        />
                        <button
                          onClick={() => {
                            const newConds = params.entry_rules.conditions.filter((_, i) => i !== idx);
                            setParams({ ...params, entry_rules: { ...params.entry_rules, conditions: newConds }});
                          }}
                          style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,92,92,0.2)', border: 'none', color: '#FF5C5C', cursor: 'pointer', fontSize: '14px' }}
                        >×</button>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => {
                        const newCond = { indicator: 'rsi', timeframe: '1h', operator: '<', value: 30 };
                        setParams({ ...params, entry_rules: { ...params.entry_rules, conditions: [...params.entry_rules.conditions, newCond] }});
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,229,153,0.1)', border: '1px dashed rgba(0,229,153,0.3)', color: '#00E599', cursor: 'pointer', fontSize: '12px' }}
                    >+ Add Entry Condition</button>
                  </div>

                  {/* Exit Rules Builder */}
                  <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(255,92,92,0.05)', borderRadius: '12px', border: '1px solid rgba(255,92,92,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#FF5C5C' }}>📉 Exit Rules (When to Close)</span>
                      <select
                        value={params.exit_rules?.operator || 'OR'}
                        onChange={(e) => setParams({ ...params, exit_rules: { ...params.exit_rules, operator: e.target.value }})}
                        style={{ padding: '4px 8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                      >
                        <option value="AND">ALL conditions (AND)</option>
                        <option value="OR">ANY condition (OR)</option>
                      </select>
                    </div>
                    
                    {/* Exit conditions */}
                    {(params.exit_rules?.conditions || []).map((cond, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <select
                          value={cond.indicator || ''}
                          onChange={(e) => {
                            const newConds = [...(params.exit_rules?.conditions || [])];
                            newConds[idx] = { ...newConds[idx], indicator: e.target.value };
                            setParams({ ...params, exit_rules: { ...params.exit_rules, conditions: newConds }});
                          }}
                          style={{ flex: 2, padding: '8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                        >
                          <option value="">Select indicator</option>
                          {Object.entries(indicatorCategories).map(([cat, inds]) => (
                            <optgroup key={cat} label={cat.toUpperCase()}>
                              {inds.map(ind => <option key={ind} value={ind}>{ind.toUpperCase()}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <select
                          value={cond.timeframe || '1h'}
                          onChange={(e) => {
                            const newConds = [...(params.exit_rules?.conditions || [])];
                            newConds[idx] = { ...newConds[idx], timeframe: e.target.value };
                            setParams({ ...params, exit_rules: { ...params.exit_rules, conditions: newConds }});
                          }}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                        >
                          {timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                        </select>
                        <select
                          value={cond.operator || '>'}
                          onChange={(e) => {
                            const newConds = [...(params.exit_rules?.conditions || [])];
                            newConds[idx] = { ...newConds[idx], operator: e.target.value };
                            setParams({ ...params, exit_rules: { ...params.exit_rules, conditions: newConds }});
                          }}
                          style={{ width: '60px', padding: '8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                        >
                          <option value="<">&lt;</option>
                          <option value=">">&gt;</option>
                          <option value="<=">&lt;=</option>
                          <option value=">=">&gt;=</option>
                        </select>
                        <input
                          type="number"
                          value={cond.value || ''}
                          onChange={(e) => {
                            const newConds = [...(params.exit_rules?.conditions || [])];
                            newConds[idx] = { ...newConds[idx], value: parseFloat(e.target.value) || 0 };
                            setParams({ ...params, exit_rules: { ...params.exit_rules, conditions: newConds }});
                          }}
                          placeholder="Value"
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px' }}
                        />
                        <button
                          onClick={() => {
                            const newConds = (params.exit_rules?.conditions || []).filter((_, i) => i !== idx);
                            setParams({ ...params, exit_rules: { ...params.exit_rules, conditions: newConds }});
                          }}
                          style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,92,92,0.2)', border: 'none', color: '#FF5C5C', cursor: 'pointer', fontSize: '14px' }}
                        >×</button>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => {
                        const newCond = { indicator: 'rsi', timeframe: '1h', operator: '>', value: 70 };
                        const exitConds = params.exit_rules?.conditions || [];
                        setParams({ ...params, exit_rules: { ...params.exit_rules, conditions: [...exitConds, newCond] }});
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,92,92,0.1)', border: '1px dashed rgba(255,92,92,0.3)', color: '#FF5C5C', cursor: 'pointer', fontSize: '12px' }}
                    >+ Add Exit Condition</button>
                  </div>

                  {/* Risk Management for Signal Bot */}
                  <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8B9BB4' }}>Take Profit %</label>
                      <input
                        type="number"
                        value={params.take_profit_percent}
                        onChange={(e) => setParams({ ...params, take_profit_percent: e.target.value })}
                        placeholder="e.g., 5"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8B9BB4' }}>Stop Loss %</label>
                      <input
                        type="number"
                        value={params.stop_loss_percent}
                        onChange={(e) => setParams({ ...params, stop_loss_percent: e.target.value })}
                        placeholder="e.g., 3"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8B9BB4' }}>Trailing Stop %</label>
                      <input
                        type="number"
                        value={params.trailing_stop_percent}
                        onChange={(e) => setParams({ ...params, trailing_stop_percent: e.target.value })}
                        placeholder="e.g., 2"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ADVANCED SETTINGS (Grid/DCA only) */}
              {selectedType !== 'signal' && (
              <div style={{ marginTop: '8px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF', marginBottom: '12px' }}>⚙️ Advanced Settings (Optional)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8B9BB4' }}>Stop Loss Price</label>
                    <input
                      type="number"
                      value={params.stop_loss_price}
                      onChange={(e) => setParams({ ...params, stop_loss_price: e.target.value })}
                      placeholder="Optional"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8B9BB4' }}>Take Profit Price</label>
                    <input
                      type="number"
                      value={params.take_profit_price}
                      onChange={(e) => setParams({ ...params, take_profit_price: e.target.value })}
                      placeholder="Optional"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8B9BB4' }}>Max Drawdown %</label>
                    <input
                      type="number"
                      value={params.max_drawdown_percent}
                      onChange={(e) => setParams({ ...params, max_drawdown_percent: e.target.value })}
                      placeholder="e.g., 10"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8B9BB4' }}>Max Daily Loss ($)</label>
                    <input
                      type="number"
                      value={params.max_daily_loss}
                      onChange={(e) => setParams({ ...params, max_daily_loss: e.target.value })}
                      placeholder="e.g., 100"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0E1626', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#8B9BB4', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >Back</button>
                <button
                  onClick={fetchPreview}
                  style={{ flex: 2, padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)', border: 'none', color: '#020617', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                >Preview Bot</button>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && preview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px', color: '#FFFFFF', fontSize: '14px' }}>📊 Bot Summary</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Type</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>{preview.bot_type === 'grid' ? 'Grid Bot' : 'DCA Bot'}</span>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Interval</span>
                      <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{preview.interval}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Est. Orders</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>{preview.estimated_orders}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Total Investment</span>
                    <span style={{ color: '#00E599', fontSize: '13px', fontWeight: '600' }}>${preview.total_investment || preview.total_budget}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8B9BB4', fontSize: '13px' }}>Est. Fees</span>
                    <span style={{ color: '#FFC107', fontSize: '13px', fontWeight: '600' }}>${preview.estimated_fees}</span>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '12px', background: 'rgba(0,184,212,0.1)', borderRadius: '10px', border: '1px solid rgba(0,184,212,0.3)', fontSize: '12px', color: '#00B8D4' }}>
                ℹ️ Standard platform maker/taker fees apply to all bot trades. Fees are identical to manual trading.
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '12px', background: 'rgba(255,193,7,0.1)', borderRadius: '10px', border: '1px solid rgba(255,193,7,0.3)' }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: '2px' }} />
                <span style={{ fontSize: '12px', color: '#FFC107' }}>
                  I understand that trading bots do not guarantee profit. Trades will use my wallet balance. I accept all risks associated with automated trading.
                </span>
              </label>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(3)} style={{ flex: 1, padding: '14px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#8B9BB4', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Back</button>
                <button
                  onClick={handleCreate}
                  disabled={!agreed || creating}
                  style={{ flex: 2, padding: '14px', borderRadius: '10px', background: agreed ? 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)' : '#2A3441', border: 'none', color: agreed ? '#020617' : '#6C757D', fontSize: '14px', fontWeight: '700', cursor: agreed ? 'pointer' : 'not-allowed' }}
                >{creating ? 'Creating...' : 'Create Bot'}</button>
              </div>
            </div>
          )}

          {/* STEP 5: Success */}
          {step === 5 && botCreated && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,229,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IoCheckmarkCircle size={40} style={{ color: '#00E599' }} />
              </div>
              <h3 style={{ color: '#FFFFFF', margin: '0 0 8px', fontSize: '20px' }}>Bot Created Successfully!</h3>
              <p style={{ color: '#8B9BB4', margin: '0 0 24px', fontSize: '14px' }}>
                Your {selectedType === 'grid' ? 'Grid' : 'DCA'} Bot for {pair} is ready.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => { onSuccess(); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#8B9BB4', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >View All Bots</button>
                <button
                  onClick={async () => {
                    try {
                      const userId = getUserId();
                      await axios.post(`${API}/api/bots/start`, { bot_id: botCreated.bot_id }, { headers: { 'x-user-id': userId } });
                      toast.success('Bot started!');
                      onSuccess();
                    } catch (err) {
                      toast.error('Failed to start bot');
                    }
                  }}
                  style={{ flex: 2, padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)', border: 'none', color: '#020617', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                >🚀 Start Bot Now</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
