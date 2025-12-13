import React from 'react';
import { IoArrowDownCircle as ArrowDownLeft, IoArrowUpCircle as ArrowUpRight, IoTrendingUp } from 'react-icons/io5';
import { BiRepeat } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

const RecentTransactionsList = ({ transactions }) => {
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'deposit': return <ArrowDownLeft size={18} color="#22C55E" />;
      case 'withdraw': return <ArrowUpRight size={18} color="#EF4444" />;
      case 'swap': return <BiRepeat size={18} color="#00C6FF" />;
      case 'buy': return <IoTrendingUp size={18} color="#22C55E" />;
      case 'sell': return <IoTrendingUp size={18} color="#EF4444" />;
      default: return <ArrowDownLeft size={18} color="#8F9BB3" />;
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: '1px solid rgba(0, 198, 255, 0.25)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)',
      minHeight: '200px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Recent Transactions</h3>
        <button
          onClick={() => navigate('/wallet')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(0, 198, 255, 0.3)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#00C6FF',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(0, 198, 255, 0.1)';
            e.target.style.borderColor = 'rgba(0, 198, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.borderColor = 'rgba(0, 198, 255, 0.3)';
          }}
        >
          View All
        </button>
      </div>

      {!transactions || transactions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#8F9BB3',
          fontSize: '14px'
        }}>
          No recent transactions yet
        </div>
      ) : (
        <div>
          {transactions.slice(0, 5).map((tx, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: index < Math.min(transactions.length, 5) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0, 198, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0, 198, 255, 0.3)',
                flexShrink: 0
              }}>
                {getIcon(tx.type || tx.transaction_type)}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600', marginBottom: '2px' }}>
                  {(tx.type || tx.transaction_type || '').charAt(0).toUpperCase() + (tx.type || tx.transaction_type || '').slice(1)} {tx.currency}
                </div>
                <div style={{ fontSize: '12px', color: '#8F9BB3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {new Date(tx.timestamp || tx.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: (tx.type || tx.transaction_type) === 'deposit' || (tx.type || tx.transaction_type) === 'buy' ? '#22C55E' : '#EF4444' }}>
                  {(tx.type || tx.transaction_type) === 'deposit' || (tx.type || tx.transaction_type) === 'buy' ? '+' : '-'}{tx.amount}
                </div>
                <div style={{ fontSize: '11px', color: '#8F9BB3' }}>{tx.currency}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentTransactionsList;
