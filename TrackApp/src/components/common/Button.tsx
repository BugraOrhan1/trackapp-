import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../config/constants';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const backgroundForVariant: Record<NonNullable<Props['variant']>, string> = {
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  danger: COLORS.danger,
  success: COLORS.success,
  outline: 'transparent',
};

const textForVariant: Record<NonNullable<Props['variant']>, string> = {
  primary: '#FFFFFF',
  secondary: COLORS.gray100,
  danger: '#FFFFFF',
  success: '#FFFFFF',
  outline: COLORS.gray100,
};

export default function Button({ title, onPress, loading = false, variant = 'primary', disabled = false, icon, fullWidth = true, style }: Props): JSX.Element {
  async function handlePress() {
    await Haptics.selectionAsync();
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: backgroundForVariant[variant], borderColor: variant === 'outline' ? COLORS.gray700 : 'transparent', width: fullWidth ? '100%' : undefined },
        pressed && !loading && !disabled ? styles.pressed : null,
        (loading || disabled) && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={variant === 'outline' ? COLORS.gray100 : '#FFFFFF'} /> : icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={[styles.text, { color: textForVariant[variant] }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    marginRight: 2,
  },
  text: {
    fontWeight: '800',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.65,
  },
});
