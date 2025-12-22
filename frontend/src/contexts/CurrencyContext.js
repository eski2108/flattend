import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  // Load user's preferred currency
  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (userData) {
      const user = JSON.parse(userData);
      fetchUserCurrency(user.user_id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(`${API}/api/currencies/list`);
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
    }
  };

  const fetchUserCurrency = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/user/${userId}/currency-preference`);
      if (response.data.success) {
        setCurrency(response.data.currency);
        setSymbol(response.data.symbol);
      }
    } catch (error) {
      console.error('Error fetching user currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrency = async (newCurrency) => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      // Guest user - just update locally
      const currencyInfo = currencies.find(c => c.code === newCurrency);
      if (currencyInfo) {
        setCurrency(newCurrency);
        setSymbol(currencyInfo.symbol);
        localStorage.setItem('guest_currency', newCurrency);
      }
      return;
    }

    const user = JSON.parse(userData);
    try {
      const response = await axios.post(`${API}/api/user/${user.user_id}/currency-preference`, {
        currency: newCurrency
      });
      
      if (response.data.success) {
        setCurrency(newCurrency);
        setSymbol(response.data.symbol);
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      throw error;
    }
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
    const formatted = new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(converted);
    
    return showSymbol ? `${symbol}${formatted}` : formatted;
  };

  const formatCrypto = (amount, crypto = 'BTC') => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(amount);
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
