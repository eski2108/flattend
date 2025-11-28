import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../config/colors';
import Logo from '../../components/Logo';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  return (
    <LinearGradient
      colors={['#0a0e27', '#1a0f3d', '#0f1a42']}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Title */}
        <View style={styles.header}>
          <Logo size={60} showText={false} />
          <Text style={styles.title}>CoinHubX</Text>
          <Text style={styles.subtitle}>
            Trade Crypto P2P{'\n'}With Total Protection
          </Text>
        </View>

        {/* Trust Indicators - Honest Features */}
        <View style={styles.trustBar}>
          <View style={styles.trustItem}>
            <Icon name="shield-checkmark" size={28} color={COLORS.primary} />
            <Text style={styles.trustLabel}>100% Escrow{'\n'}Protected</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Icon name="flash" size={28} color={COLORS.primary} />
            <Text style={styles.trustLabel}>{'<15min\n'}Fast Trades</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Icon name="cash" size={28} color={COLORS.primary} />
            <Text style={styles.trustLabel}>1% Low{'\n'}Fees</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureCard
            icon="shield-checkmark"
            title="Military-Grade Escrow"
            description="Your crypto secured until trade completion"
          />
          <FeatureCard
            icon="flash"
            title="Real-Time Settlement"
            description="Complete trades in under 15 minutes"
          />
          <FeatureCard
            icon="lock-closed"
            title="24/7 Dispute Protection"
            description="Professional mediation team available"
          />
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Icon name="lock-closed" size={16} color={COLORS.primary} />
          <Text style={styles.securityText}>
            Bank-grade security • Instant settlements • Escrow protection
          </Text>
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.primaryButtonText}>Start Trading Now</Text>
              <Icon name="arrow-forward" size={20} color="#000" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIcon}>
      <Icon name={icon} size={28} color={COLORS.primary} />
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDescription}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  trustBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 31, 58, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 20,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
  },
  trustLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 16,
  },
  trustDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featureCard: {
    backgroundColor: 'rgba(26, 31, 58, 0.6)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  securityText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default WelcomeScreen;
