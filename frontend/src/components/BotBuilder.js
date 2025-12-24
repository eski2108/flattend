/**
 * 🤖 ADVANCED BOT BUILDER COMPONENT
 * Full-featured Signal Bot, DCA Bot, Grid Bot builder with:
 * - Indicator selection & configuration
 * - Multi-condition rule builder
 * - Risk management settings
 * - Backtest integration
 * - Paper trading toggle
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API = process.env.REACT_APP_BACKEND_URL || '';

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL BOT BUILDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SignalBotBuilder({ onSave, onCancel, initialConfig }) {
  const [indicators, setIndicators] = useState([]);
  const [timeframes, setTimeframes] = useState([]);
  const [comparators, setComparators] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Bot configuration
  const [config, setConfig] = useState({
    pair: 'BTC/USDT',
    timeframe: '1h',
    direction: 'long', // long, short, both
    orderType: 'market', // market, limit
    orderAmount: 100,
    slippageTolerance: 0.5,
    entry_rules: {
      operator: 'AND',
      conditions: []
    },
    exit_rules: {
      operator: 'OR',
      conditions: []
    },
    risk: {
      stop_loss_percent: 3,
      take_profit_percent: 5,
      trailing_stop_percent: null,
      trailing_take_profit: false,
      trailing_deviation: 0.5,
      max_daily_loss_percent: 10,
      max_drawdown_percent: 20,
      max_trades_per_day: 10,
      cooldown_minutes: 5,
      max_open_positions: 1
    },
    paper_mode: true,
    ...initialConfig
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('strategy');
  const [backtestResults, setBacktestResults] = useState(null);
  const [runningBacktest, setRunningBacktest] = useState(false);
  
  useEffect(() => {
    fetchIndicatorsAndPresets();
  }, []);
  
  const fetchIndicatorsAndPresets = async () => {
    try {
      const [indRes, presetRes] = await Promise.all([
        axios.get(`${API}/api/bots/indicators`),
        axios.get(`${API}/api/bots/presets`)
      ]);
      
      if (indRes.data.success) {
        setIndicators(indRes.data.indicators || []);
        setTimeframes(indRes.data.timeframes || []);
        setComparators(indRes.data.comparators || [
          { id: 'crosses_above', name: 'Crosses Above' },
          { id: 'crosses_below', name: 'Crosses Below' },
          { id: 'greater_than', name: '>' },
          { id: 'less_than', name: '<' },
          { id: 'equals', name: '=' },
          { id: 'rising', name: 'Rising' },
          { id: 'falling', name: 'Falling' }
        ]);
      }
      
      if (presetRes.data.success) {
        setPresets(presetRes.data.presets.filter(p => p.bot_type === 'signal'));
      }
    } catch (error) {
      console.error('Error fetching indicators:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const applyPreset = (preset) => {
    setConfig(prev => ({
      ...prev,
      entry_rules: preset.entry_rules,
      exit_rules: preset.exit_rules,
      risk: { ...prev.risk, ...preset.risk }
    }));
    toast.success(`Applied preset: ${preset.name}`);
  };
  
  const addCondition = (rulesKey) => {
    setConfig(prev => ({
      ...prev,
      [rulesKey]: {
        ...prev[rulesKey],
        conditions: [
          ...prev[rulesKey].conditions,
          {
            id: Date.now(),
            indicator: 'rsi',
            params: { period: 14 },
            comparator: 'less_than',
            value: 30
          }
        ]
      }
    }));
  };
  
  const removeCondition = (rulesKey, conditionId) => {
    setConfig(prev => ({
      ...prev,
      [rulesKey]: {
        ...prev[rulesKey],
        conditions: prev[rulesKey].conditions.filter(c => c.id !== conditionId)
      }
    }));
  };
  
  const updateCondition = (rulesKey, conditionId, field, value) => {
    setConfig(prev => ({
      ...prev,
      [rulesKey]: {
        ...prev[rulesKey],
        conditions: prev[rulesKey].conditions.map(c => 
          c.id === conditionId ? { ...c, [field]: value } : c
        )
      }
    }));
  };
  
  const runBacktest = async () => {
    setRunningBacktest(true);
    try {
      const response = await axios.post(`${API}/api/bots/backtest`, {
        bot_type: 'signal',
        pair: config.pair,
        params: {
          entry_rules: config.entry_rules,
          exit_rules: config.exit_rules,
          order_amount: config.orderAmount,
          take_profit_percent: config.risk.take_profit_percent,
          stop_loss_percent: config.risk.stop_loss_percent
        },
        initial_balance: 10000,
        fee_rate: 0.001,
        timeframe: config.timeframe
      });
      
      if (response.data.success) {
        setBacktestResults(response.data.backtest);
        toast.success('Backtest completed!');
      } else {
        toast.error(response.data.error || 'Backtest failed');
      }
    } catch (error) {
      toast.error('Backtest failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setRunningBacktest(false);
    }
  };
  
  const handleSave = () => {
    if (config.entry_rules.conditions.length === 0) {
      toast.error('Please add at least one entry condition');
      return;
    }
    onSave(config);
  };
  
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading indicators...</div>;
  }
  
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        {['strategy', 'risk', 'backtest'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1.5rem',
              background: activeTab === tab ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'transparent',
              color: activeTab === tab ? '#000' : '#888',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'strategy' ? '📊 Strategy Builder' : tab === 'risk' ? '🛡️ Risk Management' : '📈 Backtest'}
          </button>
        ))}
      </div>
      
      {/* Strategy Tab */}
      {activeTab === 'strategy' && (
        <div>
          {/* Presets */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '0.5rem', fontWeight: '600' }}>QUICK PRESETS</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(0,240,255,0.1)',
                    border: '1px solid rgba(0,240,255,0.3)',
                    borderRadius: '8px',
                    color: '#00F0FF',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Basic Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>PAIR</label>
              <select
                value={config.pair}
                onChange={(e) => setConfig(prev => ({ ...prev, pair: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              >
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="BTC/GBP">BTC/GBP</option>
                <option value="ETH/GBP">ETH/GBP</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>TIMEFRAME</label>
              <select
                value={config.timeframe}
                onChange={(e) => setConfig(prev => ({ ...prev, timeframe: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              >
                {timeframes.map(tf => (
                  <option key={tf.id} value={tf.id}>{tf.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>DIRECTION</label>
              <select
                value={config.direction}
                onChange={(e) => setConfig(prev => ({ ...prev, direction: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              >
                <option value="long">Long Only</option>
                <option value="short">Short Only</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>ORDER SIZE (£)</label>
              <input
                type="number"
                value={config.orderAmount}
                onChange={(e) => setConfig(prev => ({ ...prev, orderAmount: parseFloat(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              />
            </div>
          </div>
          
          {/* Entry Rules */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(34,197,94,0.05)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: '#22C55E', fontSize: '14px' }}>📈 ENTRY CONDITIONS</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={config.entry_rules.operator}
                  onChange={(e) => setConfig(prev => ({ ...prev, entry_rules: { ...prev.entry_rules, operator: e.target.value } }))}
                  style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                >
                  <option value="AND">ALL (AND)</option>
                  <option value="OR">ANY (OR)</option>
                </select>
                <button
                  onClick={() => addCondition('entry_rules')}
                  style={{ padding: '0.25rem 0.75rem', background: '#22C55E', border: 'none', borderRadius: '4px', color: '#000', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}
                >
                  + Add
                </button>
              </div>
            </div>
            {config.entry_rules.conditions.length === 0 ? (
              <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>No entry conditions. Click "+ Add" to create one.</div>
            ) : (
              config.entry_rules.conditions.map((cond, idx) => (
                <ConditionRow
                  key={cond.id}
                  condition={cond}
                  indicators={indicators}
                  comparators={comparators}
                  onUpdate={(field, value) => updateCondition('entry_rules', cond.id, field, value)}
                  onRemove={() => removeCondition('entry_rules', cond.id)}
                  showOperator={idx > 0}
                  operator={config.entry_rules.operator}
                />
              ))
            )}
          </div>
          
          {/* Exit Rules */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: '#EF4444', fontSize: '14px' }}>📉 EXIT CONDITIONS</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={config.exit_rules.operator}
                  onChange={(e) => setConfig(prev => ({ ...prev, exit_rules: { ...prev.exit_rules, operator: e.target.value } }))}
                  style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                >
                  <option value="AND">ALL (AND)</option>
                  <option value="OR">ANY (OR)</option>
                </select>
                <button
                  onClick={() => addCondition('exit_rules')}
                  style={{ padding: '0.25rem 0.75rem', background: '#EF4444', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}
                >
                  + Add
                </button>
              </div>
            </div>
            {config.exit_rules.conditions.length === 0 ? (
              <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>No exit conditions (will use TP/SL from Risk tab).</div>
            ) : (
              config.exit_rules.conditions.map((cond, idx) => (
                <ConditionRow
                  key={cond.id}
                  condition={cond}
                  indicators={indicators}
                  comparators={comparators}
                  onUpdate={(field, value) => updateCondition('exit_rules', cond.id, field, value)}
                  onRemove={() => removeCondition('exit_rules', cond.id)}
                  showOperator={idx > 0}
                  operator={config.exit_rules.operator}
                />
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Risk Tab */}
      {activeTab === 'risk' && (
        <div>
          <RiskManagementPanel
            config={config.risk}
            onChange={(newRisk) => setConfig(prev => ({ ...prev, risk: newRisk }))}
          />
        </div>
      )}
      
      {/* Backtest Tab */}
      {activeTab === 'backtest' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={runBacktest}
              disabled={runningBacktest || config.entry_rules.conditions.length === 0}
              style={{
                padding: '0.75rem 2rem',
                background: runningBacktest ? '#666' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '8px',
                color: runningBacktest ? '#999' : '#000',
                fontWeight: '700',
                cursor: runningBacktest ? 'not-allowed' : 'pointer'
              }}
            >
              {runningBacktest ? 'Running Backtest...' : '🚀 Run Backtest'}
            </button>
            <span style={{ marginLeft: '1rem', color: '#888', fontSize: '12px' }}>Tests your strategy on historical data</span>
          </div>
          
          {backtestResults && (
            <BacktestResultsPanel results={backtestResults} />
          )}
        </div>
      )}
      
      {/* Paper Mode Toggle */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.1)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '700', color: '#F59E0B' }}>📝 Paper Trading Mode</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Run bot without real orders to test your strategy</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.paper_mode}
            onChange={(e) => setConfig(prev => ({ ...prev, paper_mode: e.target.checked }))}
            style={{ width: '20px', height: '20px' }}
          />
          <span style={{ color: config.paper_mode ? '#22C55E' : '#888' }}>{config.paper_mode ? 'ON' : 'OFF'}</span>
        </label>
      </div>
      
      {/* Action Buttons */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{ padding: '0.75rem 2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#888', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
        >
          ✓ Save Bot Configuration
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONDITION ROW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function ConditionRow({ condition, indicators, comparators, onUpdate, onRemove, showOperator, operator }) {
  const selectedIndicator = indicators.find(i => i.id === condition.indicator) || {};
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
      {showOperator && (
        <span style={{ color: '#A855F7', fontWeight: '700', fontSize: '11px', minWidth: '35px' }}>{operator}</span>
      )}
      
      {/* Indicator */}
      <select
        value={condition.indicator}
        onChange={(e) => onUpdate('indicator', e.target.value)}
        style={{ padding: '0.4rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
      >
        <optgroup label="Momentum">
          {indicators.filter(i => i.type === 'momentum' || i.id === 'rsi' || i.id === 'macd' || i.id === 'stochastic').map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </optgroup>
        <optgroup label="Trend">
          {indicators.filter(i => i.type === 'trend' || i.id === 'ema' || i.id === 'sma').map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </optgroup>
        <optgroup label="Volatility">
          {indicators.filter(i => i.type === 'volatility' || i.id === 'bollinger' || i.id === 'atr').map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </optgroup>
      </select>
      
      {/* Period param if applicable */}
      {(selectedIndicator.params || []).includes('period') && (
        <input
          type="number"
          value={condition.params?.period || 14}
          onChange={(e) => onUpdate('params', { ...condition.params, period: parseInt(e.target.value) || 14 })}
          placeholder="Period"
          style={{ width: '60px', padding: '0.4rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
        />
      )}
      
      {/* Comparator */}
      <select
        value={condition.comparator}
        onChange={(e) => onUpdate('comparator', e.target.value)}
        style={{ padding: '0.4rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#00F0FF', fontSize: '11px' }}
      >
        {comparators.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      
      {/* Value */}
      <input
        type="number"
        value={condition.value || ''}
        onChange={(e) => onUpdate('value', parseFloat(e.target.value) || 0)}
        placeholder="Value"
        style={{ width: '70px', padding: '0.4rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
      />
      
      {/* Remove */}
      <button
        onClick={onRemove}
        style={{ padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '4px', color: '#EF4444', cursor: 'pointer', fontSize: '11px' }}
      >
        ✕
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK MANAGEMENT PANEL
// ═══════════════════════════════════════════════════════════════════════════════

export function RiskManagementPanel({ config, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...config, [field]: value });
  };
  
  return (
    <div>
      <h4 style={{ color: '#fff', marginBottom: '1rem' }}>🛡️ Risk Management Settings</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Stop Loss */}
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
          <label style={{ display: 'block', color: '#EF4444', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>STOP LOSS %</label>
          <input
            type="number"
            value={config.stop_loss_percent || ''}
            onChange={(e) => updateField('stop_loss_percent', parseFloat(e.target.value) || null)}
            placeholder="e.g. 3"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        
        {/* Take Profit */}
        <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.05)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
          <label style={{ display: 'block', color: '#22C55E', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>TAKE PROFIT %</label>
          <input
            type="number"
            value={config.take_profit_percent || ''}
            onChange={(e) => updateField('take_profit_percent', parseFloat(e.target.value) || null)}
            placeholder="e.g. 5"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        
        {/* Trailing Stop */}
        <div style={{ padding: '1rem', background: 'rgba(168,85,247,0.05)', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.2)' }}>
          <label style={{ display: 'block', color: '#A855F7', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>TRAILING STOP %</label>
          <input
            type="number"
            value={config.trailing_stop_percent || ''}
            onChange={(e) => updateField('trailing_stop_percent', parseFloat(e.target.value) || null)}
            placeholder="Optional"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
      </div>
      
      {/* Daily Limits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>MAX DAILY LOSS %</label>
          <input
            type="number"
            value={config.max_daily_loss_percent || ''}
            onChange={(e) => updateField('max_daily_loss_percent', parseFloat(e.target.value) || null)}
            placeholder="e.g. 10"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>MAX DRAWDOWN % (KILL-SWITCH)</label>
          <input
            type="number"
            value={config.max_drawdown_percent || ''}
            onChange={(e) => updateField('max_drawdown_percent', parseFloat(e.target.value) || null)}
            placeholder="e.g. 20"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>MAX TRADES PER DAY</label>
          <input
            type="number"
            value={config.max_trades_per_day || ''}
            onChange={(e) => updateField('max_trades_per_day', parseInt(e.target.value) || null)}
            placeholder="e.g. 10"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
      </div>
      
      {/* Cooldown & Positions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>COOLDOWN BETWEEN TRADES (MIN)</label>
          <input
            type="number"
            value={config.cooldown_minutes || ''}
            onChange={(e) => updateField('cooldown_minutes', parseInt(e.target.value) || 0)}
            placeholder="e.g. 5"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>MAX OPEN POSITIONS</label>
          <input
            type="number"
            value={config.max_open_positions || ''}
            onChange={(e) => updateField('max_open_positions', parseInt(e.target.value) || 1)}
            placeholder="e.g. 1"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
      </div>
      
      {/* Circuit Breaker */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#F59E0B', fontWeight: '700', fontSize: '13px' }}>⚡ Circuit Breaker</div>
            <div style={{ color: '#888', fontSize: '11px' }}>Pause bot on API errors or extreme price moves</div>
          </div>
          <input
            type="checkbox"
            checked={config.circuit_breaker_enabled !== false}
            onChange={(e) => updateField('circuit_breaker_enabled', e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKTEST RESULTS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

export function BacktestResultsPanel({ results }) {
  if (!results) return null;
  
  return (
    <div style={{ padding: '1.5rem', background: 'rgba(0,240,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,240,255,0.2)' }}>
      <h4 style={{ color: '#00F0FF', marginBottom: '1rem' }}>📊 Backtest Results</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: results.total_return >= 0 ? '#22C55E' : '#EF4444' }}>
            {results.total_return?.toFixed(2)}%
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>Total Return</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
            {results.win_rate?.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>Win Rate</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#EF4444' }}>
            {results.max_drawdown?.toFixed(2)}%
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>Max Drawdown</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#A855F7' }}>
            {results.trade_count}
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>Trade Count</div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div>
          <span style={{ color: '#888', fontSize: '12px' }}>Initial Balance: </span>
          <span style={{ color: '#fff', fontWeight: '700' }}>£{results.initial_balance?.toLocaleString()}</span>
        </div>
        <div>
          <span style={{ color: '#888', fontSize: '12px' }}>Final Balance: </span>
          <span style={{ color: results.final_balance >= results.initial_balance ? '#22C55E' : '#EF4444', fontWeight: '700' }}>
            £{results.final_balance?.toLocaleString()}
          </span>
        </div>
        <div>
          <span style={{ color: '#888', fontSize: '12px' }}>Total Fees: </span>
          <span style={{ color: '#F59E0B', fontWeight: '700' }}>£{results.total_fees?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DCA BOT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function DCABotBuilder({ onSave, onCancel, initialConfig }) {
  const [presets, setPresets] = useState([]);
  const [config, setConfig] = useState({
    pair: 'BTC/USDT',
    base_order_size: 100,
    safety_order_size: 50,
    safety_order_step_percent: 2,
    safety_order_step_scale: 1.0,
    safety_order_volume_scale: 1.5,
    max_safety_orders: 5,
    take_profit_percent: 3,
    take_profit_type: 'average',
    trailing_take_profit: false,
    trailing_deviation: 0.5,
    stop_loss_percent: null,
    max_duration_hours: null,
    reentry_wait_minutes: 60,
    paper_mode: true,
    ...initialConfig
  });
  
  useEffect(() => {
    axios.get(`${API}/api/bots/presets`).then(res => {
      if (res.data.success) {
        setPresets(res.data.presets.filter(p => p.bot_type === 'dca'));
      }
    });
  }, []);
  
  const applyPreset = (preset) => {
    setConfig(prev => ({ ...prev, ...preset.params }));
    toast.success(`Applied preset: ${preset.name}`);
  };
  
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Presets */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '0.5rem', fontWeight: '600' }}>QUICK PRESETS</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(0,240,255,0.1)',
                border: '1px solid rgba(0,240,255,0.3)',
                borderRadius: '8px',
                color: '#00F0FF',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Pair Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>TRADING PAIR</label>
        <select
          value={config.pair}
          onChange={(e) => setConfig(prev => ({ ...prev, pair: e.target.value }))}
          style={{ width: '200px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
        >
          <option value="BTC/USDT">BTC/USDT</option>
          <option value="ETH/USDT">ETH/USDT</option>
          <option value="BTC/GBP">BTC/GBP</option>
        </select>
      </div>
      
      {/* Order Sizes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', color: '#22C55E', fontSize: '11px', marginBottom: '0.25rem', fontWeight: '700' }}>BASE ORDER SIZE (£)</label>
          <input
            type="number"
            value={config.base_order_size}
            onChange={(e) => setConfig(prev => ({ ...prev, base_order_size: parseFloat(e.target.value) || 0 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#fff' }}
          />
          <div style={{ fontSize: '10px', color: '#888', marginTop: '0.25rem' }}>Initial purchase amount</div>
        </div>
        <div>
          <label style={{ display: 'block', color: '#A855F7', fontSize: '11px', marginBottom: '0.25rem', fontWeight: '700' }}>SAFETY ORDER SIZE (£)</label>
          <input
            type="number"
            value={config.safety_order_size}
            onChange={(e) => setConfig(prev => ({ ...prev, safety_order_size: parseFloat(e.target.value) || 0 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '6px', color: '#fff' }}
          />
          <div style={{ fontSize: '10px', color: '#888', marginTop: '0.25rem' }}>Size of DCA buys when price drops</div>
        </div>
      </div>
      
      {/* Safety Order Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>PRICE DROP STEP %</label>
          <input
            type="number"
            step="0.1"
            value={config.safety_order_step_percent}
            onChange={(e) => setConfig(prev => ({ ...prev, safety_order_step_percent: parseFloat(e.target.value) || 0 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>STEP SCALE</label>
          <input
            type="number"
            step="0.1"
            value={config.safety_order_step_scale}
            onChange={(e) => setConfig(prev => ({ ...prev, safety_order_step_scale: parseFloat(e.target.value) || 1 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>VOLUME SCALE</label>
          <input
            type="number"
            step="0.1"
            value={config.safety_order_volume_scale}
            onChange={(e) => setConfig(prev => ({ ...prev, safety_order_volume_scale: parseFloat(e.target.value) || 1 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>MAX SAFETY ORDERS</label>
          <input
            type="number"
            value={config.max_safety_orders}
            onChange={(e) => setConfig(prev => ({ ...prev, max_safety_orders: parseInt(e.target.value) || 0 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
      </div>
      
      {/* Take Profit */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', color: '#22C55E', fontSize: '11px', marginBottom: '0.25rem', fontWeight: '700' }}>TAKE PROFIT %</label>
          <input
            type="number"
            step="0.1"
            value={config.take_profit_percent}
            onChange={(e) => setConfig(prev => ({ ...prev, take_profit_percent: parseFloat(e.target.value) || 0 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>TP FROM</label>
          <select
            value={config.take_profit_type}
            onChange={(e) => setConfig(prev => ({ ...prev, take_profit_type: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          >
            <option value="average">Average Entry</option>
            <option value="base">Base Order Price</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#EF4444', fontSize: '11px', marginBottom: '0.25rem', fontWeight: '700' }}>STOP LOSS % (Optional)</label>
          <input
            type="number"
            step="0.1"
            value={config.stop_loss_percent || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, stop_loss_percent: parseFloat(e.target.value) || null }))}
            placeholder="None"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
      </div>
      
      {/* Trailing TP */}
      <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.05)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div>
            <span style={{ color: '#22C55E', fontWeight: '700' }}>Trailing Take Profit</span>
            <div style={{ fontSize: '11px', color: '#888' }}>Follow price up after TP target is hit</div>
          </div>
          <input
            type="checkbox"
            checked={config.trailing_take_profit}
            onChange={(e) => setConfig(prev => ({ ...prev, trailing_take_profit: e.target.checked }))}
            style={{ width: '20px', height: '20px' }}
          />
        </div>
        {config.trailing_take_profit && (
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>TRAILING DEVIATION %</label>
            <input
              type="number"
              step="0.1"
              value={config.trailing_deviation}
              onChange={(e) => setConfig(prev => ({ ...prev, trailing_deviation: parseFloat(e.target.value) || 0.5 }))}
              style={{ width: '120px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
            />
          </div>
        )}
      </div>
      
      {/* Paper Mode */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '700', color: '#F59E0B' }}>📝 Paper Trading Mode</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Test without real orders</div>
        </div>
        <input
          type="checkbox"
          checked={config.paper_mode}
          onChange={(e) => setConfig(prev => ({ ...prev, paper_mode: e.target.checked }))}
          style={{ width: '20px', height: '20px' }}
        />
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '0.75rem 2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#888', cursor: 'pointer' }}>Cancel</button>
        <button onClick={() => onSave(config)} style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>✓ Save DCA Bot</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRID BOT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function GridBotBuilder({ onSave, onCancel, initialConfig }) {
  const [presets, setPresets] = useState([]);
  const [config, setConfig] = useState({
    pair: 'BTC/USDT',
    lower_price: null,
    upper_price: null,
    grid_count: 10,
    mode: 'arithmetic',
    investment_amount: 1000,
    amount_per_grid: null,
    rebalance_enabled: false,
    take_profit_percent: null,
    stop_loss_percent: null,
    auto_adjust_range: false,
    paper_mode: true,
    ...initialConfig
  });
  
  useEffect(() => {
    axios.get(`${API}/api/bots/presets`).then(res => {
      if (res.data.success) {
        setPresets(res.data.presets.filter(p => p.bot_type === 'grid'));
      }
    });
  }, []);
  
  const gridLevels = config.lower_price && config.upper_price && config.grid_count > 0
    ? Array.from({ length: config.grid_count }, (_, i) => {
        if (config.mode === 'arithmetic') {
          const step = (config.upper_price - config.lower_price) / (config.grid_count - 1);
          return config.lower_price + step * i;
        } else {
          const ratio = Math.pow(config.upper_price / config.lower_price, 1 / (config.grid_count - 1));
          return config.lower_price * Math.pow(ratio, i);
        }
      })
    : [];
  
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Presets */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '0.5rem', fontWeight: '600' }}>QUICK PRESETS</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => setConfig(prev => ({ ...prev, ...preset.params }))}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(0,240,255,0.1)',
                border: '1px solid rgba(0,240,255,0.3)',
                borderRadius: '8px',
                color: '#00F0FF',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Pair */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>TRADING PAIR</label>
        <select
          value={config.pair}
          onChange={(e) => setConfig(prev => ({ ...prev, pair: e.target.value }))}
          style={{ width: '200px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
        >
          <option value="BTC/USDT">BTC/USDT</option>
          <option value="ETH/USDT">ETH/USDT</option>
        </select>
      </div>
      
      {/* Price Range */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', color: '#EF4444', fontSize: '11px', marginBottom: '0.25rem', fontWeight: '700' }}>LOWER PRICE</label>
          <input
            type="number"
            value={config.lower_price || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, lower_price: parseFloat(e.target.value) || null }))}
            placeholder="Min price"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#22C55E', fontSize: '11px', marginBottom: '0.25rem', fontWeight: '700' }}>UPPER PRICE</label>
          <input
            type="number"
            value={config.upper_price || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, upper_price: parseFloat(e.target.value) || null }))}
            placeholder="Max price"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#00F0FF', fontSize: '11px', marginBottom: '0.25rem', fontWeight: '700' }}>GRID LEVELS</label>
          <input
            type="number"
            value={config.grid_count}
            onChange={(e) => setConfig(prev => ({ ...prev, grid_count: parseInt(e.target.value) || 5 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
      </div>
      
      {/* Grid Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>SPACING MODE</label>
          <select
            value={config.mode}
            onChange={(e) => setConfig(prev => ({ ...prev, mode: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          >
            <option value="arithmetic">Arithmetic (Equal $ spacing)</option>
            <option value="geometric">Geometric (Equal % spacing)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>TOTAL INVESTMENT (£)</label>
          <input
            type="number"
            value={config.investment_amount}
            onChange={(e) => setConfig(prev => ({ ...prev, investment_amount: parseFloat(e.target.value) || 0 }))}
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
      </div>
      
      {/* Grid Preview */}
      {gridLevels.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,240,255,0.05)', borderRadius: '8px', border: '1px solid rgba(0,240,255,0.2)' }}>
          <div style={{ color: '#00F0FF', fontWeight: '700', marginBottom: '0.5rem' }}>Grid Preview ({gridLevels.length} levels)</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {gridLevels.map((price, i) => (
              <span key={i} style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '11px', color: '#888' }}>
                £{price.toFixed(2)}
              </span>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '0.5rem' }}>
            Amount per grid: £{(config.investment_amount / gridLevels.length).toFixed(2)}
          </div>
        </div>
      )}
      
      {/* TP/SL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', color: '#22C55E', fontSize: '11px', marginBottom: '0.25rem' }}>TAKE PROFIT % (Whole Grid)</label>
          <input
            type="number"
            value={config.take_profit_percent || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, take_profit_percent: parseFloat(e.target.value) || null }))}
            placeholder="Optional"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#EF4444', fontSize: '11px', marginBottom: '0.25rem' }}>STOP LOSS % (Whole Grid)</label>
          <input
            type="number"
            value={config.stop_loss_percent || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, stop_loss_percent: parseFloat(e.target.value) || null }))}
            placeholder="Optional"
            style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#fff' }}
          />
        </div>
      </div>
      
      {/* Options */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.rebalance_enabled}
            onChange={(e) => setConfig(prev => ({ ...prev, rebalance_enabled: e.target.checked }))}
          />
          <span style={{ color: '#888', fontSize: '12px' }}>Auto-rebalance when price exits range</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.paper_mode}
            onChange={(e) => setConfig(prev => ({ ...prev, paper_mode: e.target.checked }))}
          />
          <span style={{ color: '#F59E0B', fontSize: '12px' }}>📝 Paper Trading Mode</span>
        </label>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '0.75rem 2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#888', cursor: 'pointer' }}>Cancel</button>
        <button 
          onClick={() => {
            if (!config.lower_price || !config.upper_price) {
              toast.error('Please set price range');
              return;
            }
            onSave(config);
          }} 
          style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
        >
          ✓ Save Grid Bot
        </button>
      </div>
    </div>
  );
}

export default { SignalBotBuilder, DCABotBuilder, GridBotBuilder, RiskManagementPanel, BacktestResultsPanel };
