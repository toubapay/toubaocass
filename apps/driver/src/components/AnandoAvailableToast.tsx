import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchAnandoRides } from '../api/anando';
import { AnandoRide } from '../api/types';
import { useAnandoBeep } from '../hooks/useAnandoBeep';
import { TripsStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 20000;
const VISIBLE_DURATION_MS = 4000;
const FADE_DURATION_MS = 350;

type Nav = NativeStackNavigationProp<TripsStackParamList>;

/**
 * Fixed banner pinned to the very top of the Trips screen, one per
 * newly-posted Anando ride — polling (no WebSocket infra in this backend),
 * mirroring the rider app's toast. The first fetch only seeds "already
 * seen" ride ids silently so existing rides don't all pop up at once on
 * app open; only rides discovered on later polls queue a toast + beep.
 */
export function AnandoAvailableToast() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [queue, setQueue] = useState<AnandoRide[]>([]);
  const [current, setCurrent] = useState<AnandoRide | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const seenIds = useRef<Set<number> | null>(null);
  const playBeep = useAnandoBeep();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchAnandoRides()
        .then((res) => {
          if (cancelled) return;
          const rides = res.data;

          if (seenIds.current === null) {
            seenIds.current = new Set(rides.map((r) => r.id));
            return;
          }

          const fresh = rides.filter((r) => !seenIds.current!.has(r.id));
          if (fresh.length === 0) return;

          fresh.forEach((r) => seenIds.current!.add(r.id));
          setQueue((prev) => [...prev, ...fresh]);
          playBeep();
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (current === null && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [current, queue]);

  useEffect(() => {
    if (!current) return;

    if (reduceMotion) {
      opacity.setValue(1);
      const timeout = setTimeout(() => setCurrent(null), VISIBLE_DURATION_MS);
      return () => clearTimeout(timeout);
    }

    const sequence = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: FADE_DURATION_MS, useNativeDriver: true }),
      Animated.delay(VISIBLE_DURATION_MS),
      Animated.timing(opacity, { toValue: 0, duration: FADE_DURATION_MS, useNativeDriver: true }),
    ]);
    sequence.start(({ finished }) => {
      if (finished) setCurrent(null);
    });
    return () => sequence.stop();
  }, [current, reduceMotion, opacity]);

  if (!current) return null;

  const handlePress = () => {
    setCurrent(null);
    navigation.navigate('AnandoRideDetail', { rideId: current.id });
  };

  return (
    <Pressable style={styles.overlay} onPress={handlePress}>
      <Animated.View style={[styles.toast, { opacity: reduceMotion ? 1 : opacity }]}>
        <Text style={styles.text} numberOfLines={1}>
          {t('anando.newRideToast', {
            origin: current.origin_city?.name ?? '',
            destination: current.destination_city?.name ?? '',
          })}
        </Text>
        <Text style={styles.link}>{t('anando.newRideToastView')}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    backgroundColor: colors.successSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  text: { fontSize: 12.5, fontWeight: '700', color: colors.success, flexShrink: 1, marginRight: spacing.sm },
  link: { fontSize: 12.5, fontWeight: '700', color: colors.success },
});
