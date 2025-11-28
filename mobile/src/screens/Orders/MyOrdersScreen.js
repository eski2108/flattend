import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import p2pService from '../../services/p2pService';
import coinGeckoService from '../../services/coinGeckoService';

const MyOrdersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilter();
  }, [trades, activeFilter]);

  const loadTrades = async () => {
    try {
      const response = await p2pService.getUserTrades(user.user_id);
      setTrades(response.trades || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading trades:', error);
      setTrades([]);
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrades();
    setRefreshing(false);
  }, []);

  const applyFilter = () => {
    let filtered = [...trades];

    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(t => ['pending_payment', 'buyer_marked_paid'].includes(t.status));
        break;
      case 'buying':
        filtered = filtered.filter(t => t.buyer_id === user.user_id);
        break;
      case 'selling':
        filtered = filtered.filter(t => t.seller_id === user.user_id);
        break;
      case 'completed':
        filtered = filtered.filter(t => t.status === 'released');
        break;
      default:
        break;
    }

    // Sort by created_at descending
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFilteredTrades(filtered);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending_payment':
        return { text: 'Waiting for Payment', color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.2)' };
      case 'buyer_marked_paid':
        return { text: 'Marked as Paid', color: COLORS.info, bg: 'rgba(59, 130, 246, 0.2)' };
      case 'released':
        return { text: 'Completed', color: COLORS.success, bg: 'rgba(34, 197, 94, 0.2)' };
      case 'cancelled':
        return { text: 'Cancelled', color: COLORS.error, bg: 'rgba(239, 68, 68, 0.2)' };
      case 'disputed':
        return { text: 'Disputed', color: COLORS.error, bg: 'rgba(239, 68, 68, 0.2)' };
      default:
        return { text: status, color: COLORS.textMuted, bg: COLORS.backgroundLight };
    }
  };

  const renderTradeCard = ({ item }) => {
    const isBuying = item.buyer_id === user.user_id;
    const statusInfo = getStatusInfo(item.status);

    return (
      <TouchableOpacity
        style={styles.tradeCard}
        onPress={() => navigation.navigate('Trade', { tradeId: item.trade_id })}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['rgba(26, 31, 58, 0.8)', 'rgba(19, 24, 41, 0.6)']}
          style={styles.cardGradient}
        >
          {/* Header: Type Badge */}
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, isBuying ? styles.buyBadge : styles.sellBadge]}>
              <Text style={[styles.typeBadgeText, isBuying ? styles.buyBadgeText : styles.sellBadgeText]}>
                {isBuying ? 'BUYING' : 'SELLING'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
          </View>

          {/* Amount & Price */}
          <View style={styles.amountSection}>
            <Text style={styles.cryptoAmount}>
              {item.crypto_amount} {item.crypto_currency}
            </Text>
            <Text style={styles.fiatAmount}>
              {coinGeckoService.formatPrice(item.fiat_amount, item.fiat_currency)}
            </Text>
          </View>

          {/* Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailItem}>
              <Icon name="card-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.detailText}>{item.payment_method}</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="time-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.detailText}>
                {new Date(item.created_at).toLocaleDateString()} - {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {/* Escrow Indicator */}
          {item.escrow_locked && (
            <View style={styles.escrowIndicator}>
              <Icon name="shield-checkmark" size={14} color={COLORS.success} />
              <Text style={styles.escrowText}>Escrow Active</Text>
            </View>
          )}

          {/* Trade ID */}
          <Text style={styles.tradeId}>ID: {item.trade_id.substring(0, 12)}...</Text>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Icon name="chevron-forward" size={20} color={COLORS.primary} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderFilterTab = (filter, label) => (
    <TouchableOpacity
      key={filter}
      style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
      onPress={() => setActiveFilter(filter)}
      activeOpacity={0.8}
    >
      {activeFilter === filter && (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.filterTabGradient}
        />
      )}
      <Text style={[styles.filterTabText, activeFilter === filter && styles.filterTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        {renderFilterTab('all', 'All')}
        {renderFilterTab('active', 'Active')}
        {renderFilterTab('buying', 'Buying')}
        {renderFilterTab('selling', 'Selling')}
        {renderFilterTab('completed', 'Completed')}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredTrades}
        renderItem={renderTradeCard}
        keyExtractor={(item) => item.trade_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all' 
                ? 'Your P2P orders will appear here'
                : `No ${activeFilter} orders`
              }
            </Text>
          </View>
        }
      />
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

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  filterTabActive: {
    borderColor: COLORS.primary,
  },
  filterTabGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.1,
  },
  filterTabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: COLORS.text,
  },

  // List
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  tradeCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  buyBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: COLORS.primary,
  },
  sellBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: COLORS.success,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  buyBadgeText: {
    color: COLORS.primary,
  },
  sellBadgeText: {
    color: COLORS.success,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Amount
  amountSection: {
    marginBottom: 12,
  },
  cryptoAmount: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  fiatAmount: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },

  // Details
  detailsSection: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  // Escrow
  escrowIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.success,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  escrowText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },

  // Trade ID
  tradeId: {
    color: COLORS.textMuted,
    fontSize: 11,
  },

  // Arrow
  arrowContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default MyOrdersScreen;
