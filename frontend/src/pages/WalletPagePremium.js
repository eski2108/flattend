import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Copy, 
  ChevronDown, 
  ChevronUp,
  Lock,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Download,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Repeat,
  Users
} from 'lucide-react';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const API = process.env.REACT_APP_BACKEND_URL;

// Enhanced Animated counter with glow effect
const AnimatedCounter = ({ value, prefix = '£', decimals = 2, duration = 1500 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value === displayValue) return;
    
    setIsAnimating(true);
    let startTime = null;
    const startValue = displayValue;
    const endValue = value;
    const change = endValue - startValue;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (change * easeOutQuart);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span 
      className="transition-all duration-250"
      style={{
        filter: isAnimating ? 'brightness(1.3) drop-shadow(0 0 20px rgba(56, 189, 248, 0.5))' : 'brightness(1)'
      }}
    >
      {prefix}{displayValue.toLocaleString('en-GB', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      })}
    </span>
  );
};

// Premium Sparkline with sharper colors
const PremiumSparkline = ({ data, color, width = 100, height = 32 }) => {
  if (!data || data.length === 0) {
    data = Array.from({ length: 24 }, () => Math.random() * 100 + 50);
  }

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <Sparklines data={data} width={width} height={height} margin={0}>
        <SparklinesLine 
          color={color} 
          style={{ 
            strokeWidth: 2.5, 
            fill: 'none',
            filter: `drop-shadow(0 0 4px ${color}80)`
          }} 
        />
      </Sparklines>
    </div>
  );
};

// Transaction type icons
const getTransactionIcon = (type) => {
  switch(type) {
    case 'deposit':
      return <ArrowDownLeft className="w-5 h-5" />;
    case 'withdrawal':
      return <ArrowUpRight className="w-5 h-5" />;
    case 'swap':
      return <Repeat className="w-5 h-5" />;
    case 'p2p_trade':
    case 'p2p':
      return <Users className="w-5 h-5" />;
    default:
      return <Wallet className="w-5 h-5" />;
  }
};

export default function WalletPagePremium() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPortfolioGBP, setTotalPortfolioGBP] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [totalLocked, setTotalLocked] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [expandedAsset, setExpandedAsset] = useState(0); // Auto-expand first asset so buttons are visible
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('BTC');
  const [withdrawFee, setWithdrawFee] = useState(0);