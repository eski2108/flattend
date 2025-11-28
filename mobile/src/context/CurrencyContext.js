import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('GBP');
  const [symbol, setSymbol] = useState('£');
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch available currencies
  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(`${API_URL}/currencies/list`);
      if (response.data.success) {
        setCurrencies(response.data.currencies);
        
        // Build exchange rates object
        const rates = {};
        response.data.currencies.forEach(curr => {
          rates[curr.code] = curr.rate_to_gbp;
        });
        setExchangeRates(rates);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrency = async (newCurrency, userId = null) => {
    const currencyInfo = currencies.find(c => c.code === newCurrency);
    if (!currencyInfo) return;

    if (userId) {
      try {
        await axios.post(`${API_URL}/user/${userId}/currency-preference`, {
          currency: newCurrency
        });
      } catch (error) {
        console.error('Error updating currency preference:', error);
      }
    }

    setCurrency(newCurrency);
    setSymbol(currencyInfo.symbol);
  };

  const convertAmount = (amount, fromCurrency = 'GBP') => {
    if (!amount || isNaN(amount)) return 0;
    
    // If same currency, return as is
    if (fromCurrency === currency) return parseFloat(amount);
    
    // Convert from source currency to GBP, then to target currency
    const amountInGBP = parseFloat(amount) / (exchangeRates[fromCurrency] || 1);
    const convertedAmount = amountInGBP * (exchangeRates[currency] || 1);
    
    return convertedAmount;
  };

  const formatAmount = (amount, fromCurrency = 'GBP', showSymbol = true) => {
    const converted = convertAmount(amount, fromCurrency);
    const formatted = converted.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return showSymbol ? `${symbol}${formatted}` : formatted;
  };

  const formatCrypto = (amount, crypto = 'BTC') => {
    return parseFloat(amount).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  const value = {
    currency,
    symbol,
    currencies,
    exchangeRates,
    loading,
    updateCurrency,
    convertAmount,
    formatAmount,
    formatCrypto
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
