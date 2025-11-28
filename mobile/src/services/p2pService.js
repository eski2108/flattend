import api from '../config/api';

class P2PService {
  // Get platform configuration
  async getConfig() {
    const response = await api.get('/p2p/config');
    return response.data;
  }

  // Get filtered offers
  async getOffers(filters = {}) {
    const params = {};
    if (filters.cryptoCurrency) params.crypto_currency = filters.cryptoCurrency;
    if (filters.fiatCurrency) params.fiat_currency = filters.fiatCurrency;
    if (filters.paymentMethod) params.payment_method = filters.paymentMethod;
    
    const response = await api.get('/p2p/offers', { params });
    return response.data;
  }

  // Preview order
  async previewOrder(sellOrderId, buyerId, cryptoAmount) {
    const response = await api.post('/p2p/preview-order', {
      sell_order_id: sellOrderId,
      buyer_id: buyerId,
      crypto_amount: cryptoAmount,
    });
    return response.data;
  }

  // Create trade
  async createTrade(sellOrderId, buyerId, cryptoAmount, paymentMethod) {
    const response = await api.post('/p2p/create-trade', {
      sell_order_id: sellOrderId,
      buyer_id: buyerId,
      crypto_amount: cryptoAmount,
      payment_method: paymentMethod,
    });
    return response.data;
  }

  // Get trade details
  async getTradeDetails(tradeId) {
    const response = await api.get(`/p2p/trade/${tradeId}`);
    return response.data;
  }

  // Mark trade as paid
  async markPaid(tradeId, buyerId, paymentReference = null) {
    const response = await api.post('/p2p/mark-paid', {
      trade_id: tradeId,
      buyer_id: buyerId,
      payment_reference: paymentReference,
    });
    return response.data;
  }

  // Release crypto
  async releaseCrypto(tradeId, sellerId) {
    const response = await api.post('/p2p/release-crypto', {
      trade_id: tradeId,
      seller_id: sellerId,
    });
    return response.data;
  }

  // Cancel trade
  async cancelTrade(tradeId, userId, reason = null) {
    const response = await api.post('/p2p/cancel-trade', {
      trade_id: tradeId,
      user_id: userId,
      reason: reason,
    });
    return response.data;
  }

  // Get user trades
  async getUserTrades(userId) {
    const response = await api.get(`/p2p/trades/user/${userId}`);
    return response.data;
  }

  // Send trade message
  async sendTradeMessage(tradeId, senderId, senderRole, message) {
    const response = await api.post('/p2p/trade/message', {
      trade_id: tradeId,
      sender_id: senderId,
      sender_role: senderRole,
      message: message,
    });
    return response.data;
  }

  // Get trade messages
  async getTradeMessages(tradeId) {
    const response = await api.get(`/p2p/trade/${tradeId}/messages`);
    return response.data;
  }
}

export default new P2PService();
