import React, { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Check, Globe, IoCheckmark, IoGlobe, IoSearch, Search } from 'react-icons/io5';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function CurrencySelector() {
  const { currency, currencies, updateCurrency, loading } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCurrencyChange = async (newCurrency) => {
    try {
      await updateCurrency(newCurrency);
      toast.success(`Currency changed to ${newCurrency}`);
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to update currency');
    }
  };

  const filteredCurrencies = currencies.filter(curr => 
    curr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    curr.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading currencies...</div>;
  }

  const currentCurrencyInfo = currencies.find(c => c.code === currency);

  return (
    <div style={{ position: 'relative' }}>
      {/* Currency Display Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '12px',
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#00F0FF';
          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <IoGlobe size={24} color="#00F0FF" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>
              Display Currency
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '24px' }}>{currentCurrencyInfo?.flag}</span>
              <span>{currentCurrencyInfo?.code} - {currentCurrencyInfo?.name}</span>
            </div>
          </div>
        </div>
        <span style={{ fontSize: '20px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
          ▼
        </span>
      </button>

      {/* Currency Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />

          {/* Dropdown Menu */}
          <Card style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            background: 'rgba(15, 15, 24, 0.98)',
            border: '2px solid #00F0FF',
            borderRadius: '12px',
            maxHeight: '400px',
            overflow: 'hidden',
            zIndex: 1000,
            boxShadow: '0 10px 40px rgba(0, 240, 255, 0.3)'
          }}>
            {/* Search Box */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(0, 240, 255, 0.3)'
              }}>
                <IoSearch size={20} color="#00F0FF" />
                <input
                  type="text"
                  placeholder="Search currency..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Currency List */}
            <div style={{
              maxHeight: '320px',
              overflowY: 'auto',
              padding: '0.5rem'
            }}>
              {filteredCurrencies.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '14px'
                }}>
                  No currencies found
                </div>
              ) : (
                filteredCurrencies.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => handleCurrencyChange(curr.code)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: curr.code === currency ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: '0.25rem'
                    }}
                    onMouseEnter={(e) => {
                      if (curr.code !== currency) {
                        e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (curr.code !== currency) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '28px' }}>{curr.flag}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.125rem' }}>
                          {curr.code}
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          {curr.name}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#00F0FF'
                      }}>
                        {curr.symbol}
                      </span>
                      {curr.code === currency && (
                        <IoCheckmark size={20} color="#00F0FF" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
