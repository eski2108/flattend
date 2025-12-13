import React from 'react';
import { IoArrowDownCircle as ArrowDownLeft, IoArrowUpCircle as ArrowUpRight, IoTrendingUp } from 'react-icons/io5';
import { BiRepeat } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

const RecentTransactionWidget = ({ lastTransaction }) => {
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch(type) {
      case 'deposit': return <ArrowDownLeft size={20} color="#22C55E" />;
      case 'withdraw': return <ArrowUpRight size={20} color="#EF4444" />;
      case 'swap': return <BiRepeat size={20} color="#00C6FF" />;
      case 'savings': return <IoTrendingUp size={20} color="#FBBF24" />;
      default: return null;
    }
  };

  if (!lastTransaction) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
        border: '1px solid rgba(0, 198, 255, 0.25)',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)',
        minHeight: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ color: '#8F9BB3', fontSize: '14px' }}>No recent transactions</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate('/wallet')} 
      style={{
        background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
        border: '1px solid rgba(0, 198, 255, 0.25)',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)',
        minHeight: '70px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0, 198, 255, 0.5)';
        e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 198, 255, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0, 198, 255, 0.25)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 198, 255, 0.15)';
      }}
    >
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'rgba(0, 198, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(0, 198, 255, 0.3)'
      }}>
        {getIcon(lastTransaction.type)}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600', marginBottom: '2px' }}>
          Last {lastTransaction.type.charAt(0).toUpperCase() + lastTransaction.type.slice(1)}
        </div>
        <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
          {lastTransaction.amount} {lastTransaction.currency} • {new Date(lastTransaction.timestamp).toLocaleString()}
        </div>
      </div>

      <div style={{ fontSize: '12px', color: '#00C6FF', fontWeight: '600' }}>
        View All →
      </div>
    </div>
  );
};

export default RecentTransactionWidget;
