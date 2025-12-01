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
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' }}>
          {label}
        </span>
        {availableBalance > 0 && (
          <span style={{ fontSize: '13px', color: '#8F9BB3' }}>
            Balance: {balanceInCrypto ? `${availableBalance.toFixed(8)} ${cryptoSymbol}` : `${currencySymbol}${availableBalance.toFixed(2)}`}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {/* Fiat Input */}
        <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700' }}>{currencySymbol}</span>
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
                fontSize: '20px',
                fontWeight: '700',
                outline: 'none',
                width: '100%'
              }}
            />
            {showCurrencySelector && (
              <select
                value={selectedCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                disabled={disabled}
                style={{
                  background: 'rgba(0, 240, 255, 0.15)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: '#00F0FF',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                <optgroup label="Popular">
                  <option value="GBP">🇬🇧 GBP - British Pound</option>
                  <option value="USD">🇺🇸 USD - US Dollar</option>
                  <option value="EUR">🇪🇺 EUR - Euro</option>
                  <option value="NGN">🇳🇬 NGN - Nigerian Naira</option>
                </optgroup>
                <optgroup label="Africa">
                  <option value="ZAR">🇿🇦 ZAR - South African Rand</option>
                  <option value="KES">🇰🇪 KES - Kenyan Shilling</option>
                  <option value="GHS">🇬🇭 GHS - Ghanaian Cedi</option>
                </optgroup>
                <optgroup label="Asia">
                  <option value="INR">🇮🇳 INR - Indian Rupee</option>
                  <option value="JPY">🇯🇵 JPY - Japanese Yen</option>
                  <option value="CNY">🇨🇳 CNY - Chinese Yuan</option>
                  <option value="AED">🇦🇪 AED - UAE Dirham</option>
                  <option value="SAR">🇸🇦 SAR - Saudi Riyal</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
                  <option value="BRL">🇧🇷 BRL - Brazilian Real</option>
                  <option value="MXN">🇲🇽 MXN - Mexican Peso</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="CHF">🇨🇭 CHF - Swiss Franc</option>
                  <option value="SEK">🇸🇪 SEK - Swedish Krona</option>
                  <option value="NOK">🇳🇴 NOK - Norwegian Krone</option>
                  <option value="DKK">🇩🇰 DKK - Danish Krone</option>
                  <option value="PLN">🇵🇱 PLN - Polish Zloty</option>
                </optgroup>
                <optgroup label="Oceania">
                  <option value="AUD">🇦🇺 AUD - Australian Dollar</option>
                </optgroup>
              </select>
            )}
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#8F9BB3', textAlign: 'center' }}>
            Fiat Amount
          </div>
        </div>

        {/* Equals Symbol */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px' }}>
          <span style={{ fontSize: '24px', color: '#00F0FF' }}>⇄</span>
        </div>

        {/* Crypto Input */}
        <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '2px solid rgba(155, 77, 255, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
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
                fontSize: '20px',
                fontWeight: '700',
                outline: 'none',
                width: '100%'
              }}
            />
            <span style={{ color: '#9B4DFF', fontSize: '14px', fontWeight: '700' }}>{cryptoSymbol}</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#8F9BB3', textAlign: 'center' }}>
            Crypto Amount
          </div>
        </div>
      </div>

      {/* Price Info & Fees */}
      {priceInfo && !priceInfo.error && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#8F9BB3'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Rate:</span>
            <span style={{ color: '#00F0FF' }}>1 {cryptoSymbol} = {currencySymbol}{priceInfo.pricePerUnit?.toFixed(2)}</span>
          </div>
          {fee > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Fee ({fee}%):</span>
                <span style={{ color: '#FFA500' }}>{currencySymbol}{priceInfo.feeAmount?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0, 240, 255, 0.2)', paddingTop: '4px' }}>
                <span style={{ fontWeight: '700' }}>Net Amount:</span>
                <span style={{ color: '#00F0FF', fontWeight: '700' }}>{currencySymbol}{priceInfo.netAmount?.toFixed(2)}</span>
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

export default DualCurrencyInput;
