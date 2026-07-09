import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { bookTrip } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { fetchTrip } from '../api/trips';
import type { Trip } from '../api/types';
import { Button } from '../components/Button';
import { DepartureFlash } from '../components/DepartureFlash';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';
import { isDepartingSoon } from '../utils/trip';

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    fetchTrip(Number(id))
      .then(setTrip)
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleBook = async () => {
    if (!trip) return;
    setBooking(true);
    try {
      await bookTrip(trip.id, seats);
      alert(`Vous avez réservé ${seats} place(s). Bon voyage ! Vous pouvez la consulter dans Mes réservations.`);
      navigate('/bookings');
    } catch (err) {
      alert(extractErrorMessage(err));
      load();
    } finally {
      setBooking(false);
    }
  };

  if (loading || !trip) {
    return <CenteredSpinner />;
  }

  const isFull = trip.available_seats <= 0 || trip.status !== 'scheduled';
  const hasPin = trip.departure_latitude !== null && trip.departure_longitude !== null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    border: `1px solid ${colors.border}`,
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    margin: `0 0 ${spacing.xs}px`,
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: spacing.sm }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>{trip.origin_city?.name}</span>
        <span style={{ margin: `0 ${spacing.sm}px`, color: colors.textMuted, fontSize: 18 }}>→</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>{trip.destination_city?.name}</span>
      </div>
      <p style={{ color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg }}>
        {trip.departure_date} à {trip.departure_time}
      </p>
      {isDepartingSoon(trip) && <DepartureFlash />}

      {hasPin && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>Point de départ</p>
          {trip.departure_address && <p style={{ fontSize: 16, color: colors.text, margin: 0 }}>{trip.departure_address}</p>}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${trip.departure_latitude},${trip.departure_longitude}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: colors.primary, fontWeight: 700, fontSize: 13, marginTop: spacing.sm, display: 'inline-block' }}
          >
            Ouvrir dans Google Maps
          </a>
        </div>
      )}

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Conducteur</p>
        <p style={{ fontSize: 16, color: colors.text, margin: 0 }}>{trip.driver.name ?? 'Conducteur'}</p>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '2px 0 0' }}>Note : {trip.driver.rating?.toFixed(1) ?? '5.0'} ★</p>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Véhicule</p>
        <p style={{ fontSize: 16, color: colors.text, margin: 0 }}>
          {trip.car?.make} {trip.car?.model} · {trip.car?.color}
        </p>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '2px 0 0' }}>{trip.ride_type.toUpperCase()}</p>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Tarif</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: colors.primary, margin: 0 }}>{trip.fare.toLocaleString()} FCFA / place</p>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '2px 0 0' }}>
          {trip.available_seats} place(s) restante(s) sur {trip.total_seats}
        </p>
      </div>

      {trip.notes && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>Remarques</p>
          <p style={{ fontSize: 16, color: colors.text, margin: 0 }}>{trip.notes}</p>
        </div>
      )}

      {isFull ? (
        <p style={{ color: colors.danger, textAlign: 'center', marginBottom: spacing.md }}>Ce trajet n'est plus disponible.</p>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Places à réserver</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <button
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              style={{ width: 44, minHeight: 44, border: `1.5px solid ${colors.primary}`, borderRadius: radius.md, background: 'none', color: colors.primary, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}
            >
              -
            </button>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.text, minWidth: 24, textAlign: 'center' }}>{seats}</span>
            <button
              onClick={() => setSeats((s) => Math.min(trip.available_seats, s + 1))}
              style={{ width: 44, minHeight: 44, border: `1.5px solid ${colors.primary}`, borderRadius: radius.md, background: 'none', color: colors.primary, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}
            >
              +
            </button>
          </div>
        </div>
      )}

      <Button
        label={`Réserver pour ${(trip.fare * seats).toLocaleString()} FCFA`}
        onClick={handleBook}
        loading={booking}
        disabled={isFull}
      />
    </div>
  );
}
