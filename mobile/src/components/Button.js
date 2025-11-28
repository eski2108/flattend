import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../config/colors';

const Button = ({ title, onPress, loading, disabled, variant = 'primary', style, textStyle }) => {
  const isDisabled = disabled || loading;
  
  const getColors = () => {
    if (variant === 'primary') return [COLORS.primary, COLORS.primaryDark];
    if (variant === 'secondary') return [COLORS.secondary, COLORS.secondaryDark];
    if (variant === 'danger') return [COLORS.error, '#DC2626'];
    if (variant === 'success') return [COLORS.success, '#16A34A'];
    return [COLORS.primary, COLORS.primaryDark];
  };

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[styles.outlineButton, isDisabled && styles.disabled, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Text style={[styles.outlineText, textStyle]}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.container, isDisabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={isDisabled ? [COLORS.textMuted, COLORS.textMuted] : getColors()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={[styles.text, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
