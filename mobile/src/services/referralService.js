import api from '../config/api';

class ReferralService {
  async getReferralDashboard(userId) {
    try {
      const response = await api.get(`/referral/dashboard/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get referral dashboard error:', error);
      throw error;
    }
  }

  async getReferralStats(userId) {
    try {
      const response = await api.get(`/referral/stats/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get referral stats error:', error);
      throw error;
    }
  }

  async getReferralEarnings(userId) {
    try {
      const response = await api.get(`/referral/earnings/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get referral earnings error:', error);
      throw error;
    }
  }
}

export default new ReferralService();
