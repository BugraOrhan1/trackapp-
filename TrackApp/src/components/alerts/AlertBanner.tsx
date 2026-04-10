import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Alert } from '../../types';
import { COLORS } from '../../config/constants';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  alert: Alert;
  onDismiss: () => void;
};

const iconByType: Record<Alert['type'], IoniconName> = {
  speed_camera: 'camera',
  police: 'shield-checkmark',
  accident: 'warning',
  emergency: 'medkit',
};

const colorByType: Record<Alert['type'], string> = {
  speed_camera: COLORS.danger,
  police: COLORS.police,
  accident: COLORS.primary,
  emergency: COLORS.premium,
};

export default function AlertBanner({ alert, onDismiss }: Props): JSX.Element {
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const timeout = setTimeout(() => onDismiss(), 8000);
    return () => clearTimeout(timeout);
  }, [onDismiss, opacity, translateY]);

  return (
    <Animated.View style={[styles.container, { borderColor: colorByType[alert.type], opacity, transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: `${colorByType[alert.type]}1A` }]}>
          <Ionicons name={iconByType[alert.type]} size={18} color={colorByType[alert.type]} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.message}>{alert.message}</Text>
          <Text style={styles.distance}>{alert.distance} m</Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={12}>
          <Ionicons name="close" size={18} color={COLORS.gray300} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.gray100,
    fontWeight: '800',
  },
  message: {
    color: COLORS.gray300,
    marginTop: 2,
    lineHeight: 18,
  },
  distance: {
    color: COLORS.gray400,
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
});
