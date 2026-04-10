import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import type { ReportType } from '../../types';

type Props = {
  type: ReportType;
  icon: string;
  label: string;
  onPress: () => void;
};

export default function QuickReportButton({ icon, label, onPress }: Props): JSX.Element {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 84,
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  label: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});