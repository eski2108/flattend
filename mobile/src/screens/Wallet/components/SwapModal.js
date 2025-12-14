import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import walletService from '../../../services/walletService';

const SwapModal = ({ visible, onClose, fromCurrency, balances, userId, onSuccess }) => {
  const [from, setFrom] = useState(fromCurrency || 'BTC');
  const [to, setTo] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (amount && from && to) {
      const mockRate = Math.random() * 10 + 1;
      setRate(mockRate);
      setToAmount((parseFloat(amount) * mockRate).toFixed(8));
    } else {
      setToAmount('');
    }
  }, [amount, from, to]);

  const handleSwap = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    setLoading(true);
    try {
      await walletService.swap(userId, from, to, parseFloat(amount));
      Alert.alert('Success', `Swapped ${amount} ${from} to ${toAmount} ${to}`);
      onClose();
      setAmount('');
      if (onSuccess) onSuccess();
    } catch (error) {
      Alert.alert('Error', 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  const fromBalance = balances.find(b => b.currency === from)?.total_balance || 0;
  const availableCoins = balances.filter(b => b.total_balance > 0).map(b => b.currency);

  return (
    <Modal isVisible={visible} onBackdropPress={onClose} style={styles.modal}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Swap Crypto</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.swapBox}>
          <Text style={styles.label}>From</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={from} onValueChange={setFrom} style={styles.picker} dropdownIconColor="#FFFFFF">
              {availableCoins.map(coin => <Picker.Item key={coin} label={coin} value={coin} color="#FFFFFF" />)}
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#9FA6B2"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.balance}>Available: {fromBalance.toFixed(8)} {from}</Text>
        </View>

        <View style={styles.swapIcon}>
          <View style={styles.swapIconCircle}>
            <Icon name="arrow-down" size={20} color="#F5C542" />
          </View>
        </View>

        <View style={styles.swapBox}>
          <Text style={styles.label}>To</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={to} onValueChange={setTo} style={styles.picker} dropdownIconColor="#FFFFFF">
              {balances.map(b => <Picker.Item key={b.currency} label={b.currency} value={b.currency} color="#FFFFFF" />)}
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#9FA6B2"
            value={toAmount}
            editable={false}
          />
        </View>

        {rate > 0 && (
          <View style={styles.rateBox}>
            <Text style={styles.rateLabel}>Exchange Rate</Text>
            <Text style={styles.rateValue}>1 {from} = {rate.toFixed(6)} {to}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSwap} disabled={loading || !amount}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Swap Now</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { margin: 0, justifyContent: 'flex-end' },
  container: { backgroundColor: '#111418', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  swapBox: { backgroundColor: '#0B0E11', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, color: '#9FA6B2', marginBottom: 8, fontWeight: '500' },
  pickerContainer: { backgroundColor: '#111418', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  picker: { color: '#FFFFFF', height: 50 },
  input: { backgroundColor: '#111418', borderWidth: 1, borderColor: 'rgba(0, 174, 239, 0.2)', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 16, marginBottom: 8 },
  balance: { fontSize: 13, color: '#9FA6B2' },
  swapIcon: { alignItems: 'center', marginVertical: 8 },
  swapIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245, 197, 66, 0.2)', borderWidth: 1, borderColor: '#F5C542', alignItems: 'center', justifyContent: 'center' },
  rateBox: { backgroundColor: 'rgba(245, 197, 66, 0.1)', borderWidth: 1, borderColor: '#F5C542', borderRadius: 12, padding: 12, marginBottom: 20 },
  rateLabel: { fontSize: 13, color: '#9FA6B2' },
  rateValue: { fontSize: 16, fontWeight: '600', color: '#F5C542', marginTop: 4 },
  button: { backgroundColor: '#F5C542', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default SwapModal;
