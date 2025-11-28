import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../../components/Button';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { currency, symbol } = useCurrency();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const renderSettingItem = (icon, title, subtitle, onPress) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['rgba(26, 31, 58, 0.8)', 'rgba(19, 24, 41, 0.6)']}
        style={styles.settingGradient}
      >
        <View style={styles.settingIcon}>
          <Icon name={icon} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        <Icon name="chevron-forward" size={20} color={COLORS.textMuted} />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.profileGradient}
          >
            <View style={styles.profileAvatar}>
              <Icon name="person" size={40} color="#000" />
            </View>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Currency Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Currency Settings</Text>
        {renderSettingItem(
          'globe-outline',
          'Display Currency',
          `${currency} - ${symbol}`,
          () => navigation.navigate('CurrencySelector')
        )}
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {renderSettingItem(
          'person-outline',
          'Profile',
          'View and edit your profile',
          () => Alert.alert('Coming Soon', 'Profile editing will be available soon')
        )}
        {renderSettingItem(
          'shield-checkmark-outline',
          'KYC Verification',
          'Complete identity verification',
          () => navigation.navigate('KYCVerification')
        )}
        {renderSettingItem(
          'lock-closed-outline',
          'Security',
          'Password, 2FA, and security settings',
          () => Alert.alert('Coming Soon', 'Security settings will be available soon')
        )}
        {renderSettingItem(
          'card-outline',
          'Payment Methods',
          'Manage your payment methods',
          () => Alert.alert('Coming Soon', 'Payment method management will be available soon')
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {renderSettingItem(
          'notifications-outline',
          'Notifications',
          'Manage notification preferences',
          () => Alert.alert('Coming Soon', 'Notification settings will be available soon')
        )}
        {renderSettingItem(
          'language-outline',
          'Language',
          'English',
          () => Alert.alert('Coming Soon', 'Language selection will be available soon')
        )}
        {renderSettingItem(
          'moon-outline',
          'Theme',
          'Dark (Neon)',
          () => Alert.alert('Theme', 'Dark neon theme is currently active')
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        {renderSettingItem(
          'help-circle-outline',
          'Help Center',
          'FAQs and support articles',
          () => Alert.alert('Coming Soon', 'Help center will be available soon')
        )}
        {renderSettingItem(
          'chatbox-outline',
          'Contact Support',
          'Get help from our team',
          () => Alert.alert('Contact Support', 'Email: support@coinhubx.com')
        )}
        {renderSettingItem(
          'document-text-outline',
          'Terms & Privacy',
          'Legal information',
          () => Alert.alert('Coming Soon', 'Terms and privacy will be available soon')
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {renderSettingItem(
          'information-circle-outline',
          'App Version',
          'v2.0.0',
          null
        )}
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
        />
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Coin Hub X - P2P Crypto Marketplace
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // Profile
  profileSection: {
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  profileEmail: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingLeft: 4,
  },
  settingItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  settingSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },

  // Logout
  logoutSection: {
    marginTop: 16,
    marginBottom: 24,
  },

  // Footer
  footer: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});

export default SettingsScreen;
