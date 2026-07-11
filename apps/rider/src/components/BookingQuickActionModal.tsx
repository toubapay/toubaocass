import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { bookTrip, updateBooking } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { fetchTrip } from '../api/trips';
import { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';

export function BookingQuickActionModal({
  trip,
  visible,
  onClose,
  onSuccess,
}: {
  trip: Trip;
  visible: boolean;
  onClose: () => void;
  onSuccess: (updatedTrip: Trip) => void;
}) {
  const editing = trip.my_booking != null;
  const maxSeats = trip.available_seats + (trip.my_booking?.seats_booked ?? 0);
  const [seats, setSeats] = useState(trip.my_booking?.seats_booked ?? 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleConfirm = async () => {
    setLoading(true);
    setError(undefined);
    try {
      if (editing) {
        await updateBooking(trip.my_booking!.id, seats);
      } else {
        await bookTrip(trip.id, seats);
      }
      const updatedTrip = await fetchTrip(trip.id);
      onSuccess(updatedTrip);
      onClose();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{editing ? 'Modifier la réservation' : 'Réserver ce trajet'}</Text>
          <Text style={styles.subtitle}>
            {trip.origin_city?.name} → {trip.destination_city?.name} · {trip.departure_date} à {trip.departure_time}
          </Text>

          <View style={styles.seatsRow}>
            <Text style={styles.seatsLabel}>{editing ? 'Nombre de places' : 'Places à réserver'}</Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setSeats((s) => Math.max(editing ? 0 : 1, s - 1))}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>
              <Text style={styles.seatsValue}>{seats}</Text>
              <Pressable style={styles.stepperButton} onPress={() => setSeats((s) => Math.min(maxSeats, s + 1))}>
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          {editing && seats === 0 && <Text style={styles.warning}>Réduire à 0 place annulera votre réservation.</Text>}
          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.fare}>{(trip.fare * seats).toLocaleString()} FCFA</Text>

          <Button
            label={editing ? (seats === 0 ? 'Annuler la réservation' : 'Enregistrer') : 'Confirmer la réservation'}
            onPress={handleConfirm}
            loading={loading}
            variant={editing && seats === 0 ? 'danger' : 'primary'}
          />
          <Button label="Fermer" onPress={onClose} variant="outline" style={styles.closeButton} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  seatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  seatsLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  seatsValue: { fontSize: 20, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
  warning: { fontSize: 13, color: colors.danger, marginTop: -spacing.sm, marginBottom: spacing.md },
  error: { fontSize: 13, color: colors.danger, marginBottom: spacing.sm },
  fare: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  closeButton: { marginTop: spacing.sm },
});
