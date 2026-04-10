import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { Detection, UserLocation } from '../../types';
import { calculateDestination } from '../../utils/distance';
import { COLORS } from '../../config/constants';
import { formatDistanceKm, formatEmergencyService } from '../../utils/formatters';

type Props = {
  detection: Detection;
  userLocation: UserLocation | null;
  onPress?: () => void;
};

const iconByService: Record<Detection['serviceType'], string> = {
  police: '🚓',
  ambulance: '🚑',
  fire: '🚒',
  defense: '🎖️',
  unknown: '📡',
};

const colorByService: Record<Detection['serviceType'], string> = {
  police: COLORS.police,
  ambulance: COLORS.warning,
  fire: COLORS.danger,
  defense: COLORS.success,
  unknown: COLORS.gray500,
};

export default function EmergencyMarker({ detection, userLocation, onPress }: Props): JSX.Element {
  const pulse = useRef(new Animated.Value(0)).current;
  const resolvedCoordinate = userLocation
    ? calculateDestination(userLocation.latitude, userLocation.longitude, detection.bearing ?? 0, (detection.distanceKm ?? 0) * 1000)
    : { latitude: detection.latitude, longitude: detection.longitude };

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <Marker coordinate={resolvedCoordinate} anchor={{ x: 0.5, y: 0.5 }} onPress={onPress}>
      <View style={styles.wrapper}>
        <Animated.View style={[styles.pulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
        <View style={[styles.marker, { borderColor: colorByService[detection.serviceType] }]}>
          <Text style={styles.icon}>{iconByService[detection.serviceType]}</Text>
        </View>
        <Text style={styles.distance}>{formatDistanceKm(detection.distanceKm)}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 58,
  },
  pulse: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.premium,
  },
  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
  distance: {
    marginTop: 2,
    color: COLORS.gray100,
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
