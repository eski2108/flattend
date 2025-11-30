import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chart from 'react-apexcharts';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Lock, Calendar, Star, Clock, Briefcase, Activity } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
import API_BASE_URL from '@/config/api';

const API = API_BASE_URL;

// Currency configuration
const CURRENCIES = {
  'GBP': { symbol: '£', name: 'British Pound', rate: 1.0 },
  'USD': { symbol: '$', name: 'US Dollar', rate: 1.27 },
  'EUR': { symbol: '€', name: 'Euro', rate: 1.17 },
  'CAD': { symbol: 'C$', name: 'Canadian Dollar', rate: 1.71 },
  'AUD': { symbol: 'A$', name: 'Australian Dollar', rate: 1.96 },
  'JPY': { symbol: '¥', name: 'Japanese Yen', rate: 194.5 },
  'CHF': { symbol: 'Fr', name: 'Swiss Franc', rate: 1.13 },
  'CNY': { symbol: '¥', name: 'Chinese Yuan', rate: 9.18 },
  'INR': { symbol: '₹', name: 'Indian Rupee', rate: 106.5 },
  'BRL': { symbol: 'R$', name: 'Brazilian Real', rate: 6.25 },
  'ZAR': { symbol: 'R', name: 'South African Rand', rate: 22.8 },
  'NGN': { symbol: '₦', name: 'Nigerian Naira', rate: 1950 },
  'AED': { symbol: 'د.إ', name: 'UAE Dirham', rate: 4.66 },
  'SAR': { symbol: '﷼', name: 'Saudi Riyal', rate: 4.76 }
};

export default function Savings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingsBalances, setSavingsBalances] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [displayCurrency, setDisplayCurrency] = useState('GBP');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferDirection, setTransferDirection] = useState('to_savings');
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [transferAmount, setTransferAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [savingsHistory, setSavingsHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 14, seconds: 32 });

  const APY = 4.5;
  const rewardFrequency = 'Daily';
  const startDate = '2024-01-01';

  useEffect(() => {
    fetchSavings();
    fetchSavingsHistory();
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSavings = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(userData);
      const userId = user.user_id;

      const response = await axios.get(`${API}/api/savings/balances/${userId}`);
      if (response.data.success) {
        setSavingsBalances(response.data.balances);
        const total = response.data.total_value_usd || 0;
        setTotalValue(total);
        setDailyEarnings((total * APY / 100 / 365));
        setTotalEarned(total * 0.05); // Mock 5% lifetime earnings
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching savings:', error);
      toast.error('Failed to load savings');
      setLoading(false);
    }
  };

  const fetchSavingsHistory = async () => {
    // Mock history for now
    setSavingsHistory([
      { date: '2024-11-28', amount: 0.00015, coin: 'BTC', apy: 4.5, status: 'Paid' },
      { date: '2024-11-27', amount: 0.00014, coin: 'BTC', apy: 4.5, status: 'Paid' },
      { date: '2024-11-26', amount: 0.00015, coin: 'BTC', apy: 4.5, status: 'Paid' },
      { date: '2024-11-25', amount: 0.00014, coin: 'BTC', apy: 4.5, status: 'Paid' },
      { date: '2024-11-24', amount: 0.00015, coin: 'BTC', apy: 4.5, status: 'Paid' }
    ]);
  };

  const handleTransfer = async () => {
    try {
      if (!transferAmount || parseFloat(transferAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      setProcessing(true);
      const userData = localStorage.getItem('cryptobank_user');
      const user = JSON.parse(userData);
      const userId = user.user_id;

      const response = await axios.post(`${API}/api/savings/transfer`, {
        user_id: userId,
        currency: selectedCurrency,
        amount: parseFloat(transferAmount),
        direction: transferDirection
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowTransferModal(false);
        setTransferAmount('');
        fetchSavings();
      } else {
        toast.error(response.data.message || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setProcessing(false);
    }
  };

  const convertCurrency = (usdAmount) => {
    const rate = CURRENCIES[displayCurrency].rate / CURRENCIES['USD'].rate;
    return (usdAmount * rate).toFixed(2);
  };

  const currencySymbol = CURRENCIES[displayCurrency].symbol;
  const displayValue = convertCurrency(totalValue);
  const displayDaily = convertCurrency(dailyEarnings);
  const displayWeekly = convertCurrency(dailyEarnings * 7);
  const displayMonthly = convertCurrency(dailyEarnings * 30);
  const displayYearly = convertCurrency(dailyEarnings * 365);
  const displayTotalEarned = convertCurrency(totalEarned);

  // Performance Chart Data
  const performanceChartOptions = {
    chart: {
      type: 'area',
      height: 280,
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#00E8FF']
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 100],
        colorStops: [
          { offset: 0, color: '#00E8FF', opacity: 0.5 },
          { offset: 100, color: '#9B4DFF', opacity: 0.1 }
        ]
      }
    },
    grid: {
      borderColor: 'rgba(0, 232, 255, 0.1)',
      strokeDashArray: 4
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      labels: { style: { colors: '#8F9BB3', fontSize: '12px' } },
      axisBorder: { color: 'rgba(0, 232, 255, 0.2)' },
      axisTicks: { color: 'rgba(0, 232, 255, 0.2)' }
    },
    yaxis: {
      labels: {
        style: { colors: '#8F9BB3', fontSize: '12px' },
        formatter: (val) => `${currencySymbol}${val.toFixed(0)}`
      }
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: 'Inter, sans-serif' },
      x: { show: true },
      y: {
        formatter: (val) => `${currencySymbol}${val.toFixed(2)}`
      }
    },
    dataLabels: { enabled: false },
    markers: {
      size: 0,
      colors: ['#00E8FF'],
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: { size: 7 }
    }
  };

  const performanceChartSeries = [{
    name: 'Savings Value',
    data: [500, 650, 800, 750, 900, 1100, 1250]
  }];

  // Pie Chart Data
  const pieChartOptions = {
    chart: {
      type: 'donut',
      height: 280,
      background: 'transparent'
    },
    labels: ['In Savings', 'In Wallet'],
    colors: ['#00E8FF', '#9B4DFF'],
    dataLabels: {
      enabled: true,
      style: { fontSize: '14px', fontWeight: '700', colors: ['#fff'] }
    },
    legend: {
      position: 'bottom',
      labels: { colors: '#8F9BB3', fontSize: '14px' }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { show: true, fontSize: '18px', color: '#8F9BB3' },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: '700',
              color: '#00E8FF',
              formatter: (val) => `${val.toFixed(1)}%`
            }
          }
        }
      }
    },
    stroke: { width: 2, colors: ['#0C1A27'] },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `${val.toFixed(1)}%` }
    }
  };

  const savingsPercent = totalValue > 0 ? 75 : 0;
  const walletPercent = 100 - savingsPercent;
  const pieChartSeries = [savingsPercent, walletPercent];

  if (loading) {
    return (
      <Layout>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #07111A 0%, #0C1A27 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ color: '#00E8FF', fontSize: '18px', fontWeight: '600' }}>Loading savings...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #07111A 0%, #0C1A27 100%)',
        padding: '20px',
        paddingBottom: '60px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          {/* 1. SAVINGS SUMMARY HEADER */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(12, 26, 39, 0.95) 0%, rgba(7, 17, 26, 0.98) 100%)',
            border: '1px solid rgba(0, 232, 255, 0.3)',
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '20px',
            boxShadow: '0 0 40px rgba(0, 232, 255, 0.2), inset 0 0 30px rgba(0, 232, 255, 0.05)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '2fr 1fr', gap: '24px', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Crypto Savings</h1>
                  <select
                    value={displayCurrency}
                    onChange={(e) => setDisplayCurrency(e.target.value)}
                    style={{
                      padding: '6px 28px 6px 10px',
                      background: 'rgba(0, 232, 255, 0.1)',
                      border: '1px solid rgba(0, 232, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#00E8FF',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {Object.entries(CURRENCIES).map(([code, data]) => (
                      <option key={code} value={code}>{data.symbol} {code}</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: '48px', fontWeight: '700', color: '#00E8FF', marginBottom: '8px', textShadow: '0 0 30px rgba(0, 232, 255, 0.6)' }}>
                  {currencySymbol}{displayValue}
                </div>
                <div style={{ fontSize: '16px', color: '#8F9BB3', marginBottom: '16px' }}>≈ ${totalValue.toFixed(2)} USD</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Daily Earnings</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#8FFF4E' }}>+{currencySymbol}{displayDaily}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>APY Rate</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#F5C542' }}>{APY}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Next Reward In</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#00E8FF' }}>
                      {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <CHXButton
                  onClick={() => { setTransferDirection('to_savings'); setShowTransferModal(true); }}
                  coinColor="#00E8FF"
                  variant="primary"
                  size="large"
                  fullWidth
                  icon={<ArrowUpRight size={20} />}
                >
                  Transfer to Savings
                </CHXButton>
                <CHXButton
                  onClick={() => { setTransferDirection('to_spot'); setShowTransferModal(true); }}
                  coinColor="#9B4DFF"
                  variant="secondary"
                  size="large"
                  fullWidth
                  icon={<ArrowDownLeft size={20} />}
                >
                  Move Back to Wallet
                </CHXButton>
              </div>
            </div>
          </div>

          {/* 2. APY WIDGET */}
          <div style={{
            background: 'rgba(12, 26, 39, 0.8)',
            border: '1px solid rgba(0, 232, 255, 0.25)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 0 20px rgba(0, 232, 255, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '32px' }}>🔒</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '4px' }}>Estimated APY</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#8FFF4E' }}>{APY}%</div>
                <div style={{ fontSize: '13px', color: '#8F9BB3' }}>Flexible Rewards</div>
              </div>
              <div style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #F5C542, #F59E0B)',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#000'
              }}>HOT APY</div>
            </div>
          </div>

          {/* 3. DAILY EARNINGS WIDGET */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'rgba(12, 26, 39, 0.8)',
              border: '1px solid rgba(0, 232, 255, 0.25)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
              <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '8px' }}>Daily</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#00E8FF' }}>{currencySymbol}{displayDaily}</div>
            </div>
            <div style={{
              background: 'rgba(12, 26, 39, 0.8)',
              border: '1px solid rgba(0, 232, 255, 0.25)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📆</div>
              <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '8px' }}>Weekly</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#00E8FF' }}>{currencySymbol}{displayWeekly}</div>
            </div>
            <div style={{
              background: 'rgba(12, 26, 39, 0.8)',
              border: '1px solid rgba(0, 232, 255, 0.25)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📆</div>
              <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '8px' }}>Monthly</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#00E8FF' }}>{currencySymbol}{displayMonthly}</div>
            </div>
            <div style={{
              background: 'rgba(12, 26, 39, 0.8)',
              border: '1px solid rgba(0, 232, 255, 0.25)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⭐</div>
              <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '8px' }}>Yearly</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#00E8FF' }}>{currencySymbol}{displayYearly}</div>
            </div>
          </div>

          {/* 4. REWARD COUNTDOWN TIMER */}
          <div style={{
            background: 'rgba(12, 26, 39, 0.8)',
            border: '1px solid rgba(0, 232, 255, 0.25)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontSize: '16px', color: '#8F9BB3', marginBottom: '12px' }}>Next Reward In</div>
            <div style={{ fontSize: '42px', fontWeight: '700', color: '#00E8FF', fontFamily: 'monospace' }}>
              {String(timeLeft.hours).padStart(2, '0')} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '13px', color: '#8F9BB3', marginTop: '8px' }}>hours : minutes : seconds</div>
          </div>

          {/* 5. PERFORMANCE AREA CHART */}
          <div style={{
            background: 'rgba(12, 26, 39, 0.8)',
            border: '1px solid rgba(0, 232, 255, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '20px' }}>Savings Performance</h3>
            <Chart options={performanceChartOptions} series={performanceChartSeries} type="area" height={280} />
          </div>

          {/* 6. SAVINGS ALLOCATION PIE CHART */}
          <div style={{
            background: 'rgba(12, 26, 39, 0.8)',
            border: '1px solid rgba(0, 232, 255, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '20px' }}>Savings vs Wallet Allocation</h3>
            <Chart options={pieChartOptions} series={pieChartSeries} type="donut" height={280} />
          </div>

          {/* 7. EARNINGS HISTORY TABLE */}
          <div style={{
            background: 'rgba(12, 26, 39, 0.8)',
            border: '1px solid rgba(0, 232, 255, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '16px',
            overflowX: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '20px' }}>Earnings History</h3>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: '#8F9BB3', fontWeight: '600' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: '#8F9BB3', fontWeight: '600' }}>Amount Earned</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: '#8F9BB3', fontWeight: '600' }}>Coin</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: '#8F9BB3', fontWeight: '600' }}>APY</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', color: '#8F9BB3', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {savingsHistory.map((entry, index) => (
                  <tr key={index} style={{ background: index % 2 === 0 ? 'rgba(0, 232, 255, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#FFFFFF' }}>{entry.date}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#8FFF4E', fontWeight: '600' }}>{entry.amount}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#FFFFFF' }}>{entry.coin}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#F5C542' }}>{entry.apy}%</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#22C55E' }}>🟢 {entry.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 8. ACTIVE SAVINGS INFO PANEL */}
          <div style={{
            background: 'rgba(12, 26, 39, 0.8)',
            border: '1px solid rgba(0, 232, 255, 0.25)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px' }}>💼</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>Active Savings Info</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px' }}>Total Saved</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#00E8FF' }}>{currencySymbol}{displayValue}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px' }}>Total Earned Lifetime</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#8FFF4E' }}>{currencySymbol}{displayTotalEarned}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px' }}>Average APY</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#F5C542' }}>{APY}%</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px' }}>Reward Frequency</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>{rewardFrequency}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px' }}>Start Date</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>{startDate}</div>
              </div>
            </div>
          </div>

        </div>

        {/* Transfer Modal */}
        {showTransferModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(12, 26, 39, 0.98) 0%, rgba(7, 17, 26, 0.99) 100%)',
              border: '1px solid rgba(0, 232, 255, 0.3)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 0 50px rgba(0, 232, 255, 0.3)'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '24px' }}>
                {transferDirection === 'to_savings' ? 'Transfer to Savings' : 'Move to Spot Wallet'}
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '8px', display: 'block' }}>Currency</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(0, 232, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '16px'
                  }}
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '8px', display: 'block' }}>Amount</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(0, 232, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <CHXButton
                  onClick={() => setShowTransferModal(false)}
                  coinColor="#6B7280"
                  variant="secondary"
                  size="medium"
                  fullWidth
                >
                  Cancel
                </CHXButton>
                
                <CHXButton
                  onClick={handleTransfer}
                  coinColor="#00E8FF"
                  variant="primary"
                  size="medium"
                  fullWidth
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Confirm'}
                </CHXButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
