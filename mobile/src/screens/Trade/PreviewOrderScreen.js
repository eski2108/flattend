import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import p2pService from '../../services/p2pService';
import coinGeckoService from '../../services/coinGeckoService';
import Input from '../../components/Input';
import Button from '../../components/Button';

const PreviewOrderScreen = ({ route, navigation }) => {
  const { offer } = route.params;
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [inputMode, setInputMode] = useState('fiat'); // 'fiat' (GBP) or 'crypto' (BTC)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [livePrice, setLivePrice] = useState(null);

  useEffect(() => {
    if (offer.payment_methods && offer.payment_methods.length > 0) {
      setSelectedPaymentMethod(offer.payment_methods[0]);
    }
    // Fetch live price for conversion
    fetchLivePrice();
  }, []);

  const fetchLivePrice = async () => {
    try {
      const response = await coinGeckoService.getPrice(
        offer.crypto_currency.toLowerCase(),
        offer.fiat_currency.toLowerCase()
      );
      setLivePrice(response[offer.crypto_currency.toLowerCase()][offer.fiat_currency.toLowerCase()]);
    } catch (error) {
      console.error('Failed to fetch live price:', error);
      setLivePrice(offer.price_per_unit); // Fallback to offer price
    }
  };

  const toggleInputMode = () => {
    // Convert current value to other mode
    const amountNum = parseFloat(amount) || 0;
    const price = livePrice || offer.price_per_unit;
    
    if (inputMode === 'fiat') {
      // Converting from GBP to BTC
      const btcAmount = amountNum / price;
      setAmount(btcAmount.toFixed(8));
      setInputMode('crypto');
    } else {
      // Converting from BTC to GBP
      const fiatAmount = amountNum * price;
      setAmount(fiatAmount.toFixed(2));
      setInputMode('fiat');
    }
  };

  const calculateTotals = () => {
    const amountNum = parseFloat(amount) || 0;
    const price = livePrice || offer.price_per_unit;
    
    let cryptoAmount, fiatAmount;
    
    if (inputMode === 'fiat') {
      // User entered GBP, calculate BTC
      fiatAmount = amountNum;
      cryptoAmount = amountNum / price;
    } else {
      // User entered BTC, calculate GBP
      cryptoAmount = amountNum;
      fiatAmount = amountNum * price;
    }
    
    return {
      cryptoAmount: cryptoAmount,
      fiatAmount: fiatAmount,
      pricePerUnit: price,
    };
  };

  const handlePreview = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amountNum < offer.min_purchase) {
      Alert.alert('Error', `Minimum purchase is ${offer.min_purchase} ${offer.crypto_currency}`);
      return;
    }

    if (amountNum > offer.max_purchase) {
      Alert.alert('Error', `Maximum purchase is ${offer.max_purchase} ${offer.crypto_currency}`);
      return;
    }

    try {
      setLoading(true);
      const response = await p2pService.previewOrder(
        offer.order_id,
        user.user_id,
        amountNum
      );
      setPreview(response.preview);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to preview order');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTrade = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    Alert.alert(
      'Confirm Trade',
      `You are about to buy ${amount} ${offer.crypto_currency} for ${coinGeckoService.formatPrice(calculateTotals().fiatAmount, offer.fiat_currency)}. The seller's crypto will be locked in escrow. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await p2pService.createTrade(
                offer.order_id,
                user.user_id,
                parseFloat(amount),
                selectedPaymentMethod
              );
              
              Alert.alert('Success', 'Trade created successfully!', [
                {
                  text: 'View Trade',
                  onPress: () => navigation.replace('Trade', { tradeId: response.trade.trade_id })
                }
              ]);
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to create trade');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const totals = calculateTotals();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Seller Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seller Information</Text>
        <View style={styles.sellerCard}>
          <LinearGradient
            colors={['rgba(26, 31, 58, 0.8)', 'rgba(19, 24, 41, 0.6)']}
            style={styles.sellerGradient}
          >
            <View style={styles.sellerHeader}>
              <View style={styles.sellerAvatar}>
                <Icon name="person" size={32} color={COLORS.primary} />
              </View>
              <View style={styles.sellerInfo}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{offer.seller_name || 'Seller'}</Text>
                  {offer.is_verified && (
                    <Icon name="shield-checkmark" size={20} color={COLORS.success} />
                  )}
                </View>
                <View style={styles.sellerStatsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{offer.total_trades || 0}</Text>
                    <Text style={styles.statLabel}>Trades</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{offer.completion_rate || 100}%</Text>
                    <Text style={styles.statLabel}>Completion</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{offer.avg_release_time || '< 15'} min</Text>
                    <Text style={styles.statLabel}>Avg. Release</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Requirements Tags */}
            {offer.seller_requirements && offer.seller_requirements.length > 0 && (
              <View style={styles.requirementsSection}>
                <Text style={styles.requirementsTitle}>Requirements:</Text>
                <View style={styles.requirementsTags}>
                  {offer.seller_requirements.map((req, index) => (
                    <View key={index} style={styles.requirementTag}>
                      <Icon name="checkmark-circle" size={14} color={COLORS.primary} />
                      <Text style={styles.requirementText}>{req.label || req.tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Enter Amount</Text>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={toggleInputMode}
          >
            <Text style={styles.toggleButtonText}>
              {inputMode === 'fiat' ? '£' : offer.crypto_currency} → {inputMode === 'fiat' ? offer.crypto_currency : '£'}
            </Text>
            <Icon name="swap-horizontal" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <Input
          label={`Amount (${inputMode === 'fiat' ? `£ ${offer.fiat_currency}` : offer.crypto_currency})`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={inputMode === 'fiat' ? 'Enter amount in £' : `Min: ${offer.min_purchase} | Max: ${offer.max_purchase}`}
        />
        {/* Live Conversion Display */}
        {amount && parseFloat(amount) > 0 && (
          <View style={styles.conversionBox}>
            <Text style={styles.conversionText}>
              {inputMode === 'fiat' 
                ? `≈ ${calculateTotals().cryptoAmount.toFixed(8)} ${offer.crypto_currency}`
                : `≈ £${calculateTotals().fiatAmount.toFixed(2)}`
              }
            </Text>
            <Text style={styles.conversionRate}>
              Live rate: 1 {offer.crypto_currency} = £{(livePrice || offer.price_per_unit).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.limitsRow}>
          <TouchableOpacity
            style={styles.limitButton}
            onPress={() => {
              const minAmount = inputMode === 'fiat' 
                ? (offer.min_purchase * (livePrice || offer.price_per_unit)).toFixed(2)
                : offer.min_purchase.toString();
              setAmount(minAmount);
            }}
          >
            <Text style={styles.limitButtonText}>Min</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.limitButton}
            onPress={() => {
              const maxAmount = inputMode === 'fiat' 
                ? (offer.max_purchase * (livePrice || offer.price_per_unit)).toFixed(2)
                : offer.max_purchase.toString();
              setAmount(maxAmount);
            }}
          >
            <Text style={styles.limitButtonText}>Max</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Summary */}
      {amount && parseFloat(amount) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(0, 240, 255, 0.1)', 'rgba(168, 85, 247, 0.1)']}
              style={styles.summaryGradient}
            >
              {/* You Receive */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>You Receive</Text>
                <Text style={styles.summaryValueLarge}>
                  {totals.cryptoAmount} {offer.crypto_currency}
                </Text>
              </View>
              
              <View style={styles.summaryDivider} />

              {/* You Pay */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>You Pay</Text>
                <Text style={styles.summaryValue}>
                  {coinGeckoService.formatPrice(totals.fiatAmount, offer.fiat_currency)}
                </Text>
              </View>

              {/* Price Per Unit */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price per {offer.crypto_currency}</Text>
                <Text style={styles.summaryValue}>
                  {coinGeckoService.formatPrice(offer.price_per_unit, offer.fiat_currency)}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}

      {/* Payment Method Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {offer.payment_methods && offer.payment_methods.map((method, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.paymentMethodCard,
              selectedPaymentMethod === method && styles.paymentMethodCardActive
            ]}
            onPress={() => setSelectedPaymentMethod(method)}
          >
            <View style={styles.paymentMethodContent}>
              <View style={styles.paymentMethodIcon}>
                <Icon 
                  name={selectedPaymentMethod === method ? "radio-button-on" : "radio-button-off"}
                  size={24} 
                  color={selectedPaymentMethod === method ? COLORS.primary : COLORS.textMuted} 
                />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>{method}</Text>
                <Text style={styles.paymentMethodTime}>Est. time: ~60 min</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Escrow Protection Notice */}
      <View style={styles.escrowNotice}>
        <Icon name="shield-checkmark" size={24} color={COLORS.success} />
        <View style={styles.escrowNoticeText}>
          <Text style={styles.escrowNoticeTitle}>Escrow Protection</Text>
          <Text style={styles.escrowNoticeSubtitle}>
            The seller's crypto will be locked in escrow when you confirm this trade.
            It will only be released after you mark the payment as sent and the seller confirms receipt.
          </Text>
        </View>
      </View>

      {/* Risk Warning */}
      <View style={styles.warningBox}>
        <Icon name="warning" size={20} color={COLORS.warning} />
        <Text style={styles.warningText}>
          Only mark payment as sent after you have actually transferred the money.
          Keep all communication in-app for dispute protection.
        </Text>
      </View>

      {/* Confirm Button */}
      <Button
        title="Confirm & Start Trade"
        onPress={handleConfirmTrade}
        loading={loading}
        disabled={!amount || parseFloat(amount) <= 0 || !selectedPaymentMethod}
        style={styles.confirmButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Seller Card
  sellerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sellerGradient: {
    padding: 16,
  },
  sellerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sellerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sellerName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  sellerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },

  // Requirements
  requirementsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  requirementsTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 4,
  },
  requirementText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Limits
  limitsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  limitButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  limitButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Summary Card
  summaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryValueLarge: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  // Payment Method
  paymentMethodCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  paymentMethodCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  paymentMethodTime: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },

  // Escrow Notice
  escrowNotice: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.success,
    marginBottom: 16,
  },
  escrowNoticeText: {
    flex: 1,
    marginLeft: 12,
  },
  escrowNoticeTitle: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  escrowNoticeSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  // Warning
  warningBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.warning,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 12,
  },

  confirmButton: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  toggleButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  conversionBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  conversionText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  conversionRate: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});

export default PreviewOrderScreen;
