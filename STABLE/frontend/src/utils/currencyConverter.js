import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Cache for prices to avoid excessive API calls
let priceCache = {};
let lastFetchTime = {};
const CACHE_DURATION = 30000; // 30 seconds

// Currency exchange rates (relative to GBP)
// Updated periodically from live forex rates
const EXCHANGE_RATES = {
  'GBP': 1.0,      // Base currency
  'USD': 1.27,     // US Dollar
  'EUR': 1.17,     // Euro (Spain, Germany, France, Italy, etc.)
  'NGN': 1960,     // Nigerian Naira
  'INR': 105,      // Indian Rupee
  'AUD': 1.95,     // Australian Dollar
  'CAD': 1.72,     // Canadian Dollar
  'ZAR': 23.5,     // South African Rand
  'KES': 165,      // Kenyan Shilling
  'GHS': 16.2,     // Ghanaian Cedi
  'JPY': 190,      // Japanese Yen
  'CNY': 9.2,      // Chinese Yuan
  'BRL': 6.3,      // Brazilian Real
  'MXN': 21.8,     // Mexican Peso
  'CHF': 1.12,     // Swiss Franc
  'SEK': 13.5,     // Swedish Krona
  'NOK': 13.8,     // Norwegian Krone
  'DKK': 8.7,      // Danish Krone
  'PLN': 5.1,      // Polish Zloty
  'AED': 4.67,     // UAE Dirham
  'SAR': 4.76      // Saudi Riyal
};

/**
 * Fetch live price for a cryptocurrency
 * @param {string} coinSymbol - BTC, ETH, USDT, etc.
 * @returns {Promise<number>} - Price in GBP
 */
export const fetchLivePrice = async (coinSymbol) => {
  const now = Date.now();
  
  // Return cached price if recent
  if (priceCache[coinSymbol] && lastFetchTime[coinSymbol] && (now - lastFetchTime[coinSymbol]) < CACHE_DURATION) {
    return priceCache[coinSymbol];
  }

  try {
    const response = await axios.get(`${API}/api/prices/live`);
    if (response.data.success && response.data.prices) {
      const coinData = response.data.prices[coinSymbol];
      if (coinData && coinData.price_gbp) {
        priceCache[coinSymbol] = coinData.price_gbp;
        lastFetchTime[coinSymbol] = now;
        return coinData.price_gbp;
      }
    }
  } catch (error) {
    console.error(`Error fetching price for ${coinSymbol}:`, error);
  }
  
  return null;
};

/**
 * Convert fiat amount to crypto amount
 * @param {number} fiatAmount - Amount in fiat currency
 * @param {string} coinSymbol - Cryptocurrency symbol
 * @param {string} fiatCurrency - GBP, USD, NGN
 * @param {number} fee - Fee percentage (e.g., 2.5 for 2.5%)
 * @returns {Promise<Object>} - { cryptoAmount, pricePerUnit, totalWithFee, feeAmount }
 */
export const convertFiatToCrypto = async (fiatAmount, coinSymbol, fiatCurrency = 'GBP', fee = 0) => {
  const amount = parseFloat(fiatAmount);
  if (isNaN(amount) || amount <= 0) {
    return { cryptoAmount: 0, pricePerUnit: 0, totalWithFee: 0, feeAmount: 0 };
  }

  const priceInGBP = await fetchLivePrice(coinSymbol);
  if (!priceInGBP) {
    return { cryptoAmount: 0, pricePerUnit: 0, totalWithFee: 0, feeAmount: 0, error: 'Price unavailable' };
  }

  // Convert to target currency using exchange rates
  const exchangeRate = EXCHANGE_RATES[fiatCurrency] || 1.0;
  const priceInTargetCurrency = priceInGBP * exchangeRate;

  // Calculate fee
  const feeAmount = (amount * fee) / 100;
  const netAmount = amount - feeAmount;
  
  // Calculate crypto amount
  const cryptoAmount = netAmount / priceInTargetCurrency;

  return {
    cryptoAmount: parseFloat(cryptoAmount.toFixed(8)),
    pricePerUnit: priceInTargetCurrency,
    totalWithFee: amount,
    feeAmount: parseFloat(feeAmount.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2))
  };
};

/**
 * Convert crypto amount to fiat amount
 * @param {number} cryptoAmount - Amount in cryptocurrency
 * @param {string} coinSymbol - Cryptocurrency symbol
 * @param {string} fiatCurrency - GBP, USD, NGN
 * @param {number} fee - Fee percentage (e.g., 2.5 for 2.5%)
 * @returns {Promise<Object>} - { fiatAmount, pricePerUnit, totalWithFee, feeAmount }
 */
export const convertCryptoToFiat = async (cryptoAmount, coinSymbol, fiatCurrency = 'GBP', fee = 0) => {
  const amount = parseFloat(cryptoAmount);
  if (isNaN(amount) || amount <= 0) {
    return { fiatAmount: 0, pricePerUnit: 0, totalWithFee: 0, feeAmount: 0 };
  }

  const priceInGBP = await fetchLivePrice(coinSymbol);
  if (!priceInGBP) {
    return { fiatAmount: 0, pricePerUnit: 0, totalWithFee: 0, feeAmount: 0, error: 'Price unavailable' };
  }

  // Convert to target currency using exchange rates
  const exchangeRate = EXCHANGE_RATES[fiatCurrency] || 1.0;
  const priceInTargetCurrency = priceInGBP * exchangeRate;

  // Calculate fiat value
  const fiatValue = amount * priceInTargetCurrency;
  
  // Calculate fee
  const feeAmount = (fiatValue * fee) / 100;
  const totalWithFee = fiatValue + feeAmount;

  return {
    fiatAmount: parseFloat(fiatValue.toFixed(2)),
    pricePerUnit: priceInTargetCurrency,
    totalWithFee: parseFloat(totalWithFee.toFixed(2)),
    feeAmount: parseFloat(feeAmount.toFixed(2)),
    netAmount: parseFloat(fiatValue.toFixed(2))
  };
};

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} - Currency symbol
 */
export const getCurrencySymbol = (currency) => {
  const symbols = {
    'GBP': '£',
    'USD': '$',
    'EUR': '€',
    'NGN': '₦',
    'INR': '₹',
    'AUD': 'A$',
    'CAD': 'C$',
    'ZAR': 'R',
    'KES': 'KSh',
    'GHS': '₵',
    'JPY': '¥',
    'CNY': '¥',
    'BRL': 'R$',
    'MXN': '$',
    'CHF': 'Fr',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'AED': 'د.إ',
    'SAR': '﷼'
  };
  return symbols[currency] || currency;
};

/**
 * Format fiat amount with currency symbol
 * @param {number} amount - Fiat amount
 * @param {string} currency - Currency code
 * @returns {string} - Formatted string
 */
export const formatFiatAmount = (amount, currency = 'GBP') => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
};

/**
 * Format crypto amount
 * @param {number} amount - Crypto amount
 * @param {string} symbol - Crypto symbol
 * @returns {string} - Formatted string
 */
export const formatCryptoAmount = (amount, symbol = '') => {
  return `${parseFloat(amount).toFixed(8)} ${symbol}`.trim();
};

/**
 * Validate balance
 * @param {number} amount - Amount to check
 * @param {number} available - Available balance
 * @param {boolean} isCrypto - Whether amount is in crypto
 * @returns {Object} - { valid, message }
 */
export const validateBalance = (amount, available, isCrypto = false) => {
  const parsedAmount = parseFloat(amount);
  const parsedAvailable = parseFloat(available);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { valid: false, message: 'Please enter a valid amount' };
  }

  if (parsedAmount > parsedAvailable) {
    return { 
      valid: false, 
      message: `Insufficient balance. Available: ${isCrypto ? parsedAvailable.toFixed(8) : parsedAvailable.toFixed(2)}` 
    };
  }

  return { valid: true, message: '' };
};
