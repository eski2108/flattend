import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { FileText, ChevronDown } from 'lucide-react';
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
      // Load balances
      const balancesRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (balancesRes.data.success) {
        const userBalances = balancesRes.data.balances || [];
        setBalances(userBalances);
        
        // Calculate total value
        const total = userBalances.reduce((sum, bal) => {
          return sum + (bal.total_balance * (bal.price_gbp || 0));
        }, 0);
        setTotalValue(total);
        
        // Calculate spot balance (all balances are spot for now)
        setSpotBalance(total);
        setSavingsBalance(0); // TODO: Get from savings API
      }

      // Load transactions
      const txRes = await axios.get(`${API}/api/transactions/${userId}`);
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
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

    // Sort assets
    if (sortBy === 'name') {
      return assets.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'value') {
      return assets.sort((a, b) => b.value - a.value);
    } else if (sortBy === 'change') {
      return assets.sort((a, b) => Math.random() - 0.5); // Mock for now
    } else if (sortBy === 'pl') {
      return assets.sort((a, b) => Math.random() - 0.5); // Mock for now
    }
    return assets;
  };

  const handleExportPDF = () => {
    toast.success('Portfolio export feature coming soon!');
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
        background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)',
        padding: '24px 20px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 8px' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '30px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px', lineHeight: '1.2' }}>Portfolio Overview</h1>
            <p style={{ color: '#A3AEC2', fontSize: '17px', marginBottom: '12px', lineHeight: '1.4' }}>Your complete financial dashboard</p>
            
            {/* Total Value */}
            <div style={{
              background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
              border: '1px solid rgba(0, 198, 255, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 0 25px rgba(0, 198, 255, 0.2)',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '15px', color: '#8F9BB3', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Total Portfolio Value</div>
              <div style={{ fontSize: '42px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>£{totalValue.toFixed(2)}</div>
              <div style={{ fontSize: '16px', color: '#6EE7B7', fontWeight: '600' }}>≈ ${(totalValue * 1.27).toFixed(2)} USD</div>
            </div>
          </div>

          {/* 1. Portfolio Line Graph */}
          <PortfolioGraph data={null} totalValue={totalValue} />

          {/* 2. P/L Summary Row */}
          <PLSummaryRow 
            todayPL={150.50} 
            weekPL={520.75} 
            monthPL={1250.30} 
          />

          {/* 3. Spot vs Savings Allocation */}
          <AllocationWidget 
            spotBalance={spotBalance} 
            savingsBalance={savingsBalance} 
          />

          {/* 4. Portfolio Allocation Pie Chart */}
          <PieChartWidget assets={prepareAssetsForPieChart()} />

          {/* 5. Recent Transactions Widget */}
          <RecentTransactionWidget lastTransaction={lastTransaction} />

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
