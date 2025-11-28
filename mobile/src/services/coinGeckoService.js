import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

class CoinGeckoService {
  // Get current prices for BTC, ETH, USDT
  async getCurrentPrices(vsCurrency = 'usd') {
    try {
      const response = await axios.get(`${COINGECKO_API}/simple/price`, {
        params: {
          ids: 'bitcoin,ethereum,tether',
          vs_currencies: vsCurrency,
          include_24hr_change: true,
        },
      });

      return {
        BTC: {
          price: response.data.bitcoin[vsCurrency],
          change24h: response.data.bitcoin[`${vsCurrency}_24h_change`],
        },
        ETH: {
          price: response.data.ethereum[vsCurrency],
          change24h: response.data.ethereum[`${vsCurrency}_24h_change`],
        },
        USDT: {
          price: response.data.tether[vsCurrency],
          change24h: response.data.tether[`${vsCurrency}_24h_change`],
        },
      };
    } catch (error) {
      console.error('CoinGecko API Error:', error);
      // Return fallback prices if API fails
      return {
        BTC: { price: 45000, change24h: 0 },
        ETH: { price: 2400, change24h: 0 },
        USDT: { price: 1, change24h: 0 },
      };
    }
  }

  // Calculate premium/discount percentage
  calculatePremium(offerPrice, marketPrice) {
    if (!marketPrice || marketPrice === 0) return 0;
    return (((offerPrice - marketPrice) / marketPrice) * 100).toFixed(2);
  }

  // Format price with currency symbol
  formatPrice(price, currency = 'USD') {
    const symbols = {
      USD: '$',
      GBP: '£',
      EUR: '€',
      BRL: 'R$',
      INR: '₹',
      AED: 'د.إ',
      CAD: 'C$',
      AUD: 'A$',
      NGN: '₦',
      KES: 'KSh',
      ZAR: 'R',
      JPY: '¥',
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export default new CoinGeckoService();
