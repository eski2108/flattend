import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { COLORS } from '../../config/colors';

const MarketplaceListScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('buy'); // buy or sell
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [selectedFiat, setSelectedFiat] = useState('GBP');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cryptos = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL'];
  const fiats = ['GBP', 'EUR', 'USD'];
  const paymentMethods = ['All', 'Faster Payments', 'SEPA', 'SWIFT', 'Wise', 'Revolut', 'PayPal'];

  useEffect(() => {
    fetchOffers();
  }, [activeTab, selectedCrypto, selectedFiat, selectedPayment]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const offerType = activeTab === 'buy' ? 'sell' : 'buy';
      let url = `${API_URL}/marketplace/list?offer_type=${offerType}&crypto=${selectedCrypto}&fiat=${selectedFiat}`;
      
      if (selectedPayment && selectedPayment !== 'All') {
        url += `&payment_method=${selectedPayment}`;
      }

      const response = await axios.get(url);
      if (response.data.success) {
        setOffers(response.data.offers || []);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleSelectOffer = (offer) => {
    navigation.navigate('PreviewOrder', { offer });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Icon key={i} name="star" size={14} color="#FBBF24" />);
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>P2P Marketplace</Text>
          <Text style={styles.subtitle}>Buy and sell crypto with trusted traders</Text>
        </View>

        {/* Buy/Sell Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'buy' && styles.tabActive]}
            onPress={() => setActiveTab('buy')}
          >
            <LinearGradient
              colors={activeTab === 'buy' ? ['#00F0FF', '#A855F7'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)']}
              style={styles.tabGradient}
            >
              <Text style={[styles.tabText, activeTab === 'buy' && styles.tabTextActive]}>
                Buy Crypto
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'sell' && styles.tabActive]}
            onPress={() => setActiveTab('sell')}
          >
            <LinearGradient
              colors={activeTab === 'sell' ? ['#00F0FF', '#A855F7'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)']}
              style={styles.tabGradient}
            >
              <Text style={[styles.tabText, activeTab === 'sell' && styles.tabTextActive]}>
                Sell Crypto
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Cryptocurrency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCrypto}
                onValueChange={(value) => setSelectedCrypto(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                {cryptos.map(crypto => (
                  <Picker.Item key={crypto} label={crypto} value={crypto} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Currency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedFiat}
                onValueChange={(value) => setSelectedFiat(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                {fiats.map(fiat => (
                  <Picker.Item key={fiat} label={fiat} value={fiat} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Payment Method</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedPayment}
                onValueChange={(value) => setSelectedPayment(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                {paymentMethods.map(method => (
                  <Picker.Item key={method} label={method} value={method} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Offers List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="search-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No offers match your filters</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search criteria</Text>
          </View>
        ) : (
          <View style={styles.offersList}>
            {offers.map((offer) => (
              <TouchableOpacity
                key={offer.offer_id}
                style={styles.offerCard}
                onPress={() => handleSelectOffer(offer)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(0, 0, 0, 0.4)', 'rgba(26, 31, 58, 0.4)']}
                  style={styles.offerGradient}
                >
                  {/* Seller Info */}
                  <View style={styles.sellerSection}>
                    <Text style={styles.sellerName}>{offer.seller_username}</Text>
                    <View style={styles.sellerStats}>
                      <View style={styles.ratingContainer}>
                        {renderStars(offer.seller_rating)}
                        <Text style={styles.ratingText}>{offer.seller_rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.tradesText}>({offer.seller_total_trades} trades)</Text>
                      <Text style={styles.completionText}>{offer.seller_completion_rate.toFixed(1)}%</Text>
                    </View>
                  </View>

                  {/* Price */}
                  <View style={styles.priceSection}>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>
                      {selectedFiat === 'GBP' ? '£' : selectedFiat === 'EUR' ? '€' : '$'}
                      {offer.price.toLocaleString()}
                    </Text>
                    <Text style={styles.priceUnit}>per {offer.crypto_currency}</Text>
                  </View>

                  {/* Limits */}
                  <View style={styles.limitsSection}>
                    <Text style={styles.limitsLabel}>Limits</Text>
                    <Text style={styles.limitsValue}>
                      {selectedFiat === 'GBP' ? '£' : selectedFiat === 'EUR' ? '€' : '$'}
                      {offer.min_limit_fiat.toLocaleString()} – {offer.max_limit_fiat.toLocaleString()}
                    </Text>
                    <Text style={styles.limitsSubtext}>
                      ≈ {(offer.min_limit_fiat / offer.price).toFixed(6)} – {(offer.max_limit_fiat / offer.price).toFixed(4)} {offer.crypto_currency}
                    </Text>
                  </View>

                  {/* Available */}
                  <View style={styles.availableSection}>
                    <Text style={styles.availableLabel}>Available</Text>
                    <Text style={styles.availableValue}>
                      {offer.available_amount.toFixed(4)} {offer.crypto_currency}
                    </Text>
                  </View>

                  {/* Payment Methods */}
                  <View style={styles.paymentSection}>
                    <Text style={styles.paymentLabel}>Payment</Text>
                    <View style={styles.paymentBadges}>
                      {offer.payment_methods.map((method, idx) => (
                        <View key={idx} style={styles.paymentBadge}>
                          <LinearGradient
                            colors={['rgba(0, 240, 255, 0.2)', 'rgba(168, 85, 247, 0.2)']}
                            style={styles.badgeGradient}
                          >
                            <Text style={styles.badgeText}>{method}</Text>
                          </LinearGradient>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSelectOffer(offer)}
                  >
                    <LinearGradient
                      colors={['#00F0FF', '#A855F7']}
                      style={styles.actionGradient}
                    >
                      <Text style={styles.actionText}>
                        {activeTab === 'buy' ? 'BUY' : 'SELL'}
                      </Text>
                      <Icon name="chevron-forward" size={20} color="#000" />
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: '#000',
  },
  filtersContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  filterItem: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  picker: {
    color: COLORS.text,
    height: 50,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  offersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  offerCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  offerGradient: {
    padding: 16,
  },
  sellerSection: {
    marginBottom: 12,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FBBF24',
  },
  tradesText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  completionText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  priceSection: {
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  priceUnit: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  limitsSection: {
    marginBottom: 12,
  },
  limitsLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  limitsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  limitsSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  availableSection: {
    marginBottom: 12,
  },
  availableLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  availableValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  paymentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentBadge: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  badgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});

export default MarketplaceListScreen;
