import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

interface Props {
  size?: number;
}

function useRingAnimation(delayMs: number) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(delayMs),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, delayMs]);

  return progress;
}

/**
 * A small car-in-a-circle badge with two staggered "radar ping" rings
 * expanding outward, looping forever — a lightweight stand-in for a
 * dispatch animation while a Dem Légui request is searching for a driver.
 */
export function SearchingCarIndicator({ size = 30 }: Props) {
  const ring1 = useRingAnimation(0);
  const ring2 = useRingAnimation(800);

  const ringStyle = (progress: Animated.Value) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.65, 0] }),
    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.9] }) }],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={ringStyle(ring1)} />
      <Animated.View style={ringStyle(ring2)} />
      <View
        style={[
          styles.core,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={{ fontSize: size * 0.55 }}>🚕</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
});
