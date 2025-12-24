import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SpotTradingPro() {
  const [searchParams] = useSearchParams();
  const [isDesktop, setIsDesktop] = useState(true);
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [tradingPairs, setTradingPairs] = useState([]);
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [isLoading, setIsLoading] = useState(false);
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0, high24h: 0, low24h: 0, volume24h: 0, change24h: 0
  });

  // Breakpoint: Desktop >= 1024px, Mobile < 1024px
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Get pair from URL
  useEffect(() => {
    const pair = searchParams.get('pair');
    if (pair) setSelectedPair(pair);
  }, [searchParams]);

  // Fetch pairs
  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const res = await axios.get(`${API}/api/prices/live`);
        if (res.data.success && res.data.prices) {
          const pairs = Object.keys(res.data.prices).map(coin => ({
            symbol: `${coin}USD`, name: `${coin}/USD`, base: coin
          }));
          setTradingPairs(pairs);
        }
      } catch (e) {
        setTradingPairs(['BTC','ETH','BNB','SOL','XRP'].map(c => ({symbol:`${c}USD`,name:`${c}/USD`,base:c})));
      }
    };
    fetchPairs();
  }, []);

  // Fetch market stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const base = selectedPair.replace('USD', '');
        const res = await axios.get(`${API}/api/prices/live`);
        if (res.data.success && res.data.prices[base]) {
          const d = res.data.prices[base];
          setMarketStats({
            lastPrice: d.price || 0,
            high24h: d.high_24h || d.price * 1.02,
            low24h: d.low_24h || d.price * 0.98,
            volume24h: d.volume_24h || 0,
            change24h: d.change_24h || 0
          });
        }
      } catch (e) {}
    };
    if (selectedPair) {
      fetchStats();
      const i = setInterval(fetchStats, 30000);
      return () => clearInterval(i);
    }
  }, [selectedPair]);

  // Load TradingView
  useEffect(() => {
    if (!isDesktop) return;
    const timer = setTimeout(() => {
      const container = document.getElementById('tv-chart');
      if (!container) return;
      container.innerHTML = '';
      const base = selectedPair.replace('USD', '');
      const sym = base === 'BTC' ? 'BINANCE:BTCUSDT' : `BINANCE:${base}USDT`;
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true, symbol: sym, interval: '15', timezone: 'Etc/UTC',
        theme: 'dark', style: '1', locale: 'en', backgroundColor: '#0A0E17',
        hide_top_toolbar: false, hide_legend: false, save_image: false
      });
      const wrap = document.createElement('div');
      wrap.className = 'tradingview-widget-container';
      wrap.style.cssText = 'height:100%;width:100%';
      const inner = document.createElement('div');
      inner.className = 'tradingview-widget-container__widget';
      inner.style.cssText = 'height:100%;width:100%';
      wrap.appendChild(inner);
      wrap.appendChild(script);
      container.appendChild(wrap);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedPair, isDesktop]);

  const handleTrade = async (side) => {
    const userId = localStorage.getItem('userId');
    if (!userId) { toast.error('Please log in'); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter valid amount'); return; }
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/api/trading/place-order`, {
        user_id: userId, pair: selectedPair, type: side,
        amount: parseFloat(amount), price: marketStats.lastPrice, fee_percent: 0.1
      });
      if (res.data.success) { toast.success(`${side.toUpperCase()} executed!`); setAmount(''); }
    } catch (e) { toast.error(e.response?.data?.error || 'Trade failed'); }
    finally { setIsLoading(false); }
  };

  // =====================================================
  // DESKTOP LAYOUT (>= 1024px) - NO PAIR TABS, NO FOOTER
  // =====================================================
  if (isDesktop) {
    return (
      <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 60px)',background:'#0A0E17'}}>
        {/* TOP BAR - SINGLE PAIR TEXT + STATS */}
        <div style={{display:'flex',alignItems:'center',padding:'12px 16px',background:'#0D1421',borderBottom:'1px solid rgba(255,255,255,0.1)',gap:'24px'}}>
          <div style={{fontSize:'20px',fontWeight:'700',color:'#FFF'}}>{selectedPair.replace('USD',' / USD')}</div>
          <div style={{marginLeft:'auto',display:'flex',gap:'24px',alignItems:'center'}}>
            <span style={{fontSize:'24px',fontWeight:'700',color:'#FFF'}}>${marketStats.lastPrice.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            <div style={{display:'flex',flexDirection:'column'}}>
              <span style={{fontSize:'11px',color:'#6B7280'}}>24h Change</span>
              <span style={{fontSize:'14px',fontWeight:'600',color:marketStats.change24h>=0?'#00C853':'#FF5252'}}>{marketStats.change24h>=0?'+':''}{marketStats.change24h.toFixed(2)}%</span>
            </div>
            <div style={{display:'flex',flexDirection:'column'}}>
              <span style={{fontSize:'11px',color:'#6B7280'}}>24h High</span>
              <span style={{fontSize:'14px',fontWeight:'600',color:'#FFF'}}>${marketStats.high24h.toLocaleString()}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column'}}>
              <span style={{fontSize:'11px',color:'#6B7280'}}>24h Low</span>
              <span style={{fontSize:'14px',fontWeight:'600',color:'#FFF'}}>${marketStats.low24h.toLocaleString()}</span>
            </div>
          </div>
        </div>
        {/* MAIN GRID - CHART + TRADE PANEL */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 360px',flex:1,gap:'16px',padding:'16px',minHeight:0}}>
          <div style={{background:'#0A0E17',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',overflow:'hidden'}}>
            <div id="tv-chart" style={{width:'100%',height:'100%',minHeight:'500px'}}></div>
          </div>
          <div style={{background:'#0D1421',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',padding:'16px',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
              <button onClick={()=>setOrderType('market')} style={{flex:1,padding:'10px',background:orderType==='market'?'#1E3A5F':'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:orderType==='market'?'#00D4FF':'#8B9AAB',fontWeight:'600',cursor:'pointer'}}>Market</button>
              <button onClick={()=>setOrderType('limit')} style={{flex:1,padding:'10px',background:orderType==='limit'?'#1E3A5F':'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:orderType==='limit'?'#00D4FF':'#8B9AAB',fontWeight:'600',cursor:'pointer'}}>Limit</button>
            </div>
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'12px',color:'#6B7280',marginBottom:'8px'}}>Amount ({selectedPair.replace('USD','')})</div>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={{width:'100%',padding:'12px',background:'#0A0E17',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'#FFF',fontSize:'16px'}}/>
            </div>
            <button onClick={()=>handleTrade('buy')} disabled={isLoading} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#00C853 0%,#00E676 100%)',border:'none',borderRadius:'8px',color:'#FFF',fontSize:'16px',fontWeight:'700',cursor:'pointer',marginBottom:'12px'}}>BUY {selectedPair.replace('USD','')}</button>
            <button onClick={()=>handleTrade('sell')} disabled={isLoading} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#FF5252 0%,#FF1744 100%)',border:'none',borderRadius:'8px',color:'#FFF',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>SELL {selectedPair.replace('USD','')}</button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MOBILE LAYOUT (< 1024px) - HAS PAIR TABS, NO FOOTER
  // =====================================================
  return (
    <div style={{background:'#0A0E17',minHeight:'100vh'}}>
      {/* MOBILE PAIR TABS */}
      <div style={{display:'flex',gap:'8px',padding:'12px 16px',overflowX:'auto',background:'#0D1421',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
        {tradingPairs.slice(0,8).map(p=>(
          <button key={p.symbol} onClick={()=>setSelectedPair(p.symbol)} style={{padding:'8px 16px',background:selectedPair===p.symbol?'rgba(0,212,255,0.2)':'transparent',border:selectedPair===p.symbol?'1px solid #00D4FF':'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',color:selectedPair===p.symbol?'#00D4FF':'#8B9AAB',fontSize:'13px',fontWeight:'600',whiteSpace:'nowrap',cursor:'pointer'}}>{p.base}</button>
        ))}
      </div>
      {/* MOBILE PRICE */}
      <div style={{padding:'16px',textAlign:'center'}}>
        <div style={{fontSize:'28px',fontWeight:'700',color:'#FFF'}}>${marketStats.lastPrice.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div style={{fontSize:'14px',color:marketStats.change24h>=0?'#00C853':'#FF5252'}}>{marketStats.change24h>=0?'+':''}{marketStats.change24h.toFixed(2)}%</div>
      </div>
      {/* MOBILE BUTTONS */}
      <div style={{padding:'16px',display:'flex',gap:'12px'}}>
        <button onClick={()=>handleTrade('buy')} style={{flex:1,padding:'16px',background:'linear-gradient(135deg,#00C853 0%,#00E676 100%)',border:'none',borderRadius:'8px',color:'#FFF',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>BUY</button>
        <button onClick={()=>handleTrade('sell')} style={{flex:1,padding:'16px',background:'linear-gradient(135deg,#FF5252 0%,#FF1744 100%)',border:'none',borderRadius:'8px',color:'#FFF',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>SELL</button>
      </div>
    </div>
  );
}
