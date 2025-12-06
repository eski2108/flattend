import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DollarSign, IoCash, IoTrendingDown, IoTrendingUp, PieChart } from 'react-icons/io5';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
const API = 'https://coinhubx.net/api';

// API already defined

export default function PortfolioPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalPL, setTotalPL] = useState(0);
  const [totalPLPercent, setTotalPLPercent] = useState(0);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(userData);
      const userId = user.user_id;

      // Use unified wallet portfolio endpoint (with aggressive cache busting)
      const response = await axios.get(`${API}/api/wallets/portfolio/${userId}?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.data.success) {
        const value = response.data.total_value_usd || 0;
        console.log('🔍 Portfolio API Response:', {
          total_value_usd: value,
          timestamp: new Date().toISOString(),
          url: response.config.url
        });
        console.log(`💰 PORTFOLIO PAGE VALUE: £${value.toFixed(2)}`);
        // Transform the backend response to match frontend expectations
        const transformedAllocations = response.data.allocations.map(alloc => ({
          currency: alloc.currency,
          wallet_amount: alloc.balance || 0,
          savings_amount: 0, // Not tracked separately in new system
          total_amount: alloc.balance || 0,
          avg_buy_price: alloc.price || 0,
          current_price: alloc.price || 0,
          current_value_usd: alloc.value || 0,
          unrealized_pl_usd: 0, // Not tracked in new system
          unrealized_pl_percent: 0 // Not tracked in new system
        }));
        
        setPortfolio(transformedAllocations);
        setTotalValue(response.data.total_value_usd || 0);
        // Portfolio doesn't track invested/PL anymore - just current value
        setTotalInvested(response.data.total_value_usd || 0);
        setTotalPL(0);
        setTotalPLPercent(0);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setLoading(false);
    }
  };

  const isProfit = totalPL >= 0;

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', background: '#0B0E13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#FFF' }}>Loading portfolio...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: '#0B0E13', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#FFF', marginBottom: '0.5rem' }}>
            Portfolio Overview
          </h1>
          <p style={{ color: '#A8A8A8' }}>
            Track your investment performance across Spot and Savings
          </p>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Total Value */}
          <div style={{
            background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
            border: '2px solid #00E0FF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <IoCash size={20} style={{ color: '#00E0FF' }} />
              <div style={{ fontSize: '0.875rem', color: '#A8A8A8', textTransform: 'uppercase' }}>
                Total Value
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#00F6FF' }}>
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Total Invested */}
          <div style={{
            background: '#11141A',
            border: '1px solid rgba(0, 224, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#A8A8A8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Total Invested
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#FFF' }}>
              ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Total P/L */}
          <div style={{
            background: isProfit ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `2px solid ${isProfit ? '#22C55E' : '#EF4444'}`,
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {isProfit ? <IoTrendingUp size={20} style={{ color: '#22C55E' }} /> : <IoTrendingDown size={20} style={{ color: '#EF4444' }} />}
              <div style={{ fontSize: '0.875rem', color: '#A8A8A8', textTransform: 'uppercase' }}>
                Total P/L
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: isProfit ? '#22C55E' : '#EF4444' }}>
              {isProfit ? '+' : ''}${totalPL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '700', color: isProfit ? '#22C55E' : '#EF4444' }}>
              {isProfit ? '+' : ''}{totalPLPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Portfolio Holdings */}
        <div style={{
          background: '#11141A',
          border: '1px solid rgba(0, 224, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFF', marginBottom: '1.5rem' }}>
            Holdings
          </h2>

          {portfolio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#A8A8A8' }}>
              No holdings yet. Start by depositing crypto or transferring to Savings.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0, 224, 255, 0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', color: '#A8A8A8', fontWeight: '600' }}>Asset</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.875rem', color: '#A8A8A8', fontWeight: '600' }}>Spot</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.875rem', color: '#A8A8A8', fontWeight: '600' }}>Savings</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.875rem', color: '#A8A8A8', fontWeight: '600' }}>Total</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.875rem', color: '#A8A8A8', fontWeight: '600' }}>Avg Price</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.875rem', color: '#A8A8A8', fontWeight: '600' }}>Current Price</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.875rem', color: '#A8A8A8', fontWeight: '600' }}>Value</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.875rem', color: '#A8A8A8', fontWeight: '600' }}>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((holding, index) => {
                    const isProfitable = holding.unrealized_pl_usd >= 0;
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#FFF' }}>{holding.currency}</div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#FFF' }}>
                          {holding.wallet_amount?.toFixed(8)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#FFF' }}>
                          {holding.savings_amount?.toFixed(8)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#00F6FF', fontWeight: '700' }}>
                          {holding.total_amount?.toFixed(8)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#A8A8A8' }}>
                          ${holding.avg_buy_price?.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#FFF' }}>
                          ${holding.current_price?.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#FFF', fontWeight: '700' }}>
                          ${holding.current_value_usd?.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: isProfitable ? '#22C55E' : '#EF4444' }}>
                            {isProfitable ? '+' : ''}${holding.unrealized_pl_usd?.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isProfitable ? '#22C55E' : '#EF4444' }}>
                            {isProfitable ? '+' : ''}{holding.unrealized_pl_percent?.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </Layout>
  );
}
