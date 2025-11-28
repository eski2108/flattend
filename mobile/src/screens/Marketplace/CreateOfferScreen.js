import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../config/colors';

const CreateOfferScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.placeholderContainer}>
        <Text style={styles.title}>Create Sell Offer</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
        <Text style={styles.description}>
          This feature will allow you to create your own sell offers on the P2P marketplace.{'\n\n'}
          Features to include:{'\n'}
          • Crypto amount input{'\n'}
          • Price per unit{'\n'}
          • Min/Max limits{'\n'}
          • Payment method selection{'\n'}
          • Seller requirements
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});

export default CreateOfferScreen;
