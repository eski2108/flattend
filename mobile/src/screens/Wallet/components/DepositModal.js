import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import walletService from '../../../services/walletService';

const DepositModal = ({ visible, onClose, currency, userId }) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && currency && userId) {
      loadAddress();
    }
  }, [visible, currency, userId]);

  const loadAddress = async () => {
    setLoading(true);
    try {
      const response = await walletService.getDepositAddress(currency, userId);
      setAddress(response.address || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load deposit address');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    Clipboard.setString(address);
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  return (
    <Modal isVisible={visible} onBackdropPress={onClose} style={styles.modal}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Deposit {currency}</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#00AEEF" />
          </View>
        ) : (
          <>
            <View style={styles.qrContainer}>
              <QRCode value={address} size={200} backgroundColor="#FFFFFF" />
            </View>

            <View style={styles.addressBox}>
              <Text style={styles.addressLabel}>Your {currency} Deposit Address</Text>
              <Text style={styles.addressText}>{address}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={copyAddress}>
                <Icon name="copy" size={18} color="#00AEEF" />
                <Text style={styles.copyText}>Copy Address</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Icon name="warning" size={20} color="#F5C542" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Important</Text>
                <Text style={styles.warningText}>• Only send {currency} to this address</Text>
                <Text style={styles.warningText}>• Minimum deposit: 0.0001 {currency}</Text>
                <Text style={styles.warningText}>• Funds appear after network confirmations</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { margin: 0, justifyContent: 'flex-end' },
  container: { backgroundColor: '#111418', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  loading: { paddingVertical: 60, alignItems: 'center' },
  qrContainer: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, alignSelf: 'center', marginBottom: 24 },
  addressBox: { backgroundColor: '#0B0E11', borderWidth: 1, borderColor: 'rgba(0, 174, 239, 0.2)', borderRadius: 12, padding: 16, marginBottom: 16 },
  addressLabel: { fontSize: 13, color: '#9FA6B2', marginBottom: 8, fontWeight: '500' },
  addressText: { fontSize: 14, color: '#FFFFFF', fontFamily: 'monospace', marginBottom: 12 },
  copyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 174, 239, 0.2)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: '#00AEEF' },
  copyText: { color: '#00AEEF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  warningBox: { flexDirection: 'row', backgroundColor: 'rgba(245, 197, 66, 0.1)', borderWidth: 1, borderColor: '#F5C542', borderRadius: 12, padding: 16 },
  warningContent: { flex: 1, marginLeft: 12 },
  warningTitle: { fontSize: 14, fontWeight: '600', color: '#F5C542', marginBottom: 8 },
  warningText: { fontSize: 13, color: '#9FA6B2', marginBottom: 4 },
});

export default DepositModal;
