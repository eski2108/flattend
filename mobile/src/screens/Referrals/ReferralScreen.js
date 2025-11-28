import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Clipboard,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import referralService from '../../services/referralService';

const ReferralScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referralData, setReferralData] = useState(null);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      const data = await referralService.getReferralDashboard(user.user_id);
      setReferralData(data);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      Alert.alert('Error', 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReferralData();
    setRefreshing(false);
  };

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const shareReferralLink = async () => {
    if (!referralData) return;

    try {
      await Share.share({
        message: `Join Coin Hub X and get 0% fees for 30 days! Use my referral code: ${referralData.referral_code}\\n\\n${referralData.referral_link}`,
        title: 'Join Coin Hub X',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading referral data...</Text>
      </View>
    );
  }

  if (!referralData) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load referral data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReferralData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalEarnings = referralData.earnings_by_currency.reduce(
    (sum, earning) => sum + earning.total_earned,
    0
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.header}
      >
        <Icon name="gift-outline" size={48} color="#000" />
        <Text style={styles.headerTitle}>Referral Program</Text>
        <Text style={styles.headerSubtitle}>Earn 20% commission for 12 months!</Text>
      </LinearGradient>

      {/* Referral Code Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Referral Code</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.code}>{referralData.referral_code}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => copyToClipboard(referralData.referral_code, 'Referral code')}
          >
            <Icon name="copy-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardLabel}>Referral Link</Text>
        <View style={styles.linkContainer}>
          <Text style={styles.link} numberOfLines={1}>
            {referralData.referral_link}
          </Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => copyToClipboard(referralData.referral_link, 'Referral link')}
          >
            <Icon name="copy-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Share Buttons */}
      <View style={styles.shareContainer}>
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: '#25D366' }]}
          onPress={shareReferralLink}
        >
          <Icon name="logo-whatsapp" size={24} color="#FFF" />
          <Text style={styles.shareText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: '#0088cc' }]}
          onPress={shareReferralLink}
        >
          <Icon name="paper-plane-outline" size={24} color="#FFF" />
          <Text style={styles.shareText}>Telegram</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: COLORS.primary }]}
          onPress={shareReferralLink}
        >
          <Icon name="share-social-outline" size={24} color="#000" />
          <Text style={[styles.shareText, { color: '#000' }]}>More</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderColor: COLORS.primary }]}>
          <Icon name="people-outline" size={32} color={COLORS.primary} />
          <Text style={styles.statValue}>{referralData.total_signups}</Text>
          <Text style={styles.statLabel}>Total Signups</Text>
        </View>
        <View style={[styles.statCard, { borderColor: COLORS.secondary }]}>
          <Icon name="cash-outline" size={32} color={COLORS.secondary} />
          <Text style={styles.statValue}>${totalEarnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Commission Earned</Text>
        </View>
        <View style={[styles.statCard, { borderColor: COLORS.warning }]}>
          <Icon name="trending-up-outline" size={32} color={COLORS.warning} />
          <Text style={styles.statValue}>{referralData.active_referrals}</Text>
          <Text style={styles.statLabel}>Active Referrals</Text>
        </View>
        <View style={[styles.statCard, { borderColor: COLORS.success }]}>
          <Icon name="trending-up-outline" size={32} color={COLORS.success} />
          <Text style={styles.statValue}>{referralData.total_trades}</Text>
          <Text style={styles.statLabel}>Referral Orders</Text>
        </View>
      </View>

      {/* Commission Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Icon name="information-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.infoTitle}>Commission Details</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Commission Rate:</Text>
          <Text style={styles.infoValue}>20%</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duration:</Text>
          <Text style={styles.infoValue}>12 months per referral</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Earnings Source:</Text>
          <Text style={styles.infoValue}>Platform fees</Text>
        </View>
      </View>

      {/* Earnings Breakdown */}
      {referralData.earnings_by_currency.length > 0 && (
        <View style={styles.earningsCard}>
          <Text style={styles.cardTitle}>Earnings by Currency</Text>
          {referralData.earnings_by_currency.map((earning, index) => (
            <View key={index} style={styles.earningRow}>
              <Text style={styles.earningCurrency}>{earning.currency}</Text>
              <View style={styles.earningDetails}>
                <Text style={styles.earningTotal}>
                  {earning.total_earned.toFixed(8)} {earning.currency}
                </Text>
                <Text style={styles.earningBreakdown}>
                  Pending: {earning.pending.toFixed(8)} | Paid: {earning.paid.toFixed(8)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* How It Works */}
      <View style={styles.howItWorksCard}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Share your referral link with friends</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>They sign up using your link</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>You earn 20% of their trading fees for 12 months</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>Watch your earnings grow!</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    color: COLORS.error,
    fontSize: 18,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.7)',
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  code: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  link: {
    flex: 1,
    fontSize: 12,
    color: COLORS.secondary,
  },
  shareContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  shareText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.cardBackground,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  earningsCard: {
    backgroundColor: COLORS.cardBackground,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  earningCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  earningDetails: {
    alignItems: 'flex-end',
  },
  earningTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  earningBreakdown: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  howItWorksCard: {
    backgroundColor: COLORS.cardBackground,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  stepContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});

export default ReferralScreen;
