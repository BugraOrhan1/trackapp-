import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';
import type { SpeedCamera } from '../../types';
import { COLORS } from '../../config/constants';
import { formatDistance } from '../../utils/formatters';

type Props = {
  camera: SpeedCamera;
  onPress?: () => void;
};

const cameraIcon: Record<SpeedCamera['type'], string> = {
  fixed: '📷',
  trajectory: '📹',
  red_light: '🚦',
};

const cameraColor: Record<SpeedCamera['type'], string> = {
  fixed: COLORS.speedCameraFixed,
  trajectory: COLORS.speedCameraTrajectory,
  red_light: COLORS.speedCameraFixed,
};

export default function SpeedCameraMarker({ camera, onPress }: Props): JSX.Element {
  const pulse = useRef(new Animated.Value(0)).current;
  const isClose = typeof camera.distance === 'number' && camera.distance < 500;

  useEffect(() => {
    if (!isClose) return undefined;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [isClose, pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <Marker coordinate={{ latitude: camera.latitude, longitude: camera.longitude }} anchor={{ x: 0.5, y: 0.5 }} onPress={onPress}>
      <View style={styles.markerWrap}>
        {isClose ? <Animated.View style={[styles.pulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} /> : null}
        <View style={[styles.marker, { borderColor: cameraColor[camera.type] }]}>
          <Text style={styles.icon}>{cameraIcon[camera.type]}</Text>
        </View>
      </View>
      <Callout tooltip>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{camera.roadName ?? 'Speed camera'}</Text>
          <Text style={styles.calloutText}>{camera.type === 'trajectory' ? 'Trajectcontrole' : camera.type === 'red_light' ? 'Roodlichtcamera' : 'Vaste flitser'}</Text>
          {typeof camera.speedLimit === 'number' ? <Text style={styles.calloutText}>Limiet: {camera.speedLimit} km/u</Text> : null}
          {camera.direction ? <Text style={styles.calloutText}>Richting: {camera.direction}</Text> : null}
          {typeof camera.distance === 'number' ? <Text style={styles.calloutDistance}>{formatDistance(camera.distance)}</Text> : null}
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
  },
  pulse: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#121826',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 16,
  },
  callout: {
    minWidth: 180,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gray700,
  },
  calloutTitle: {
    color: COLORS.gray100,
    fontWeight: '800',
    marginBottom: 4,
  },
  calloutText: {
    color: COLORS.gray300,
    fontSize: 12,
    marginTop: 2,
  },
  calloutDistance: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
});
