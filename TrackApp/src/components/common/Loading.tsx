import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config/constants';

interface LoadingProps {
  visible?: boolean;
  message?: string;
  fullScreen?: boolean;
}

export default function Loading({ visible = true, message = 'Laden...', fullScreen = true }: LoadingProps): JSX.Element | null {
  if (!visible) return null;

  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : styles.inline]}>
      {fullScreen ? <View style={styles.backdrop} /> : null}
      <View style={styles.content}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        {message ? <Text style={styles.text}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  inline: {
    paddingVertical: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.65)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray700,
    zIndex: 1,
  },
  text: {
    color: COLORS.gray100,
    fontWeight: '700',
  },
});
