import React, { useState, useEffect } from 'react';
import { convertFiatToCrypto, convertCryptoToFiat, getCurrencySymbol, validateBalance } from '../utils/currencyConverter';
import { toast } from 'sonner';

/**
 * Dual Currency Input Component
 * Allows users to input either fiat or crypto amount with auto-conversion
 */
const DualCurrencyInput = ({
  cryptoSymbol,
  fiatCurrency = 'GBP',
  onFiatChange,
  onCryptoChange,
  initialFiatAmount = '',
  initialCryptoAmount = '',
  fee = 0,
  availableBalance = 0,
  balanceInCrypto = true,
  disabled = false,
  showCurrencySelector = true,
  label = 'Amount'
}) => {
  const [fiatAmount, setFiatAmount] = useState(initialFiatAmount);
  const [cryptoAmount, setCryptoAmount] = useState(initialCryptoAmount);
  const [selectedCurrency, setSelectedCurrency] = useState(fiatCurrency);
  const [isConverting, setIsConverting] = useState(false);
  const [lastEdited, setLastEdited] = useState('fiat'); // 'fiat' or 'crypto'
  const [priceInfo, setPriceInfo] = useState(null);

  // Handle fiat input change
  const handleFiatChange = async (value) => {
    setFiatAmount(value);
    setLastEdited('fiat');
    
    if (!value || parseFloat(value) <= 0) {
      setCryptoAmount('');
      onFiatChange && onFiatChange(0);
      onCryptoChange && onCryptoChange(0);
      return;
    }

    setIsConverting(true);
    const result = await convertFiatToCrypto(value, cryptoSymbol, selectedCurrency, fee);
    setIsConverting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setCryptoAmount(result.cryptoAmount);
    setPriceInfo(result);
    onFiatChange && onFiatChange(parseFloat(value));
    onCryptoChange && onCryptoChange(result.cryptoAmount);
  };

  // Handle crypto input change
  const handleCryptoChange = async (value) => {
    setCryptoAmount(value);
    setLastEdited('crypto');
    
    if (!value || parseFloat(value) <= 0) {
      setFiatAmount('');
      onFiatChange && onFiatChange(0);
      onCryptoChange && onCryptoChange(0);
      return;
    }

    setIsConverting(true);
    const result = await convertCryptoToFiat(value, cryptoSymbol, selectedCurrency, fee);
    setIsConverting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setFiatAmount(result.fiatAmount);
    setPriceInfo(result);
    onFiatChange && onFiatChange(result.fiatAmount);
    onCryptoChange && onCryptoChange(parseFloat(value));
  };

  // Handle currency change
  const handleCurrencyChange = async (newCurrency) => {
    setSelectedCurrency(newCurrency);
    // Recalculate with new currency
    if (lastEdited === 'fiat' && fiatAmount) {
      handleFiatChange(fiatAmount);
    } else if (lastEdited === 'crypto' && cryptoAmount) {
      handleCryptoChange(cryptoAmount);
    }
  };

  const currencySymbol = getCurrencySymbol(selectedCurrency);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
        {availableBalance > 0 && (
          <span style={{ fontSize: '13px', color: '#8F9BB3' }}>
            Balance: {balanceInCrypto ? `${availableBalance.toFixed(8)} ${cryptoSymbol}` : `${currencySymbol}${availableBalance.toFixed(2)}`}
          </span>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        maxWidth: '100%'
      }}>
        {/* Fiat Input - Match BTC Selector Style */}
        <div style={{ flex: '1', minWidth: '220px', maxWidth: '420px' }}>
          <div style={{
            background: '#0B1B2A',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s'
          }}>
            {/* £ Symbol - Thinner */}
            <span style={{ 
              color: '#00F0FF', 
              fontSize: '16px', 
              fontWeight: '500',
              flexShrink: 0,
              minWidth: '16px'
            }}>{currencySymbol}</span>
            
            {/* Input */}
            <input
              type="number"
              value={fiatAmount}
              onChange={(e) => handleFiatChange(e.target.value)}
              placeholder="0.00"
              disabled={disabled}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: '600',
                outline: 'none',
                minWidth: '80px',
                width: 'auto'
              }}
            />
            
            {/* Currency Selector - Compact Style */}
            {showCurrencySelector && (
              <select
                value={selectedCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                disabled={disabled}
                style={{
                  background: 'rgba(0, 240, 255, 0.08)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 28px 8px 12px',
                  color: '#00F0FF',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2300F0FF' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  minWidth: '90px',
                  maxWidth: '100px',
                  height: '38px',
                  flexShrink: 0
                }}
              >
                <optgroup label="Popular">
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="NGN">NGN (₦)</option>
                </optgroup>
                <optgroup label="Africa">
                  <option value="ZAR">ZAR (R)</option>
                  <option value="KES">KES (KSh)</option>
                  <option value="GHS">GHS (₵)</option>
                </optgroup>
                <optgroup label="Asia">
                  <option value="INR">INR (₹)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CNY">CNY (¥)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SAR">SAR (﷼)</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="CAD">CAD (C$)</option>
                  <option value="BRL">BRL (R$)</option>
                  <option value="MXN">MXN ($)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="CHF">CHF (Fr)</option>
                  <option value="SEK">SEK (kr)</option>
                  <option value="NOK">NOK (kr)</option>
                  <option value="DKK">DKK (kr)</option>
                  <option value="PLN">PLN (zł)</option>
                </optgroup>
                <optgroup label="Oceania">
                  <option value="AUD">AUD (A$)</option>
                </optgroup>
              </select>
            )}
          </div>
        </div>

        {/* Swap Icon - Smaller with Circular Border */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minWidth: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          background: 'rgba(0, 240, 255, 0.08)',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '14px', color: '#00F0FF' }}>⇄</span>
        </div>

        {/* Crypto Input - Keep Existing Style */}
        <div style={{ flex: '1', minWidth: '220px', maxWidth: '420px' }}>
          <div style={{
            background: '#0B1B2A',
            border: '1px solid rgba(155, 77, 255, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}>
            <input
              type="number"
              value={cryptoAmount}
              onChange={(e) => handleCryptoChange(e.target.value)}
              placeholder="0.00000000"
              disabled={disabled}
              step="0.00000001"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: '600',
                outline: 'none',
                minWidth: '100px',
                width: 'auto'
              }}
            />
            <span style={{ 
              color: '#9B4DFF', 
              fontSize: '14px', 
              fontWeight: '700',
              flexShrink: 0,
              minWidth: '40px'
            }}>{cryptoSymbol}</span>
          </div>
        </div>
      </div>

      {/* Price Info & Fees - Compact Design */}
      {priceInfo && !priceInfo.error && (
        <div style={{
          marginTop: '10px',
          padding: '10px 14px',
          background: 'rgba(0, 240, 255, 0.04)',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          borderRadius: '10px',
          fontSize: '12px',
          color: '#8F9BB3'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px' }}>Rate:</span>
            <span style={{ color: '#00F0FF', fontSize: '12px', fontWeight: '600' }}>1 {cryptoSymbol} = {currencySymbol}{priceInfo.pricePerUnit?.toFixed(2)}</span>
          </div>
          {fee > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px' }}>Fee ({fee}%):</span>
                <span style={{ color: '#FFA500', fontSize: '12px', fontWeight: '600' }}>{currencySymbol}{priceInfo.feeAmount?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0, 240, 255, 0.15)', paddingTop: '6px', marginTop: '6px' }}>
                <span style={{ fontWeight: '600', fontSize: '13px' }}>Net Amount:</span>
                <span style={{ color: '#00F0FF', fontWeight: '700', fontSize: '13px' }}>{currencySymbol}{priceInfo.netAmount?.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Conversion indicator */}
      {isConverting && (
        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#00F0FF' }}>
          Converting...
        </div>
      )}
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(DualCurrencyInput);
