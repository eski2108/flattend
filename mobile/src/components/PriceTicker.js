import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { COLORS } from '../config/colors';

const TICKER_COINS = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple', 'tether'];

const PriceTicker = () => {
  const [prices, setPrices] = useState([]);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (prices.length > 0) {
      startScrollAnimation();
    }
  }, [prices]);

  const fetchPrices = async () => {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${TICKER_COINS.join(',')}&vs_currencies=usd&include_24hr_change=true`
      );
      
      const priceData = TICKER_COINS.map(id => {
        const data = response.data[id];
        const symbol = id === 'bitcoin' ? 'BTC' : 
                      id === 'ethereum' ? 'ETH' :
                      id === 'binancecoin' ? 'BNB' :
                      id === 'solana' ? 'SOL' :
                      id === 'ripple' ? 'XRP' : 'USDT';
        
        return {
          id,
          symbol,
          price: data?.usd || 0,
          change: data?.usd_24h_change || 0
        };
      });
      
      setPrices(priceData);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const startScrollAnimation = () => {
    scrollX.setValue(0);
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: -1000,
        duration: 30000,
        useNativeDriver: true,
      })
    ).start();
  };

  if (prices.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.scrollContainer,
          { transform: [{ translateX: scrollX }] }
        ]}
      >
        {[...prices, ...prices].map((coin, idx) => (
          <View key={`${coin.symbol}-${idx}`} style={styles.coinItem}>
            <Text style={styles.symbol}>{coin.symbol}</Text>
            <Text style={styles.price}>
              ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={[
              styles.changeContainer,
              { backgroundColor: coin.change >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
            ]}>
              <Icon 
                name={coin.change >= 0 ? "trending-up" : "trending-down"} 
                size={12} 
                color={coin.change >= 0 ? '#22C55E' : '#EF4444'} 
              />
              <Text style={[
                styles.change,
                { color: coin.change >= 0 ? '#22C55E' : '#EF4444' }
              ]}>
                {Math.abs(coin.change).toFixed(2)}%
              </Text>
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 13, 26, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.2)',
    paddingVertical: 12,
    overflow: 'hidden',
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
  },
  symbol: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default PriceTicker;
