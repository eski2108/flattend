import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Modal from 'react-native-modal';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';
import WithdrawModal from './components/WithdrawModal';
import SwapModal from './components/SwapModal';
import DepositModal from './components/DepositModal';

const { width } = Dimensions.get('window');

const WalletScreen = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const balanceResponse = await walletService.getBalance(user.user_id);
      setBalances(balanceResponse.balances || []);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCoinIcon = (symbol) => {
    const icons = {
      BTC: '₿', ETH: 'Ξ', USDT: '₮', XRP: 'X', LTC: 'Ł',
      ADA: '₳', DOT: '●', DOGE: 'Ð', BNB: 'B', SOL: 'S',
    };
    return icons[symbol] || symbol[0];
  };

  const getCoinColor = (symbol) => {
    const colors = {
      BTC: '#F7931A', ETH: '#627EEA', USDT: '#26A17B', XRP: '#00AAE4',
      LTC: '#345D9D', ADA: '#0033AD', DOT: '#E6007A', DOGE: '#C2A633',
      BNB: '#F3BA2F', SOL: '#14F195',
    };
    return colors[symbol] || '#00AEEF';
  };

  const totalValue = balances.reduce((sum, b) => sum + (b.gbp_value || 0), 0);
  const change24h = 2.45;
  const isPositive = change24h >= 0;

  const filteredBalances = balances.filter(asset => 
    asset.total_balance > 0 &&
    (searchTerm === '' || 
     asset.currency.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const performers = balances.map(asset => ({
    currency: asset.currency,
    change: ((Math.random() - 0.5) * 20).toFixed(2)
  })).sort((a, b) => parseFloat(b.change) - parseFloat(a.change));

  const bestPerformer = performers[0] || { currency: '-', change: '0.00' };
  const worstPerformer = performers[performers.length - 1] || { currency: '-', change: '0.00' };
  const totalAssets = balances.filter(b => b.total_balance > 0).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00AEEF" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00AEEF" />
        }
      >
        {/* Portfolio Summary */}
        <LinearGradient colors={['#111418', '#0B0E11']} style={styles.portfolioCard}>
          <Text style={styles.portfolioLabel}>TOTAL PORTFOLIO VALUE</Text>
          <Text style={styles.portfolioValue}>£{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <View style={styles.changeContainer}>
            <Icon name={isPositive ? 'trending-up' : 'trending-down'} size={20} color={isPositive ? '#00C98D' : '#E35355'} />
            <Text style={[styles.changeText, { color: isPositive ? '#00C98D' : '#E35355' }]}>
              {isPositive ? '+' : ''}{change24h.toFixed(2)}%
            </Text>
            <Text style={styles.change24h}>24h</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowDepositModal(true)}>
              <Text style={styles.primaryButtonText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Buy</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Mini Stats Bar */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: isPositive ? '#00C98D22' : '#E3535522' }]}>
              <Icon name={isPositive ? 'trending-up' : 'trending-down'} size={20} color={isPositive ? '#00C98D' : '#E35355'} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>24h Change</Text>
              <Text style={styles.statValue}>{isPositive ? '+' : ''}{change24h.toFixed(2)}%</Text>
              <Text style={[styles.statSub, { color: isPositive ? '#00C98D' : '#E35355' }]}>£{Math.abs(totalValue * change24h / 100).toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#00C98D22' }]}>
              <Icon name="trending-up" size={20} color="#00C98D" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Best Performer</Text>
              <Text style={styles.statValue}>{bestPerformer.currency}</Text>
              <Text style={[styles.statSub, { color: '#00C98D' }]}>+{bestPerformer.change}%</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E3535522' }]}>
              <Icon name="trending-down" size={20} color="#E35355" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Worst Performer</Text>
              <Text style={styles.statValue}>{worstPerformer.currency}</Text>
              <Text style={[styles.statSub, { color: '#E35355' }]}>{worstPerformer.change}%</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#00AEEF22' }]}>
              <Icon name="wallet" size={20} color="#00AEEF" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Assets</Text>
              <Text style={styles.statValue}>{totalAssets}</Text>
              <Text style={styles.statSub}>holdings</Text>
            </View>
          </View>
        </View>

        {/* Asset List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assets</Text>
        </View>

        {/* Asset List */}
        {filteredBalances.map((asset, index) => {
          const color = getCoinColor(asset.currency);
          const icon = getCoinIcon(asset.currency);
          return (
            <View key={asset.currency} style={styles.assetCard}>
              <View style={styles.assetLeft}>
                <View style={[styles.coinIcon, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.coinIconText, { color }]}>{icon}</Text>
                </View>
                <View>
                  <Text style={styles.assetSymbol}>{asset.currency}</Text>
                  <Text style={styles.assetBalance}>{asset.total_balance?.toFixed(8)}</Text>
                </View>
              </View>
              <View style={styles.assetRight}>
                <Text style={styles.assetValue}>£{(asset.gbp_value || 0).toFixed(2)}</Text>
                <View style={styles.assetActions}>
                  <TouchableOpacity style={[styles.assetButton, { borderColor: '#00AEEF' }]} onPress={() => { setSelectedCurrency(asset.currency); setShowDepositModal(true); }}>
                    <Icon name="arrow-down" size={12} color="#00AEEF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.assetButton, { borderColor: '#E35355' }]} onPress={() => { setSelectedCurrency(asset.currency); setShowWithdrawModal(true); }}>
                    <Icon name="arrow-up" size={12} color="#E35355" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.assetButton, { borderColor: '#F5C542' }]} onPress={() => { setSelectedCurrency(asset.currency); setShowSwapModal(true); }}>
                    <Icon name="swap-horizontal" size={12} color="#F5C542" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <DepositModal visible={showDepositModal} onClose={() => setShowDepositModal(false)} currency={selectedCurrency} userId={user?.user_id} />
      <WithdrawModal visible={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} currency={selectedCurrency} userId={user?.user_id} onSuccess={loadData} />
      <SwapModal visible={showSwapModal} onClose={() => setShowSwapModal(false)} fromCurrency={selectedCurrency} balances={balances} userId={user?.user_id} onSuccess={loadData} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E11' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0E11' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#00AEEF', fontWeight: '600' },
  portfolioCard: { margin: 16, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 174, 239, 0.2)' },
  portfolioLabel: { fontSize: 12, color: '#9FA6B2', fontWeight: '500', letterSpacing: 0.5, marginBottom: 8 },
  portfolioValue: { fontSize: 42, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  changeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  changeText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  change24h: { fontSize: 14, color: '#9FA6B2', marginLeft: 8 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  primaryButton: { flex: 1, backgroundColor: '#00AEEF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryButton: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#00AEEF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#00AEEF', fontSize: 14, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard: { width: (width - 44) / 2, backgroundColor: '#111418', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 174, 239, 0.2)', padding: 12, flexDirection: 'row', alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statContent: { flex: 1 },
  statLabel: { fontSize: 11, color: '#9FA6B2', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  statSub: { fontSize: 11, fontWeight: '600' },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  assetCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#111418', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0, 174, 239, 0.1)', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  coinIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  coinIconText: { fontSize: 18, fontWeight: '700' },
  assetSymbol: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  assetBalance: { fontSize: 13, color: '#9FA6B2' },
  assetRight: { alignItems: 'flex-end' },
  assetValue: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  assetActions: { flexDirection: 'row', gap: 8 },
  assetButton: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

export default WalletScreen;
