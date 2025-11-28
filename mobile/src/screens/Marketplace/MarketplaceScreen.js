import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import p2pService from '../../services/p2pService';
import coinGeckoService from '../../services/coinGeckoService';
import Button from '../../components/Button';

const MarketplaceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
  const [offers, setOffers] = useState([]);
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [marketPrices, setMarketPrices] = useState({});
  
  // Filter states
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [selectedFiat, setSelectedFiat] = useState('USD');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [sortBy, setSortBy] = useState('price_asc'); // price_asc, price_desc, rating

  const [config, setConfig] = useState({
    currencies: [],
    payment_methods: [],
  });

  // Fetch config, offers, and prices
  useEffect(() => {
    loadData();
  }, []);

  // Filter offers when filters change
  useEffect(() => {
    applyFilters();
  }, [offers, selectedCrypto, selectedFiat, selectedPayment, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load config
      const configData = await p2pService.getConfig();
      setConfig(configData);

      // Load offers
      await loadOffers();

      // Load market prices
      const prices = await coinGeckoService.getCurrentPrices('usd');
      setMarketPrices(prices);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      const response = await p2pService.getOffers({
        cryptoCurrency: selectedCrypto,
        fiatCurrency: selectedFiat,
        paymentMethod: selectedPayment,
      });
      setOffers(response.offers || []);
    } catch (error) {
      console.error('Error loading offers:', error);
      setOffers([]);
    }
  };

  const applyFilters = () => {
    let filtered = [...offers];

    // Filter by crypto
    if (selectedCrypto) {
      filtered = filtered.filter(o => o.crypto_currency === selectedCrypto);
    }

    // Filter by fiat
    if (selectedFiat) {
      filtered = filtered.filter(o => o.fiat_currency === selectedFiat);
    }

    // Filter by payment method
    if (selectedPayment) {
      filtered = filtered.filter(o => 
        o.payment_methods && o.payment_methods.includes(selectedPayment)
      );
    }

    // Sort
    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => a.price_per_unit - b.price_per_unit);
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => b.price_per_unit - a.price_per_unit);
    }

    setFilteredOffers(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [selectedCrypto, selectedFiat, selectedPayment]);

  const calculatePremium = (offerPrice, crypto) => {
    const marketPrice = marketPrices[crypto]?.price;
    if (!marketPrice) return null;
    
    return coinGeckoService.calculatePremium(offerPrice, marketPrice);
  };

  const renderOfferCard = ({ item }) => {
    const premium = calculatePremium(item.price_per_unit, item.crypto_currency);
    const isPremium = premium && parseFloat(premium) > 0;
    
    return (
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() => navigation.navigate('PreviewOrder', { offer: item })}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['rgba(26, 31, 58, 0.8)', 'rgba(19, 24, 41, 0.6)']}
          style={styles.offerGradient}
        >
          {/* Header: Seller Info */}
          <View style={styles.offerHeader}>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerAvatar}>
                <Icon name="person" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{item.seller_name || 'Seller'}</Text>
                <View style={styles.sellerStats}>
                  <Icon name="checkmark-circle" size={14} color={COLORS.success} />
                  <Text style={styles.statsText}>{item.total_trades || 0} trades</Text>
                  <Text style={styles.statsText}> • </Text>
                  <Text style={styles.statsText}>{item.completion_rate || 100}%</Text>
                </View>
              </View>
            </View>
            {item.is_verified && (
              <View style={styles.verifiedBadge}>
                <Icon name="shield-checkmark" size={16} color={COLORS.success} />
              </View>
            )}
          </View>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.cryptoAmount}>{item.crypto_amount} {item.crypto_currency}</Text>
              {premium !== null && (
                <View style={[styles.premiumBadge, isPremium ? styles.premiumPositive : styles.premiumNegative]}>
                  <Text style={styles.premiumText}>
                    {isPremium ? '+' : ''}{premium}%
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.pricePerUnit}>
                {coinGeckoService.formatPrice(item.price_per_unit, item.fiat_currency)} / {item.crypto_currency}
              </Text>
            </View>
          </View>

          {/* Limits & Info */}
          <View style={styles.limitsSection}>
            <View style={styles.limitItem}>
              <Icon name="wallet-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.limitText}>
                Available: {item.crypto_amount - (item.locked_amount || 0)} {item.crypto_currency}
              </Text>
            </View>
            <View style={styles.limitItem}>
              <Icon name="swap-horizontal-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.limitText}>
                Limit: {coinGeckoService.formatPrice(item.min_purchase * item.price_per_unit, item.fiat_currency)} - 
                {coinGeckoService.formatPrice(item.max_purchase * item.price_per_unit, item.fiat_currency)}
              </Text>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.paymentMethodsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {item.payment_methods && item.payment_methods.map((method, index) => (
                <View key={index} style={styles.paymentMethodChip}>
                  <Text style={styles.paymentMethodText}>{method}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => navigation.navigate('PreviewOrder', { offer: item })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={activeTab === 'buy' ? [COLORS.primary, COLORS.primaryDark] : [COLORS.success, '#16A34A']}
              style={styles.buyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buyButtonText}>
                {activeTab === 'buy' ? 'Buy Now' : 'Sell Now'}
              </Text>
              <Icon name="arrow-forward" size={20} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Crypto Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Cryptocurrency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['BTC', 'ETH', 'USDT'].map(crypto => (
            <TouchableOpacity
              key={crypto}
              style={[styles.filterChip, selectedCrypto === crypto && styles.filterChipActive]}
              onPress={() => setSelectedCrypto(crypto)}
            >
              <Text style={[styles.filterChipText, selectedCrypto === crypto && styles.filterChipTextActive]}>
                {crypto}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Fiat Currency Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Fiat Currency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {config.currencies && config.currencies.map(curr => (
            <TouchableOpacity
              key={curr}
              style={[styles.filterChip, selectedFiat === curr && styles.filterChipActive]}
              onPress={() => setSelectedFiat(curr)}
            >
              <Text style={[styles.filterChipText, selectedFiat === curr && styles.filterChipTextActive]}>
                {curr}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Payment Method Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Payment Method</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedPayment && styles.filterChipActive]}
            onPress={() => setSelectedPayment(null)}
          >
            <Text style={[styles.filterChipText, !selectedPayment && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {config.payment_methods && Object.keys(config.payment_methods).map(method => (
            <TouchableOpacity
              key={method}
              style={[styles.filterChip, selectedPayment === method && styles.filterChipActive]}
              onPress={() => setSelectedPayment(method)}
            >
              <Text style={[styles.filterChipText, selectedPayment === method && styles.filterChipTextActive]}>
                {config.payment_methods[method].name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Sort By</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { value: 'price_asc', label: 'Price: Low to High' },
            { value: 'price_desc', label: 'Price: High to Low' },
          ].map(sort => (
            <TouchableOpacity
              key={sort.value}
              style={[styles.filterChip, sortBy === sort.value && styles.filterChipActive]}
              onPress={() => setSortBy(sort.value)}
            >
              <Text style={[styles.filterChipText, sortBy === sort.value && styles.filterChipTextActive]}>
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Apply Filters Button */}
      <Button
        title="Apply Filters"
        onPress={() => {
          setShowFilters(false);
          loadOffers();
        }}
        style={styles.applyButton}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading marketplace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Buy/Sell Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'buy' && styles.tabActive]}
          onPress={() => setActiveTab('buy')}
          activeOpacity={0.8}
        >
          {activeTab === 'buy' && (
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.tabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
          <Text style={[styles.tabText, activeTab === 'buy' && styles.tabTextActive]}>
            Buy Crypto
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sell' && styles.tabActive]}
          onPress={() => setActiveTab('sell')}
          activeOpacity={0.8}
        >
          {activeTab === 'sell' && (
            <LinearGradient
              colors={[COLORS.success, '#16A34A']}
              style={styles.tabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
          <Text style={[styles.tabText, activeTab === 'sell' && styles.tabTextActive]}>
            Sell Crypto
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Toggle Button */}
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.8}
      >
        <Icon name="options-outline" size={20} color={COLORS.primary} />
        <Text style={styles.filterToggleText}>Filters</Text>
        <Icon name={showFilters ? "chevron-up" : "chevron-down"} size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Filters Panel */}
      {showFilters && renderFilters()}

      {/* Current Filter Display */}
      <View style={styles.activeFiltersBar}>
        <Text style={styles.activeFilterText}>
          {selectedCrypto} • {selectedFiat} {selectedPayment ? `• ${selectedPayment}` : ''}
        </Text>
        <Text style={styles.resultsCount}>{filteredOffers.length} offers</Text>
      </View>

      {/* Offers List */}
      <FlatList
        data={filteredOffers}
        renderItem={renderOfferCard}
        keyExtractor={(item) => item.order_id}
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
            <Icon name="search-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No offers found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* Create Offer FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateOffer')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.secondary, COLORS.secondaryDark]}
          style={styles.fabGradient}
        >
          <Icon name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
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
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  tabActive: {
    borderColor: COLORS.primary,
  },
  tabGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.text,
  },

  // Filter Toggle
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  filterToggleText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Filters
  filtersContainer: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#000',
  },
  applyButton: {
    marginTop: 8,
  },

  // Active Filters Bar
  activeFiltersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeFilterText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  resultsCount: {
    color: COLORS.textMuted,
    fontSize: 14,
  },

  // Offer Card
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  offerCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  offerGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
  },
  
  // Seller Info
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  sellerDetails: {
    marginLeft: 12,
  },
  sellerName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statsText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  verifiedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Price Section
  priceSection: {
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cryptoAmount: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
  },
  pricePerUnit: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumPositive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  premiumNegative: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Limits
  limitsSection: {
    marginBottom: 12,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  limitText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginLeft: 8,
  },

  // Payment Methods
  paymentMethodsSection: {
    marginBottom: 16,
  },
  paymentMethodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  paymentMethodText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Buy Button
  buyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
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
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    elevation: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MarketplaceScreen;
