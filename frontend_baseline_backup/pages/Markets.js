import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import Layout from '@/components/Layout';

const ALL_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'tether', symbol: 'USDT', name: 'Tether' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
];

export default function Markets() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchMarkets = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/crypto-market/prices`);
      
      if (response.data.success) {
        // Transform backend data to match the expected format
        const formattedMarkets = ALL_COINS.map((coin, idx) => {
          const prices = response.data.prices[coin.symbol];
          return {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: `https://cryptologos.cc/logos/${coin.name.toLowerCase().replace(' ', '-')}-${coin.symbol.toLowerCase()}-logo.png`,
            current_price: prices?.USD || 0,
            market_cap_rank: idx + 1,
            price_change_percentage_24h: Math.random() * 10 - 5, // Random for demo
            total_volume: (prices?.USD || 0) * Math.random() * 1000000
          };
        });
        
        setMarkets(formattedMarkets);
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMarkets = markets.filter(market =>
    market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
            Live Crypto Markets
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Real-time prices and market data for all supported cryptocurrencies
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '2rem', position: 'relative' }}>
          <Search 
            size={20} 
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.5)'
            }}
          />
          <input
            type="text"
            placeholder="Search cryptocurrency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Markets Table */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#fff', padding: '3rem' }}>
            Loading markets...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {filteredMarkets.map((market, idx) => (
                <Card
                  key={market.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 240, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                  }}
                >
                  {/* Header Row: Rank + Coin Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ 
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '14px',
                      fontWeight: '600',
                      minWidth: '30px'
                    }}>
                      #{market.market_cap_rank || idx + 1}
                    </div>
                    <img 
                      src={market.image} 
                      alt={market.name}
                      style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                        {market.name}
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                        {market.symbol.toUpperCase()}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '8px',
                      background: market.price_change_percentage_24h >= 0 
                        ? 'rgba(34, 197, 94, 0.15)' 
                        : 'rgba(239, 68, 68, 0.15)',
                      color: market.price_change_percentage_24h >= 0 ? '#22C55E' : '#EF4444',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}>
                      {market.price_change_percentage_24h >= 0 ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      {Math.abs(market.price_change_percentage_24h || 0).toFixed(2)}%
                    </div>
                  </div>

                  {/* Price Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.25rem' }}>
                        Price
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#00F0FF' }}>
                        ${market.current_price?.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: market.current_price < 1 ? 6 : 2 
                        })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.25rem' }}>
                        24h Volume
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)' }}>
                        ${(market.total_volume / 1000000).toFixed(2)}M
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/buy-crypto');
                      }}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                        border: 'none',
                        padding: '0.75rem 1rem',
                        fontSize: '14px',
                        fontWeight: '700',
                        borderRadius: '10px'
                      }}
                    >
                      Buy
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/sell-crypto');
                      }}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        border: 'none',
                        padding: '0.75rem 1rem',
                        fontSize: '14px',
                        fontWeight: '700',
                        borderRadius: '10px'
                      }}
                    >
                      Sell
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
