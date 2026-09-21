import { useEffect, useState } from 'react';

import { extractErrorMessage } from '../../api/client';
import { assignDeliveryDriver, cancelAdminDelivery, fetchAdminDeliveries } from '../../api/deliveryManagement';
import { assignDemLeguiTripDriver, cancelAdminDemLeguiTrip, fetchAdminDemLeguiTrips } from '../../api/demLeguiTripManagement';
import { assignTripDriver, cancelTrip, fetchEligibleDrivers, fetchTrips } from '../../api/tripManagement';
import type { AdminDelivery, AdminDemLeguiTrip, AdminTrip, EligibleDriver } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

type Tab = 'trips' | 'deliveries' | 'dem_legui';

const TRIP_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programmé',
  full: 'Complet',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  picked_up: 'Récupérée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const DEM_LEGUI_TRIP_STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const DEM_LEGUI_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  matched: 'Confirmé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

// Dem Légui trips can be actively moving — poll faster than the other two
// tabs (which only change on an admin/driver action) so the position link
// and status shown here stay close to live, mirroring the live-trips map's
// cadence.
const DEM_LEGUI_POLL_INTERVAL_MS = 15000;

function StatusBadge({ label, tone }: { label: string; tone: 'neutral' | 'danger' | 'success' }) {
  const style =
    tone === 'danger'
      ? { bg: colors.dangerSoft, fg: colors.danger }
      : tone === 'success'
        ? { bg: colors.successSoft, fg: colors.success }
        : { bg: colors.background, fg: colors.textMuted };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        backgroundColor: style.bg,
        color: style.fg,
      }}
    >
      {label}
    </span>
  );
}

/**
 * Inline "assign/reassign a driver" control — a dropdown of eligible
 * drivers plus a confirm button, expanded in place next to the row rather
 * than in a separate modal (the admin app has no modal component yet, and
 * this keeps the interaction to a single click).
 */
function AssignDriverControl({
  requiresActiveCar,
  busy,
  onAssign,
}: {
  requiresActiveCar: boolean;
  busy: boolean;
  onAssign: (driverId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [drivers, setDrivers] = useState<EligibleDriver[] | null>(null);
  const [selected, setSelected] = useState<number | ''>('');

  const openPicker = () => {
    setOpen(true);
    if (drivers === null) {
      fetchEligibleDrivers(requiresActiveCar).then(setDrivers);
    }
  };

  if (!open) {
    return <Button label="Assigner un chauffeur" onClick={openPicker} variant="outline" style={{ fontSize: 12.5, padding: '6px 10px', minHeight: 30 }} />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
      {drivers === null ? (
        <span style={{ fontSize: 12.5, color: colors.textMuted }}>Chargement…</span>
      ) : (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : '')}
            style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '5px 8px', fontSize: 12.5, minWidth: 160 }}
          >
            <option value="">Choisir un conducteur…</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name ?? `#${driver.id}`} · {driver.phone}
              </option>
            ))}
          </select>
          {drivers.length === 0 && <span style={{ fontSize: 12, color: colors.textMuted }}>Aucun conducteur éligible.</span>}
          <Button
            label="Valider"
            onClick={() => selected && onAssign(selected)}
            disabled={!selected}
            loading={busy}
            style={{ fontSize: 12.5, padding: '6px 10px', minHeight: 30 }}
          />
          <Button label="Annuler" onClick={() => setOpen(false)} variant="outline" style={{ fontSize: 12.5, padding: '6px 10px', minHeight: 30 }} />
        </>
      )}
    </div>
  );
}

function TripsTab() {
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchTrips()
      .then((res) => setTrips(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCancel = async (trip: AdminTrip) => {
    if (!window.confirm(`Annuler le trajet #${trip.id} ? Les réservations confirmées seront remboursées.`)) return;
    setBusyId(trip.id);
    setError(null);
    try {
      await cancelTrip(trip.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleAssign = async (trip: AdminTrip, driverId: number) => {
    setBusyId(trip.id);
    setError(null);
    try {
      await assignTripDriver(trip.id, driverId);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      {error && <p style={{ color: colors.danger, fontSize: 13.5, marginBottom: spacing.sm }}>{error}</p>}
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
              {['Trajet', 'Départ', 'Statut', 'Conducteur', 'Places', ''].map((label) => (
                <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => {
              const canCancel = !['completed', 'cancelled'].includes(trip.status);
              const canReassign = !['in_progress', 'completed', 'cancelled'].includes(trip.status);
              return (
                <tr key={trip.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text, fontWeight: 600 }}>
                    {trip.origin_city} → {trip.destination_city}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted }}>
                    {trip.departure_date} {trip.departure_time}
                  </td>
                  <td style={{ padding: spacing.sm }}>
                    <StatusBadge
                      label={TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                      tone={trip.status === 'cancelled' ? 'danger' : trip.status === 'completed' ? 'success' : 'neutral'}
                    />
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.text }}>
                    {trip.driver_name ?? '—'} {trip.driver_phone ? `· ${trip.driver_phone}` : ''}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted }}>
                    {trip.confirmed_bookings_count}/{trip.total_seats}
                  </td>
                  <td style={{ padding: spacing.sm }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, alignItems: 'flex-start' }}>
                      {canReassign && (
                        <AssignDriverControl requiresActiveCar busy={busyId === trip.id} onAssign={(driverId) => handleAssign(trip, driverId)} />
                      )}
                      {canCancel && (
                        <Button label="Annuler" onClick={() => handleCancel(trip)} variant="danger" loading={busyId === trip.id} style={{ fontSize: 12.5, padding: '6px 10px', minHeight: 30 }} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {trips.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                  Aucun trajet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeliveriesTab() {
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchAdminDeliveries()
      .then((res) => setDeliveries(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCancel = async (delivery: AdminDelivery) => {
    if (!window.confirm(`Annuler la livraison #${delivery.id} ?`)) return;
    setBusyId(delivery.id);
    setError(null);
    try {
      await cancelAdminDelivery(delivery.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleAssign = async (delivery: AdminDelivery, driverId: number) => {
    setBusyId(delivery.id);
    setError(null);
    try {
      await assignDeliveryDriver(delivery.id, driverId);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      {error && <p style={{ color: colors.danger, fontSize: 13.5, marginBottom: spacing.sm }}>{error}</p>}
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
              {['Livraison', 'Expéditeur', 'Statut', 'Conducteur', ''].map((label) => (
                <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => {
              const canCancel = ['pending', 'accepted'].includes(delivery.status);
              const canAssign = ['pending', 'accepted'].includes(delivery.status);
              return (
                <tr key={delivery.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text, fontWeight: 600 }}>
                    #{delivery.id} — {delivery.pickup_address_line} → {delivery.receiver_address_line}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted }}>
                    {delivery.sender_name} {delivery.sender_phone ? `· ${delivery.sender_phone}` : ''}
                  </td>
                  <td style={{ padding: spacing.sm }}>
                    <StatusBadge
                      label={DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}
                      tone={delivery.status === 'cancelled' ? 'danger' : delivery.status === 'delivered' ? 'success' : 'neutral'}
                    />
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.text }}>
                    {delivery.driver_name ?? 'Non assignée'} {delivery.driver_phone ? `· ${delivery.driver_phone}` : ''}
                  </td>
                  <td style={{ padding: spacing.sm }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, alignItems: 'flex-start' }}>
                      {canAssign && (
                        <AssignDriverControl requiresActiveCar={false} busy={busyId === delivery.id} onAssign={(driverId) => handleAssign(delivery, driverId)} />
                      )}
                      {canCancel && (
                        <Button label="Annuler" onClick={() => handleCancel(delivery)} variant="danger" loading={busyId === delivery.id} style={{ fontSize: 12.5, padding: '6px 10px', minHeight: 30 }} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                  Aucune livraison.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DemLeguiTab() {
  const [trips, setTrips] = useState<AdminDemLeguiTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    fetchAdminDemLeguiTrips()
      .then((res) => setTrips(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(false), DEM_LEGUI_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (trip: AdminDemLeguiTrip) => {
    if (!window.confirm(`Annuler le trajet Dem Légui #${trip.id} ? Les clients confirmés seront remboursés.`)) return;
    setBusyId(trip.id);
    setError(null);
    try {
      await cancelAdminDemLeguiTrip(trip.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleAssign = async (trip: AdminDemLeguiTrip, driverId: number) => {
    setBusyId(trip.id);
    setError(null);
    try {
      await assignDemLeguiTripDriver(trip.id, driverId);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      {error && <p style={{ color: colors.danger, fontSize: 13.5, marginBottom: spacing.sm }}>{error}</p>}
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
              {['Trajet', 'Statut', 'Conducteur', 'Véhicule', 'Clients', 'Position', ''].map((label) => (
                <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => {
              const canCancel = !['completed', 'cancelled'].includes(trip.status);
              const canReassign = trip.status === 'open';
              const clients = trip.requests.filter((r) => r.status !== 'cancelled' && r.status !== 'expired');
              return (
                <tr key={trip.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text, fontWeight: 600 }}>
                    #{trip.id} → {trip.destination_city?.name ?? '?'}
                  </td>
                  <td style={{ padding: spacing.sm }}>
                    <StatusBadge
                      label={DEM_LEGUI_TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                      tone={trip.status === 'cancelled' ? 'danger' : trip.status === 'completed' ? 'success' : 'neutral'}
                    />
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.text }}>
                    {trip.driver.name ?? `#${trip.driver.id}`}
                    <span style={{ display: 'block', color: colors.textMuted }}>{trip.driver.phone}</span>
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted }}>
                    {trip.car ? `${trip.car.make} ${trip.car.model} · ${trip.car.plate_number}` : '—'}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 12.5, color: colors.text }}>
                    {clients.length === 0 ? (
                      <span style={{ color: colors.textMuted }}>Aucun client</span>
                    ) : (
                      clients.map((client) => (
                        <span key={client.id} style={{ display: 'block', marginBottom: 2 }}>
                          {client.rider.name ?? `#${client.rider.id}`} · {client.rider.phone}
                          <span style={{ color: colors.textMuted }}> — {DEM_LEGUI_REQUEST_STATUS_LABELS[client.status] ?? client.status}</span>
                        </span>
                      ))
                    )}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13 }}>
                    {trip.current_latitude != null && trip.current_longitude != null ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${trip.current_latitude},${trip.current_longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: colors.accent, fontWeight: 700, textDecoration: 'none' }}
                      >
                        📍 Suivre
                      </a>
                    ) : (
                      <span style={{ color: colors.textMuted }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: spacing.sm }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, alignItems: 'flex-start' }}>
                      {canReassign && (
                        <AssignDriverControl requiresActiveCar busy={busyId === trip.id} onAssign={(driverId) => handleAssign(trip, driverId)} />
                      )}
                      {canCancel && (
                        <Button label="Annuler" onClick={() => handleCancel(trip)} variant="danger" loading={busyId === trip.id} style={{ fontSize: 12.5, padding: '6px 10px', minHeight: 30 }} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {trips.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                  Aucun trajet Dem Légui.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TripManagementPage() {
  const [tab, setTab] = useState<Tab>('trips');

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>Gestion des trajets</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>
        Annulez un trajet ou une livraison, ou réassignez-le à un autre conducteur.
      </p>

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
        {([
          { key: 'trips', label: 'Trajets' },
          { key: 'deliveries', label: 'Livraisons' },
          { key: 'dem_legui', label: 'Dem Légui' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: tab === key ? colors.primary : colors.surface,
              color: tab === key ? '#fff' : colors.text,
              borderRadius: radius.sm,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'trips' ? <TripsTab /> : tab === 'deliveries' ? <DeliveriesTab /> : <DemLeguiTab />}
    </div>
  );
}
