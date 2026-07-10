import { useState } from 'react';
import { createPortal } from 'react-dom';

import { bookTrip, updateBooking } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { fetchTrip } from '../api/trips';
import type { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';

export function BookingQuickActionModal({
  trip,
  onClose,
  onSuccess,
}: {
  trip: Trip;
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

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          padding: spacing.lg,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
          {editing ? 'Modifier la réservation' : 'Réserver ce trajet'}
        </h2>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>
          {trip.origin_city?.name} → {trip.destination_city?.name} · {trip.departure_date} à {trip.departure_time}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            {editing ? 'Nombre de places' : 'Places à réserver'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <button
              onClick={() => setSeats((s) => Math.max(editing ? 0 : 1, s - 1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                border: `1px solid ${colors.border}`,
                background: colors.background,
                fontSize: 18,
                fontWeight: 700,
                color: colors.primary,
                cursor: 'pointer',
              }}
            >
              −
            </button>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.text, minWidth: 24, textAlign: 'center' }}>
              {seats}
            </span>
            <button
              onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                border: `1px solid ${colors.border}`,
                background: colors.background,
                fontSize: 18,
                fontWeight: 700,
                color: colors.primary,
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </div>

        {editing && seats === 0 && (
          <p style={{ fontSize: 12, color: colors.danger, marginTop: -spacing.sm, marginBottom: spacing.md }}>
            Réduire à 0 place annulera votre réservation.
          </p>
        )}
        {error && <p style={{ fontSize: 12, color: colors.danger, marginBottom: spacing.sm }}>{error}</p>}

        <p style={{ fontSize: 15, fontWeight: 700, color: colors.primary, marginBottom: spacing.md }}>
          {(trip.fare * seats).toLocaleString()} FCFA
        </p>

        <Button
          label={editing ? (seats === 0 ? 'Annuler la réservation' : 'Enregistrer') : 'Confirmer la réservation'}
          onClick={handleConfirm}
          loading={loading}
          variant={editing && seats === 0 ? 'danger' : 'primary'}
        />
        <div style={{ marginTop: spacing.sm }}>
          <Button label="Fermer" onClick={onClose} variant="outline" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
