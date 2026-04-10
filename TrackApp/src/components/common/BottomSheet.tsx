import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../config/constants';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  contentStyle?: ViewStyle;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function BottomSheet({ visible, onClose, children, height = Math.round(SCREEN_HEIGHT * 0.6), contentStyle }: Props): JSX.Element {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : height,
      useNativeDriver: true,
      damping: 18,
      stiffness: 140,
    }).start();
  }, [height, translateY, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 8,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 80) {
            onClose();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 18,
              stiffness: 140,
            }).start();
          }
        },
      }),
    [onClose, translateY],
  );

  if (!visible) return <></>;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, { height, paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY }] }, contentStyle]} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.secondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: COLORS.gray700,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.gray600,
    marginBottom: 12,
  },
});