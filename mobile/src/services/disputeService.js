import api from '../config/api';

class DisputeService {
  async initiateDispute(tradeId, userId, reason, description) {
    try {
      const response = await api.post('/disputes/initiate', {
        trade_id: tradeId,
        user_id: userId,
        reason,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Initiate dispute error:', error);
      throw error;
    }
  }

  async getDisputeDetails(disputeId) {
    try {
      const response = await api.get(`/disputes/${disputeId}`);
      return response.data;
    } catch (error) {
      console.error('Get dispute details error:', error);
      throw error;
    }
  }
}

export default new DisputeService();
