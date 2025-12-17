import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://cryptodash-22.preview.emergentagent.com/api';

const SWAP_CURRENCIES = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'LTC', 'USDC', 'XRP', 'ADA', 'DOGE'];

export default function SwapScreen({ navigation }) {
  const [fromCurrency, setFromCurrency] = useState('BTC');
  const [toCurrency, setToCurrency] = useState('USDT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('0.00000000');
  const [swapPreview, setSwapPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [balances, setBalances] = useState({});

  useEffect(() => {
    fetchBalances();
  }, []);

  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      previewSwap();
    } else {
      setSwapPreview(null);
      setToAmount('0.00000000');
    }
  }, [fromAmount, fromCurrency, toCurrency]);

  const fetchBalances = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      const response = await axios.get(`${API_URL}/trader/my-balances/${user.user_id}`);
      if (response.data.success) {
        const balanceMap = {};
        response.data.balances.forEach(bal => {
          balanceMap[bal.currency] = bal.available_balance || 0;
        });
        setBalances(balanceMap);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const previewSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;

    try {
      const response = await axios.post(`${API_URL}/swap/preview`, {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: parseFloat(fromAmount)
      });

      if (response.data.success) {
        setSwapPreview(response.data);
        setToAmount(response.data.to_amount.toFixed(8));
      }
    } catch (error) {
      console.error('Error previewing swap:', error);
    }
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount('');
    setToAmount('0.00000000');
    setSwapPreview(null);
  };

  const executeSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) {
      Alert.alert('Error', 'Please login to swap crypto');
      return;
    }
    const user = JSON.parse(userStr);

    const availableBalance = balances[fromCurrency] || 0;
    if (parseFloat(fromAmount) > availableBalance) {
      Alert.alert('Error', `Insufficient ${fromCurrency} balance`);
      return;
    }

    setSwapping(true);
    try {
      const response = await axios.post(`${API_URL}/swap/execute`, {
        user_id: user.user_id,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: parseFloat(fromAmount)
      });

      if (response.data.success) {
        Alert.alert('Success', response.data.message);
        setFromAmount('');
        setToAmount('0.00000000');
        setSwapPreview(null);
        fetchBalances();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to execute swap');
    } finally {
      setSwapping(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00F0FF" />
        </TouchableOpacity>
        <Text style={styles.title}>Swap Crypto</Text>
      </View>

      <View style={styles.card}>
        {/* From Currency */}
        <View style={styles.section}>
          <Text style={styles.label}>From</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              value={fromAmount}
              onChangeText={setFromAmount}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.currencyButton}>
              <Text style={styles.currencyText}>{fromCurrency}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>
              Balance: {(balances[fromCurrency] || 0).toFixed(8)} {fromCurrency}
            </Text>
          </View>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
          <Ionicons name="swap-vertical" size={24} color="#00F0FF" />
        </TouchableOpacity>

        {/* To Currency */}
        <View style={styles.section}>
          <Text style={styles.label}>To (Estimated)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.amountInput, styles.toAmount]}
              value={toAmount}
              editable={false}
              placeholderTextColor="rgba(168, 85, 247, 0.5)"
            />
            <TouchableOpacity style={styles.currencyButton}>
              <Text style={styles.currencyText}>{toCurrency}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>
              Balance: {(balances[toCurrency] || 0).toFixed(8)} {toCurrency}
            </Text>
          </View>
        </View>

        {/* Swap Details */}
        {swapPreview && (
          <View style={styles.details}>
            <Text style={styles.detailsTitle}>Swap Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rate:</Text>
              <Text style={styles.detailValue}>
                1 {fromCurrency} = {swapPreview.rate.toFixed(8)} {toCurrency}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Swap Fee (1.5%):</Text>
              <Text style={[styles.detailValue, styles.feeText]}>
                {swapPreview.swap_fee_crypto.toFixed(8)} {fromCurrency}
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabelBold}>You Get:</Text>
              <Text style={styles.detailValueBold}>
                {swapPreview.to_amount.toFixed(8)} {toCurrency}
              </Text>
            </View>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!fromAmount || swapping) && styles.confirmButtonDisabled
          ]}
          onPress={executeSwap}
          disabled={!fromAmount || swapping}
        >
          {swapping ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Swap</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Info Notice */}
      <View style={styles.notice}>
        <Ionicons name="information-circle" size={20} color="#22C55E" />
        <Text style={styles.noticeText}>
          All swaps are processed instantly using real-time market prices. A 1.5% fee is applied.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00F0FF',
    textTransform: 'uppercase',
  },
  card: {
    margin: 16,
    padding: 20,
    backgroundColor: 'rgba(26, 31, 58, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  toAmount: {
    color: '#A855F7',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  currencyButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: 10,
    justifyContent: 'center',
  },
  currencyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  balanceText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  swapButton: {
    alignSelf: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#00F0FF',
    marginVertical: 12,
  },
  details: {
    padding: 16,
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    marginBottom: 16,
  },
  detailsTitle: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  feeText: {
    color: '#F59E0B',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    marginVertical: 8,
  },
  detailLabelBold: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '700',
  },
  detailValueBold: {
    color: '#00F0FF',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButton: {
    padding: 16,
    backgroundColor: '#00F0FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(0, 240, 255, 0.3)',
  },
  confirmButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: '700',
  },
  notice: {
    flexDirection: 'row',
    margin: 16,
    padding: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    gap: 12,
  },
  noticeText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
});
