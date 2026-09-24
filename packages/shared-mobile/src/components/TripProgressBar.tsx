import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

interface Props {
  /** 0 to 1, or null for an indeterminate/unknown-duration bar. */
  progress: number | null;
}

/**
 * Visual stand-in for the trip's "in progress" status — a filled track when the estimated
 * route duration is known (see useTripProgress), or a muted half-filled bar when it isn't,
 * so the rider always sees *something* moving rather than a bare status word. No animation:
 * position comes from polling, same "recent snapshot, not a live feed" honesty as the rest
 * of this app's live-tracking UI.
 */
export function TripProgressBar({ progress }: Props) {
  const isIndeterminate = progress === null;
  const fillWidth = isIndeterminate ? '50%' : `${Math.round(progress * 100)}%`;

  return (
    <View style={styles.track}>
      <View
        style={[styles.fill, { width: fillWidth }, isIndeterminate && styles.fillIndeterminate]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  fillIndeterminate: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
});
