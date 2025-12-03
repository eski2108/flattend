import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const AdminLiquidity = () => {
  const [liquidity, setLiquidity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiquidity();
  }, []);

  const fetchLiquidity = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/liquidity`);
      const data = await response.json();
      if (data.success) {
        setLiquidity(data.liquidity);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching liquidity:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{padding: '40px', color: '#fff'}}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        padding: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '30px',
          background: 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🏦 Admin Liquidity Wallet
        </h1>

        <div style={{
          background: 'rgba(13, 23, 38, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          padding: '30px',
          boxShadow: '0 8px 32px rgba(0, 240, 255, 0.1)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                borderBottom: '2px solid rgba(0, 240, 255, 0.3)'
              }}>
                <th style={{
                  textAlign: 'left',
                  padding: '15px',
                  color: '#00F0FF',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>Currency</th>
                <th style={{
                  textAlign: 'right',
                  padding: '15px',
                  color: '#00F0FF',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>Balance</th>
                <th style={{
                  textAlign: 'right',
                  padding: '15px',
                  color: '#00F0FF',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>Available</th>
                <th style={{
                  textAlign: 'right',
                  padding: '15px',
                  color: '#00F0FF',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>Reserved</th>
              </tr>
            </thead>
            <tbody>
              {liquidity.map((liq, index) => (
                <tr key={index} style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <td style={{
                    padding: '20px 15px',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {liq.currency}
                  </td>
                  <td style={{
                    padding: '20px 15px',
                    color: '#fff',
                    fontSize: '18px',
                    textAlign: 'right',
                    fontFamily: 'monospace'
                  }}>
                    {parseFloat(liq.balance).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </td>
                  <td style={{
                    padding: '20px 15px',
                    color: '#00FF88',
                    fontSize: '18px',
                    textAlign: 'right',
                    fontFamily: 'monospace'
                  }}>
                    {parseFloat(liq.available).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </td>
                  <td style={{
                    padding: '20px 15px',
                    color: '#FF6B6B',
                    fontSize: '18px',
                    textAlign: 'right',
                    fontFamily: 'monospace'
                  }}>
                    {parseFloat(liq.reserved || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={fetchLiquidity}
            style={{
              marginTop: '30px',
              padding: '12px 30px',
              background: 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 240, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🔄 Refresh Liquidity
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLiquidity;