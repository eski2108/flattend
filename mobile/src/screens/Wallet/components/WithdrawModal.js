import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import walletService from '../../../services/walletService';

const WithdrawModal = ({ visible, onClose, currency, userId, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || !address) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await walletService.requestWithdrawal(userId, currency, parseFloat(amount), address);
      Alert.alert('Success', 'Withdrawal request submitted');
      onClose();
      setAmount('');
      setAddress('');
      if (onSuccess) onSuccess();
    } catch (error) {
      Alert.alert('Error', error.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const fee = parseFloat(amount) * 0.005 || 0;
  const netAmount = parseFloat(amount) - fee || 0;

  return (
    <Modal isVisible={visible} onBackdropPress={onClose} style={styles.modal}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Withdraw {currency}</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Amount"
          placeholderTextColor="#9FA6B2"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <TextInput
          style={styles.input}
          placeholder="Destination Address"
          placeholderTextColor="#9FA6B2"
          value={address}
          onChangeText={setAddress}
        />

        {amount && (
          <View style={styles.feeBox}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Amount</Text>
              <Text style={styles.feeValue}>{parseFloat(amount).toFixed(8)} {currency}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Fee (0.5%)</Text>
              <Text style={[styles.feeValue, { color: '#F5C542' }]}>{fee.toFixed(8)} {currency}</Text>
            </View>
            <View style={[styles.feeRow, styles.feeTotal]}>
              <Text style={styles.feeLabelBold}>You receive</Text>
              <Text style={styles.feeValueBold}>{netAmount.toFixed(8)} {currency}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleWithdraw} disabled={loading || !amount || !address}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Withdraw {currency}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { margin: 0, justifyContent: 'flex-end' },
  container: { backgroundColor: '#111418', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  input: { backgroundColor: '#0B0E11', borderWidth: 1, borderColor: 'rgba(0, 174, 239, 0.2)', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 16, marginBottom: 16 },
  feeBox: { backgroundColor: '#0B0E11', borderRadius: 12, padding: 16, marginBottom: 20 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  feeTotal: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 8 },
  feeLabel: { fontSize: 14, color: '#9FA6B2' },
  feeValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  feeLabelBold: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  feeValueBold: { fontSize: 16, fontWeight: '700', color: '#00C98D' },
  button: { backgroundColor: '#E35355', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default WithdrawModal;
