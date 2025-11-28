import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../config/colors';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';

const CurrencySelectorScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { currency, currencies, updateCurrency, loading } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCurrencies = currencies.filter(curr =>
    curr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    curr.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCurrency = async (currencyCode) => {
    try {
      await updateCurrency(currencyCode, user?.user_id);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating currency:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Currency</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.primary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search currency..."
          placeholderTextColor={COLORS.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoFocus
        />
      </View>

      {/* Currency List */}
      <ScrollView style={styles.currencyList} contentContainerStyle={styles.currencyListContent}>
        {filteredCurrencies.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="search-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No currencies found</Text>
          </View>
        ) : (
          filteredCurrencies.map((curr) => (
            <TouchableOpacity
              key={curr.code}
              style={[
                styles.currencyItem,
                curr.code === currency && styles.currencyItemActive
              ]}
              onPress={() => handleSelectCurrency(curr.code)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  curr.code === currency
                    ? ['rgba(0, 240, 255, 0.15)', 'rgba(168, 85, 247, 0.15)']
                    : ['rgba(26, 31, 58, 0.8)', 'rgba(19, 24, 41, 0.6)']
                }
                style={styles.currencyGradient}
              >
                <View style={styles.currencyLeft}>
                  <Text style={styles.currencyFlag}>{curr.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={[
                      styles.currencyCode,
                      curr.code === currency && styles.currencyCodeActive
                    ]}>
                      {curr.code}
                    </Text>
                    <Text style={styles.currencyName}>{curr.name}</Text>
                  </View>
                </View>
                <View style={styles.currencyRight}>
                  <Text style={styles.currencySymbol}>{curr.symbol}</Text>
                  {curr.code === currency && (
                    <Icon name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 12,
    paddingLeft: 12,
  },
  currencyList: {
    flex: 1,
  },
  currencyListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  currencyItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  currencyItemActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  currencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  currencyCodeActive: {
    color: COLORS.primary,
  },
  currencyName: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  currencyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 16,
  },
});

export default CurrencySelectorScreen;
