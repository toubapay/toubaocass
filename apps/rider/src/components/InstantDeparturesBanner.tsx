import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchInstantTrips } from '../api/trips';
import { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 20000;

/**
 * Always-visible home-screen badge for "instant post" style departures
 * (drivers leaving right away, no scheduled date/time). Polls rather than
 * relying solely on push, matching the web app's equivalent banner.
 */
export function InstantDeparturesBanner() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [count, setCount] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchInstantTrips()
        .then((trips) => {
          if (!cancelled) setCount(trips.length);
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (count === 0 || reduceMotion) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [count, reduceMotion, opacity]);

  if (count === 0) return null;

  return (
    <Pressable onPress={() => navigation.navigate('InstantDepartures')}>
      <Animated.View style={[styles.banner, { opacity: reduceMotion ? 1 : opacity }]}>
        <Text style={styles.text}>{t('instantDepartures.bannerLabel', { count })}</Text>
        <Text style={styles.link}>{t('instantDepartures.bannerView')}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.dangerSoft,
  },
  text: { fontSize: 14, fontWeight: '700', color: colors.danger },
  link: { fontSize: 14, fontWeight: '700', color: colors.danger },
});
