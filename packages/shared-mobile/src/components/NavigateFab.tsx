import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing } from '../theme';
import { openNavigation } from '../utils/navigation';

/**
 * Small floating button pinned to the right edge of the screen, vertically
 * centered — always reachable regardless of scroll position. Opens Google
 * Maps turn-by-turn navigation (voice guidance, live traffic, rerouting) to
 * the given point; the caller decides what that point is (pickup vs.
 * destination, by trip phase) and simply doesn't render this when no
 * coordinate is available yet.
 */
export function NavigateFab({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  return (
    <Pressable
      onPress={() => openNavigation(latitude, longitude)}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={styles.fab}
    >
      <Text style={styles.icon}>🧭</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: '50%',
    right: -spacing.md,
    marginTop: -22,
    zIndex: 150,
    width: 44,
    height: 44,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    fontSize: 20,
    color: '#fff',
  },
});
