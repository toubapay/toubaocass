import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';

import { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { isUrgent } from '../utils/trip';

/**
 * Always-visible trip-detail badge: calm green when the trip still has
 * seats, pulsing red when departure is imminent or only one seat remains.
 */
export function TripUrgencyBadge({ trip }: { trip: Trip }) {
  const urgent = isUrgent(trip);
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (!urgent || reduceMotion) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [urgent, reduceMotion, opacity]);

  if (trip.status !== 'scheduled' || trip.available_seats <= 0) return null;

  return (
    <Animated.View
      style={[styles.badge, urgent ? styles.urgent : styles.calm, { opacity: urgent && !reduceMotion ? opacity : 1 }]}
    >
      <Text style={[styles.text, urgent ? styles.urgentText : styles.calmText]}>
        {urgent ? '⚡ Départ imminent' : '🟢 Places disponibles'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  urgent: { backgroundColor: colors.dangerSoft },
  calm: { backgroundColor: colors.successSoft },
  text: { fontSize: 12.5, fontWeight: '700' },
  urgentText: { color: colors.danger },
  calmText: { color: colors.success },
});
