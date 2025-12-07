import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { IoTrendingUp, IoTrendingDown } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SpotTradingPro() {
  const navigate = useNavigate();
  
  const [tradingPairs, setTradingPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeTab, setTradeTab] = useState('buy');
  
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    high24h: 0,
    low24h: 0,
    change24h: 0
  });

  useEffect(() => {
    fetchTradingPairs();
  }, []);

  useEffect(() => {
    if (selectedPair) {
      fetchChartData();
    }
  }, [selectedPair]);

  const fetchTradingPairs = async () => {
    try {
      const response = await axios.get(`${API}/api/trading/pairs`);
      if (response.data.success) {
        setTradingPairs(response.data.pairs);
        if (response.data.pairs.length > 0) {
          const btcPair = response.data.pairs.find(p => p.symbol === 'BTC/GBP') || response.data.pairs[0];
          setSelectedPair(btcPair);
          updateMarketStats(btcPair);
        }
      }
    } catch (error) {
      console.error('Error fetching pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const pairSymbol = selectedPair.symbol.replace('/', '');
      const response = await axios.get(`${API}/api/trading/ohlcv/${pairSymbol}`, {
        params: { interval: '1h', limit: 24 }
      });
      
      if (response.data.success && response.data.data) {
        const formatted = response.data.data.map(d => ({
          time: new Date(d.time * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          price: d.close
        }));
        setChartData(formatted);
      }
    } catch (error) {
      console.error('Error fetching chart:', error);
    }
  };

  const updateMarketStats = (pair) => {
    const price = pair.price || 0;
    const change = pair.change_24h || 0;
    setMarketStats({
      lastPrice: price,
      high24h: price * 1.05,
      low24h: price * 0.95,
      change24h: change
    });
  };

  const handlePairSelect = (pair) => {
    setSelectedPair(pair);
    updateMarketStats(pair);
  };

  if (loading) {
    return <Layout><div style={{ padding: '40px', textAlign: 'center', color: '#00E1FF' }}>Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div style={{ background: '#0b0f19', minHeight: '100vh', paddingBottom: '80px' }}>
        {/* Market Stats Cards */}
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,225,255,0.1), rgba(0,193,118,0.1))',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '11px', margin: '0 0 4px 0' }}>LAST PRICE</p>
            <p style={{ color: '#00E1FF', fontSize: '18px', fontWeight: '700', margin: 0 }}>£{marketStats.lastPrice.toFixed(2)}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,193,118,0.1), rgba(22,163,74,0.1))',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '11px', margin: '0 0 4px 0' }}>24H CHANGE</p>
            <p style={{ color: marketStats.change24h >= 0 ? '#00C176' : '#FF4976', fontSize: '18px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {marketStats.change24h >= 0 ? <IoTrendingUp /> : <IoTrendingDown />}
              {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h}%
            </p>
          </div>
        </div>

        {/* Selected Pair Info */}
        <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#E5F2FF', fontSize: '20px', margin: 0 }}>{selectedPair?.symbol}</h2>
            <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '4px 0 0 0' }}>{selectedPair?.base} / {selectedPair?.quote}</p>
          </div>
        </div>

        {/* Chart */}
        <div style={{
          background: '#020817',
          border: '1px solid #1c1f26',
          borderRadius: '8px',
          margin: '0 16px 16px',
          padding: '16px',
          height: '300px'
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '10px' }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: '10px' }} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ background: '#020817', border: '1px solid #1c1f26', borderRadius: '4px', color: '#E5F2FF' }}
                formatter={(value) => [`£${value.toFixed(2)}`, 'Price']}
              />
              <Line type="monotone" dataKey="price" stroke="#00E1FF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trading Pairs List */}
        <div style={{
          background: '#020817',
          border: '1px solid #1c1f26',
          borderRadius: '8px',
          margin: '0 16px 16px',
          maxHeight: '250px',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #1c1f26' }}>
            <h3 style={{ color: '#E5F2FF', fontSize: '14px', fontWeight: '700', margin: 0 }}>Trading Pairs</h3>
          </div>
          {tradingPairs.map(pair => (
            <div
              key={pair.symbol}
              onClick={() => handlePairSelect(pair)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                background: selectedPair?.symbol === pair.symbol ? 'rgba(0,225,255,0.08)' : 'transparent',
                borderBottom: '1px solid #1c1f26',
                borderLeft: selectedPair?.symbol === pair.symbol ? '3px solid #00E1FF' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#E5F2FF', fontWeight: '600', fontSize: '13px' }}>{pair.symbol}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#00E1FF', fontSize: '13px', fontWeight: '600' }}>£{pair.price?.toFixed(2) || '0.00'}</div>
                  <div style={{ color: pair.change_24h >= 0 ? '#00C176' : '#FF4976', fontSize: '11px' }}>
                    {pair.change_24h >= 0 ? '+' : ''}{pair.change_24h}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buy/Sell Panel */}
        <div style={{
          background: '#020817',
          border: '1px solid #1c1f26',
          borderRadius: '8px',
          margin: '0 16px'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #1c1f26' }}>
            <button
              onClick={() => setTradeTab('buy')}
              style={{
                flex: 1,
                padding: '14px',
                background: tradeTab === 'buy' ? 'rgba(0,193,118,0.1)' : 'transparent',
                border: 'none',
                borderBottom: tradeTab === 'buy' ? '2px solid #00C176' : '2px solid transparent',
                color: tradeTab === 'buy' ? '#00C176' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              BUY
            </button>
            <button
              onClick={() => setTradeTab('sell')}
              style={{
                flex: 1,
                padding: '14px',
                background: tradeTab === 'sell' ? 'rgba(255,73,118,0.1)' : 'transparent',
                border: 'none',
                borderBottom: tradeTab === 'sell' ? '2px solid #FF4976' : '2px solid transparent',
                color: tradeTab === 'sell' ? '#FF4976' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              SELL
            </button>
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#9CA3AF', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Amount</label>
              <input
                type="number"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0b0f19',
                  border: `1px solid ${tradeTab === 'buy' ? 'rgba(0,193,118,0.3)' : 'rgba(255,73,118,0.3)'}`,
                  borderRadius: '6px',
                  color: '#E5F2FF',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ padding: '12px', background: '#0b0f19', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Price</span>
                <span style={{ color: '#E5F2FF', fontSize: '13px', fontWeight: '600' }}>£{marketStats.lastPrice.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Total</span>
                <span style={{ color: '#00E1FF', fontSize: '13px', fontWeight: '600' }}>£{(parseFloat(tradeAmount || 0) * marketStats.lastPrice).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => toast.success(`${tradeTab.toUpperCase()} order placed`)}
              style={{
                width: '100%',
                padding: '16px',
                background: tradeTab === 'buy' 
                  ? 'linear-gradient(135deg, #00C176, #00A85F)' 
                  : 'linear-gradient(135deg, #FF4976, #E0215E)',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: tradeTab === 'buy' 
                  ? '0 4px 20px rgba(0, 193, 118, 0.4)' 
                  : '0 4px 20px rgba(255, 73, 118, 0.4)'
              }}
            >
              {tradeTab === 'buy' ? 'BUY' : 'SELL'} {selectedPair?.base}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
