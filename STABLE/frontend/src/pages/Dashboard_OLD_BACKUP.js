import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { IoChevronDown, IoDocument } from 'react-icons/io5';
import CHXButton from '@/components/CHXButton';

// Import all widgets
import PortfolioGraph from '@/components/widgets/PortfolioGraph';
import PLSummaryRow from '@/components/widgets/PLSummaryRow';
import DonutPLWidget from '@/components/widgets/DonutPLWidget';
import AllocationWidget from '@/components/widgets/AllocationWidget';
import PieChartWidget from '@/components/widgets/PieChartWidget';
import RecentTransactionsList from '@/components/widgets/RecentTransactionsList';
import AssetTable from '@/components/widgets/AssetTable';

const API = process.env.REACT_APP_BACKEND_URL;

// Coin colors and emojis
const COIN_COLORS = {
  'BTC': '#FF8A00',
  'ETH': '#7A4CFF',
  'USDT': '#00D181',
  'BNB': '#F3BA2F',
  'SOL': '#9945FF',
  'XRP': '#23292F',
  'ADA': '#0033AD',
  'DOGE': '#C3A634',
  'LTC': '#345D9D',
  'GBP': '#00C6FF',
  'USD': '#85BB65'
};

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [spotBalance, setSpotBalance] = useState(0);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('value');
  const [portfolioData, setPortfolioData] = useState({
    todayPL: 0,
    weekPL: 0,
    monthPL: 0,
    totalPL: 0,
    plPercent: 0,
    currentValue: 0
  });

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadDashboardData(parsedUser.user_id);
  }, [navigate]);

  const loadDashboardData = async (userId) => {
    try {
      // Load portfolio summary (P/L stats)
      const summaryRes = await axios.get(`${API}/api/portfolio/summary/${userId}`);
      if (summaryRes.data.success) {
        setPortfolioData({
          todayPL: summaryRes.data.todayPL || 0,
          weekPL: summaryRes.data.weekPL || 0,
          monthPL: summaryRes.data.monthPL || 0,
          totalPL: summaryRes.data.totalPL || 0,
          plPercent: summaryRes.data.plPercent || 0,
          currentValue: summaryRes.data.current_value || 0
        });
        setTotalValue(summaryRes.data.current_value || 0);
      }

      // Load balances
      const balancesRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (balancesRes.data.success) {
        const userBalances = balancesRes.data.balances || [];
        setBalances(userBalances);
      }

      // Load allocations (spot vs savings)
      const allocRes = await axios.get(`${API}/api/portfolio/allocations/${userId}`);
      if (allocRes.data.success) {
        const spotAlloc = allocRes.data.allocations.filter(a => a.type === 'spot').reduce((sum, a) => sum + a.value, 0);
        const savingsAlloc = allocRes.data.allocations.filter(a => a.type === 'savings').reduce((sum, a) => sum + a.value, 0);
        setSpotBalance(spotAlloc);
        setSavingsBalance(savingsAlloc);
      }

      // Load transactions
      const txRes = await axios.get(`${API}/api/transactions/${userId}`);
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Silently fail - don't show error toast on initial load
    } finally {
      setLoading(false);
    }
  };

  // Prepare assets for table with sorting
  const prepareAssetsForTable = () => {
    const assets = balances.map(bal => ({
      symbol: bal.currency,
      name: bal.currency === 'BTC' ? 'Bitcoin' : bal.currency === 'ETH' ? 'Ethereum' : bal.currency === 'USDT' ? 'Tether' : bal.currency,
      holdings: bal.total_balance,
      avgBuyPrice: bal.price_gbp || 0,
      currentPrice: bal.price_gbp || 0,
      color: COIN_COLORS[bal.currency] || '#00C6FF',
      value: bal.total_balance * (bal.price_gbp || 0)
    }));

    // Apply sorting
    if (sortBy === 'value') {
      return assets.sort((a, b) => b.value - a.value);
    } else if (sortBy === 'name') {
      return assets.sort((a, b) => a.name.localeCompare(b.name));
    }
    return assets;
  };

  // Prepare assets for pie chart
  const prepareAssetsForPieChart = () => {
    return balances.map(bal => ({
      symbol: bal.currency,
      value: bal.total_balance * (bal.price_gbp || 0),
      color: COIN_COLORS[bal.currency] || '#00C6FF'
    }));
  };

  const handleDeposit = (asset) => {
    navigate(`/deposit/${asset.symbol.toLowerCase()}`, {
      state: {
        currency: asset.symbol,
        name: asset.name,
        color: asset.color
      }
    });
  };

  const handleWithdraw = (asset) => {
    navigate(`/withdraw/${asset.symbol.toLowerCase()}`, {
      state: {
        currency: asset.symbol,
        name: asset.name,
        available_balance: asset.holdings,
        color: asset.color
      }
    });
  };

  const handleSwap = (asset) => {
    navigate(`/swap-crypto?from=${asset.symbol.toLowerCase()}`, {
      state: {
        from_currency: asset.symbol,
        from_balance: asset.holdings,
        color: asset.color
      }
    });
  };

  const handleExportPDF = () => {
    toast.info('PDF export feature coming soon!');
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)' }}>
          <div style={{ fontSize: '20px', color: '#00C6FF', fontWeight: '700' }}>Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 50%, rgba(2, 6, 24, 0.98) 100%)',
        padding: '24px 20px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 0 }}>
          
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px' }}>Portfolio Overview</h1>
                <p style={{ color: '#A3AEC2', fontSize: '16px', marginBottom: 0 }}>Your complete financial dashboard</p>
              </div>
              
              {/* Export Button */}
              <CHXButton
                onClick={handleExportPDF}
                coinColor="#00C6FF"
                variant="secondary"
                size="small"
                icon={<IoDocument size={16} />}
              >
                Export PDF
              </CHXButton>
            </div>
            
            {/* Glowing Divider */}
            <div style={{ 
              height: '2px', 
              width: '100%', 
              background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 50%, transparent 100%)',
              boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)',
              margin: '20px 0'
            }} />
            
            {/* Total Value */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
              border: '2px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 0 60px rgba(0, 240, 255, 0.3), inset 0 0 40px rgba(0, 240, 255, 0.08)',
              marginBottom: '32px',
              position: 'relative'
            }}>
              <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Total Portfolio Value</div>
              <div style={{ fontSize: '42px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px' }}>£{totalValue.toFixed(2)}</div>
              <div style={{ fontSize: '16px', color: '#6EE7B7', fontWeight: '600' }}>≈ ${(totalValue * 1.27).toFixed(2)} USD</div>
            </div>
          </div>

          {/* 1. Portfolio Line Graph */}
          <PortfolioGraph totalValue={totalValue} userId={user?.user_id} />

          {/* 2. P/L Summary Row with Donut Widget */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px', 
            marginBottom: '24px'
          }}>
            <PLSummaryRow 
              todayPL={portfolioData.todayPL} 
              weekPL={portfolioData.weekPL} 
              monthPL={portfolioData.monthPL} 
            />
            <DonutPLWidget plPercent={portfolioData.plPercent} />
          </div>

          {/* Recent Transactions List */}
          <RecentTransactionsList transactions={transactions} />

          {/* 3. Spot vs Savings Allocation */}
          <AllocationWidget 
            spotBalance={spotBalance} 
            savingsBalance={savingsBalance} 
          />

          {/* 4. Portfolio Allocation Pie Chart */}
          <PieChartWidget assets={prepareAssetsForPieChart()} />

          {/* 5. Holdings List with Sort Dropdown */}
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(0, 198, 255, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Holdings List</h3>
              
              {/* Sort Dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    background: 'rgba(0, 198, 255, 0.1)',
                    border: '1px solid rgba(0, 198, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 35px 10px 14px',
                    color: '#00C6FF',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  <option value="value">Sort by Value</option>
                  <option value="name">Sort by Name</option>
                  <option value="change">Sort by 24h Change</option>
                  <option value="pl">Sort by Profit/Loss</option>
                </select>
                <IoChevronDown size={16} color="#00C6FF" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* 6. Full Asset Table */}
          <AssetTable 
            assets={prepareAssetsForTable()}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
            onSwap={handleSwap}
          />
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
