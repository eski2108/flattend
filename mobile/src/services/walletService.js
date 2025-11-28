import api from '../config/api';

class WalletService {
  // Get user's crypto balances
  async getBalance(userId) {
    const response = await api.get(`/crypto-bank/balances/${userId}`);
    return response.data;
  }

  // Get withdrawal fee config
  async getWithdrawalFeeConfig() {
    const response = await api.get('/crypto-bank/withdrawal-fee-config');
    return response.data;
  }

  // Withdraw crypto (with fee)
  async withdraw(userId, currency, amount, walletAddress) {
    const response = await api.post('/crypto-bank/withdraw', {
      user_id: userId,
      currency,
      amount,
      wallet_address: walletAddress,
    });
    return response.data;
  }

  // Get transaction history
  async getTransactions(userId) {
    const response = await api.get(`/crypto-bank/transactions/${userId}`);
    return response.data;
  }

  // Calculate withdrawal fee
  calculateWithdrawalFee(amount, feePercent = 1.5) {
    const fee = (amount * feePercent) / 100;
    const netAmount = amount - fee;
    return { fee, netAmount };
  }
}

export default new WalletService();
