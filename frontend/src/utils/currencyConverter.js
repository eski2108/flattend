import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Cache for prices to avoid excessive API calls
let priceCache = {};
let lastFetchTime = {};
const CACHE_DURATION = 30000; // 30 seconds

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
    const response = await axios.get(`${API}/api/pricing/live/${coinSymbol}`);
    if (response.data.success && response.data.price_gbp) {
      priceCache[coinSymbol] = response.data.price_gbp;
      lastFetchTime[coinSymbol] = now;
      return response.data.price_gbp;
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

  // Convert to GBP if different currency
  let priceInTargetCurrency = priceInGBP;
  if (fiatCurrency === 'USD') {
    priceInTargetCurrency = priceInGBP * 1.27; // Approximate conversion
  } else if (fiatCurrency === 'NGN') {
    priceInTargetCurrency = priceInGBP * 1960; // Approximate conversion
  }

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

  // Convert to target currency
  let priceInTargetCurrency = priceInGBP;
  if (fiatCurrency === 'USD') {
    priceInTargetCurrency = priceInGBP * 1.27;
  } else if (fiatCurrency === 'NGN') {
    priceInTargetCurrency = priceInGBP * 1960;
  }

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
 * @param {string} currency - GBP, USD, NGN
 * @returns {string} - Currency symbol
 */
export const getCurrencySymbol = (currency) => {
  const symbols = {
    'GBP': '£',
    'USD': '$',
    'NGN': '₦'
  };
  return symbols[currency] || '£';
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
