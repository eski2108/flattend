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
import Modal from 'react-native-modal';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';
import coinGeckoService from '../../services/coinGeckoService';
import Input from '../../components/Input';
import Button from '../../components/Button';

const WalletScreen = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [marketPrices, setMarketPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load balances
      const balanceResponse = await walletService.getBalance(user.user_id);
      setBalances(balanceResponse.balances || []);

      // Load market prices
      const prices = await coinGeckoService.getCurrentPrices('usd');
      setMarketPrices(prices);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!walletAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    const selectedBalance = balances.find(b => b.currency === selectedCurrency);
    if (amount > selectedBalance.available_balance) {
      Alert.alert('Error', `Insufficient balance. Available: ${selectedBalance.available_balance} ${selectedCurrency}`);
      return;
    }

    const { fee, netAmount } = walletService.calculateWithdrawalFee(amount, 1.0);

    Alert.alert(
      'Confirm Withdrawal',
      `Withdraw ${amount} ${selectedCurrency}?\n\nPlatform Fee (1%): ${fee.toFixed(8)} ${selectedCurrency}\nYou will receive: ${netAmount.toFixed(8)} ${selectedCurrency}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setWithdrawing(true);
              await walletService.withdraw(user.user_id, selectedCurrency, amount, walletAddress);
              Alert.alert('Success', 'Withdrawal processed successfully!');
              setShowWithdrawModal(false);
              setWithdrawAmount('');
              setWalletAddress('');
              await loadData();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Withdrawal failed');
            } finally {
              setWithdrawing(false);
            }
          }
        }
      ]
    );
  };

  const openWithdrawModal = (currency) => {
    setSelectedCurrency(currency);
    setWithdrawAmount('');
    setWalletAddress('');
    setShowWithdrawModal(true);
  };

  const renderBalanceCard = (balance) => {
    const marketPrice = marketPrices[balance.currency]?.price || 0;
    const valueUSD = balance.balance * marketPrice;
    const availableValueUSD = balance.available_balance * marketPrice;

    return (
      <View key={balance.currency} style={styles.balanceCard}>
        <LinearGradient
          colors={['rgba(26, 31, 58, 0.8)', 'rgba(19, 24, 41, 0.6)']}
          style={styles.balanceGradient}
        >
          {/* Header */}
          <View style={styles.balanceHeader}>
            <View style={styles.currencyIcon}>
              <Icon name="logo-bitcoin" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.currencyInfo}>
              <Text style={styles.currencyName}>{balance.currency}</Text>
              <Text style={styles.currencyFullName}>
                {balance.currency === 'BTC' ? 'Bitcoin' : balance.currency === 'ETH' ? 'Ethereum' : 'Tether USD'}
              </Text>
            </View>
          </View>

          {/* Balance */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>
              {balance.balance.toFixed(8)} {balance.currency}
            </Text>
            <Text style={styles.balanceUSD}>
              ≈ ${valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Available vs Locked */}
          <View style={styles.balanceBreakdown}>
            <View style={styles.breakdownItem}>
              <Icon name="checkmark-circle" size={16} color={COLORS.success} />
              <View style={styles.breakdownText}>
                <Text style={styles.breakdownLabel}>Available</Text>
                <Text style={styles.breakdownValue}>
                  {balance.available_balance.toFixed(8)} {balance.currency}
                </Text>
              </View>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Icon name="lock-closed" size={16} color={COLORS.warning} />
              <View style={styles.breakdownText}>
                <Text style={styles.breakdownLabel}>Locked</Text>
                <Text style={styles.breakdownValue}>
                  {balance.locked_balance.toFixed(8)} {balance.currency}
                </Text>
              </View>
            </View>
          </View>

          {/* Withdraw Button */}
          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={() => openWithdrawModal(balance.currency)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.withdrawButtonGradient}
            >
              <Icon name="arrow-up-circle-outline" size={20} color="#000" />
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderWithdrawModal = () => {
    const selectedBalance = balances.find(b => b.currency === selectedCurrency);
    const amount = parseFloat(withdrawAmount) || 0;
    const { fee, netAmount } = walletService.calculateWithdrawalFee(amount, 1.0);

    return (
      <Modal
        isVisible={showWithdrawModal}
        onBackdropPress={() => setShowWithdrawModal(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Withdraw {selectedCurrency}</Text>
            <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Input
              label="Amount"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              placeholder="0.00000000"
            />

            {selectedBalance && (
              <TouchableOpacity
                style={styles.maxButton}
                onPress={() => setWithdrawAmount(selectedBalance.available_balance.toString())}
              >
                <Text style={styles.maxButtonText}>Max: {selectedBalance.available_balance.toFixed(8)}</Text>
              </TouchableOpacity>
            )}

            <Input
              label="Wallet Address"
              value={walletAddress}
              onChangeText={setWalletAddress}
              placeholder="Enter destination wallet address"
              autoCapitalize="none"
              style={styles.walletInput}
            />

            {amount > 0 && (
              <View style={styles.feeBreakdown}>
                <Text style={styles.feeTitle}>💡 WITHDRAWAL BREAKDOWN</Text>
                <View style={styles.feeDivider} />
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Amount Entered:</Text>
                  <Text style={styles.feeValue}>{amount.toFixed(8)} {selectedCurrency}</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Withdrawal Fee (1.5%):</Text>
                  <Text style={styles.feeValueNegative}>-{fee.toFixed(8)} {selectedCurrency}</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>✨ You Will Receive:</Text>
                  <Text style={styles.feeValueLarge}>{netAmount.toFixed(8)} {selectedCurrency}</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeNote}>
                  <Icon name="flash" size={14} color={COLORS.warning} />
                  <Text style={styles.feeNoteText}>Fee automatically routed to platform wallet</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Confirm Withdrawal"
              onPress={handleWithdraw}
              loading={withdrawing}
              disabled={!withdrawAmount || !walletAddress}
            />
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {balances.map(renderBalanceCard)}
      </ScrollView>
      {renderWithdrawModal()}
    </View>
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
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },

  // Balance Card
  balanceCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  balanceGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  currencyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  currencyInfo: {
    marginLeft: 16,
  },
  currencyName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  currencyFullName: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },

  // Balance Section
  balanceSection: {
    marginBottom: 20,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  balanceAmount: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  balanceUSD: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  // Breakdown
  balanceBreakdown: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  breakdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownText: {
    marginLeft: 8,
  },
  breakdownLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  breakdownValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // Withdraw Button
  withdrawButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  withdrawButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  withdrawButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },

  // Modal
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalBody: {
    padding: 20,
  },
  maxButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
  },
  maxButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  walletInput: {
    marginBottom: 24,
  },

  // Fee Breakdown
  feeBreakdown: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  feeTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 12,
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  feeValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  feeValueNegative: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
  },
  feeValueLarge: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  feeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeNoteText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },

  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default WalletScreen;
