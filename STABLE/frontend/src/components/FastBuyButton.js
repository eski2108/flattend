import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoFlash } from 'react-icons/io5';

function FastBuyButton({ style }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/fast-buy')}
      style={{
        padding: '1rem 2rem',
        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
        border: 'none',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '18px',
        fontWeight: '900',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
        transition: 'all 0.3s',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(34, 197, 94, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(34, 197, 94, 0.4)';
      }}
    >
      <IoFlash size={24} fill="#fff" />
      <span>FAST BUY</span>
    </button>
  );
}

export default FastBuyButton;