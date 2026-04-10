import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../../config/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
};

export default function Button({ title, onPress, loading = false, variant = 'primary', style }: Props): JSX.Element {
  const backgroundColor = variant === 'secondary' ? '#22304a' : variant === 'danger' ? theme.colors.danger : theme.colors.primary;

  return (
    <Pressable onPress={onPress} disabled={loading} style={[styles.button, { backgroundColor }, style]}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
});
