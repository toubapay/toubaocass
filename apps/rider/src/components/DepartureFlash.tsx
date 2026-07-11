import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../theme';

/**
 * A pulsing "departing soon" badge for trips leaving within the next few
 * hours, so a rider scanning the list doesn't miss one that's about to go.
 */
export function DepartureFlash() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, opacity]);

  return (
    <Animated.View style={[styles.badge, { opacity: reduceMotion ? 1 : opacity }]}>
      <Text style={styles.text}>⚡ Départ imminent</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  text: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.danger,
  },
});
