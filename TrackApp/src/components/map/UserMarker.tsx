import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Circle, Marker } from 'react-native-maps';
import type { Location } from '../../types';
import { COLORS } from '../../config/constants';

type Props = {
  location?: Location;
  coordinate?: { latitude: number; longitude: number };
  heading?: number;
  accuracyMeters?: number;
};

export default function UserMarker({ location, coordinate, heading, accuracyMeters }: Props): JSX.Element | null {
  const pulse = useRef(new Animated.Value(0)).current;
  const resolvedCoordinate = coordinate ?? (location ? { latitude: location.latitude, longitude: location.longitude } : null);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  if (!resolvedCoordinate) return null;

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <>
      <Circle
        center={resolvedCoordinate}
        radius={accuracyMeters ?? location?.accuracy ?? 20}
        strokeColor="rgba(0,122,255,0.25)"
        fillColor="rgba(0,122,255,0.12)"
      />
      <Marker coordinate={resolvedCoordinate} anchor={{ x: 0.5, y: 0.5 }} rotation={heading ?? location?.heading ?? 0}>
        <View style={styles.wrapper}>
          <Animated.View style={[styles.pulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
          <View style={styles.outer}>
            <View style={styles.inner} />
          </View>
          <View style={[styles.heading, { transform: [{ rotate: `${heading ?? location?.heading ?? 0}deg` }] }]} />
        </View>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
  },
  pulse: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  outer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  inner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  heading: {
    position: 'absolute',
    top: -8,
    width: 2,
    height: 12,
    borderRadius: 2,
    backgroundColor: COLORS.secondary,
  },
});
