import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchCities } from '../api/cities';
import { createDemLeguiRequest, fetchMyActiveDemLeguiRequest, quoteDemLeguiRequest } from '../api/demLegui';
import { extractErrorMessage } from '../api/client';
import type { City, PaymentMethod } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { AddressMapPicker } from '../components/AddressMapPicker';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { CityPicker } from '../components/CityPicker';
import { TextField } from '../components/TextField';
import { WalletIcon } from '../components/WalletIcon';
import { colors, radius, spacing } from '../theme';

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.xs,
  textTransform: 'uppercase' as const,
};

export function NewDemLeguiRequestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [cities, setCities] = useState<City[]>([]);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [seats, setSeats] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [quote, setQuote] = useState<{ distance_km: number; fare_total: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingActive, setCheckingActive] = useState(true);

  // A rider may only have one active Dem Légui request at a time — if they
  // already have one (still searching, or matched to a trip that hasn't
  // finished), send them straight back to it instead of showing the form,
  // so navigating away and back (or re-opening the module) never strands
  // them without a way to find their ride again.
  useEffect(() => {
    let cancelled = false;
    fetchMyActiveDemLeguiRequest()
      .then((active) => {
        if (cancelled) return;
        if (active) {
          navigate(`/services/dem-legui/${active.id}`, { replace: true });
        } else {
          setCheckingActive(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckingActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    fetchCities().then(setCities);
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
  }, []);

  useEffect(() => {
    if (pickupLat == null || pickupLng == null || !destination) {
      setQuote(null);
      return;
    }
    const seatsRequested = Number(seats) || 1;
    setQuoting(true);
    const timeout = setTimeout(() => {
      quoteDemLeguiRequest({
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        destination_city_id: destination.id,
        seats_requested: seatsRequested,
      })
        .then(setQuote)
        .catch(() => setQuote(null))
        .finally(() => setQuoting(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [pickupLat, pickupLng, destination, seats]);

  const canSubmit =
    pickupAddress.trim() !== '' && pickupLat != null && pickupLng != null && destination != null && Number(seats) > 0 && quote != null;

  const insufficientWalletFunds =
    paymentMethod === 'wallet' && walletBalance !== null && quote !== null && walletBalance < quote.fare_total;

  const handleSubmit = async () => {
    if (!canSubmit || pickupLat == null || pickupLng == null || !destination) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await createDemLeguiRequest({
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        pickup_address: pickupAddress,
        destination_city_id: destination.id,
        seats_requested: Number(seats),
        payment_method: paymentMethod,
      });
      navigate(`/services/dem-legui/${request.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingActive) {
    return <CenteredSpinner />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <button
          onClick={() => navigate(-1)}
          style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0 }}
        >
          ←
        </button>
        <button
          onClick={() => navigate('/ride-bookings')}
          style={{ border: 'none', background: 'none', color: colors.primary, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
        >
          🧾 {t('demLegui.myBookingsLink')}
        </button>
      </div>

      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('demLegui.title')}</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 0, marginBottom: spacing.lg }}>{t('demLegui.subtitle')}</p>

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('demLegui.pickup')}</p>
        <AddressMapPicker
          addressLine={pickupAddress}
          onAddressLineChange={setPickupAddress}
          latitude={pickupLat}
          longitude={pickupLng}
          onLocationChange={(lat, lng) => {
            setPickupLat(lat);
            setPickupLng(lng);
          }}
        />
      </div>

      <div style={{ marginBottom: spacing.md }}>
        <CityPicker label={t('demLegui.destination')} cities={cities} value={destination} onChange={setDestination} />
      </div>

      <TextField
        label={t('demLegui.seats')}
        type="number"
        inputMode="numeric"
        min={1}
        max={8}
        value={seats}
        onChange={(e) => setSeats(e.target.value)}
      />

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('demLegui.estimatedFare')}</p>
        <div style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, border: `1px solid ${colors.border}` }}>
          {quoting ? (
            <p style={{ color: colors.textMuted, margin: 0 }}>{t('demLegui.calculating')}</p>
          ) : quote ? (
            <>
              <p style={{ fontSize: 22, fontWeight: 800, color: colors.primary, margin: 0 }}>{quote.fare_total.toLocaleString()} FCFA</p>
              <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>{quote.distance_km} km</p>
            </>
          ) : (
            <p style={{ color: colors.textMuted, margin: 0 }}>{t('demLegui.placePickupAndDestinationPrompt')}</p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('anando.paymentMethod')}</p>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button
            onClick={() => setPaymentMethod('cash')}
            style={{
              flex: 1,
              border: `1.5px solid ${paymentMethod === 'cash' ? colors.primary : colors.border}`,
              borderRadius: radius.md,
              padding: spacing.sm,
              backgroundColor: paymentMethod === 'cash' ? colors.accentSoft : colors.surface,
              color: paymentMethod === 'cash' ? colors.primary : colors.textMuted,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            💵 {t('common.cash')}
          </button>
          <button
            onClick={() => setPaymentMethod('wallet')}
            style={{
              flex: 1,
              border: `1.5px solid ${paymentMethod === 'wallet' ? colors.primary : colors.border}`,
              borderRadius: radius.md,
              padding: spacing.sm,
              backgroundColor: paymentMethod === 'wallet' ? colors.accentSoft : colors.surface,
              color: paymentMethod === 'wallet' ? colors.primary : colors.textMuted,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <WalletIcon size={15} color={paymentMethod === 'wallet' ? colors.primary : colors.textMuted} detailColor={paymentMethod === 'wallet' ? colors.accentSoft : colors.surface} />
              {t('common.wallet')}
            </span>
          </button>
        </div>
        {insufficientWalletFunds && <p style={{ fontSize: 12.5, color: colors.danger, marginTop: spacing.sm }}>{t('common.insufficientFunds')}</p>}
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.md }}>{error}</p>}

      <Button
        label={quote ? t('demLegui.submitWithFare', { amount: quote.fare_total.toLocaleString() }) : t('demLegui.submit')}
        onClick={handleSubmit}
        loading={submitting}
        disabled={!canSubmit || insufficientWalletFunds}
      />
    </div>
  );
}
