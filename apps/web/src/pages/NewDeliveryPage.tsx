import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { createDelivery, quoteDelivery } from '../api/deliveries';
import { extractErrorMessage } from '../api/client';
import type { PackageType, PaymentMethod } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { AddressMapPicker } from '../components/AddressMapPicker';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { WalletIcon } from '../components/WalletIcon';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

const PACKAGE_TYPES: PackageType[] = ['document', 'colis_leger', 'colis_moyen', 'colis_volumineux'];

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.xs,
  textTransform: 'uppercase' as const,
};

export function NewDeliveryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pickupAddressLine, setPickupAddressLine] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddressLine, setReceiverAddressLine] = useState('');
  const [receiverLat, setReceiverLat] = useState<number | null>(null);
  const [receiverLng, setReceiverLng] = useState<number | null>(null);

  const [packageType, setPackageType] = useState<PackageType>('colis_leger');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [quote, setQuote] = useState<{ distance_km: number; fee: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
  }, []);

  useEffect(() => {
    if (pickupLat == null || pickupLng == null || receiverLat == null || receiverLng == null) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    const timeout = setTimeout(() => {
      quoteDelivery({
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        receiver_latitude: receiverLat,
        receiver_longitude: receiverLng,
      })
        .then(setQuote)
        .catch(() => setQuote(null))
        .finally(() => setQuoting(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [pickupLat, pickupLng, receiverLat, receiverLng]);

  const canSubmit =
    pickupAddressLine.trim() !== '' &&
    pickupLat != null &&
    pickupLng != null &&
    receiverName.trim() !== '' &&
    receiverPhone.trim() !== '' &&
    receiverAddressLine.trim() !== '' &&
    receiverLat != null &&
    receiverLng != null &&
    quote != null;

  const insufficientWalletFunds =
    paymentMethod === 'wallet' && walletBalance !== null && quote !== null && walletBalance < quote.fee;

  const handleSubmit = async () => {
    if (!canSubmit || pickupLat == null || pickupLng == null || receiverLat == null || receiverLng == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const delivery = await createDelivery({
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address_line: receiverAddressLine,
        receiver_latitude: receiverLat,
        receiver_longitude: receiverLng,
        pickup_address_line: pickupAddressLine,
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        package_type: packageType,
        notes: notes || undefined,
        payment_method: paymentMethod,
      });
      navigate(`/deliveries/${delivery.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('newDelivery.title')}</h1>

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('newDelivery.sender')}</p>
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: 0 }}>{user?.name}</p>
          <p style={{ fontSize: 15, color: colors.textMuted, margin: '2px 0 0' }}>{user?.phone}</p>
        </div>
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('newDelivery.pickupAddress')}</p>
        <AddressMapPicker
          addressLine={pickupAddressLine}
          onAddressLineChange={setPickupAddressLine}
          latitude={pickupLat}
          longitude={pickupLng}
          onLocationChange={(lat, lng) => {
            setPickupLat(lat);
            setPickupLng(lng);
          }}
        />
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('newDelivery.receiver')}</p>
        <TextField
          label={t('newDelivery.receiverName')}
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          placeholder={t('newDelivery.receiverNamePlaceholder')}
        />
        <TextField
          label={t('newDelivery.receiverPhone')}
          value={receiverPhone}
          onChange={(e) => setReceiverPhone(e.target.value)}
          placeholder={t('newDelivery.receiverPhonePlaceholder')}
        />
        <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
          {t('newDelivery.deliveryAddress')}
        </label>
        <AddressMapPicker
          addressLine={receiverAddressLine}
          onAddressLineChange={setReceiverAddressLine}
          latitude={receiverLat}
          longitude={receiverLng}
          onLocationChange={(lat, lng) => {
            setReceiverLat(lat);
            setReceiverLng(lng);
          }}
        />
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('newDelivery.packageType')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {PACKAGE_TYPES.map((pt) => (
            <button
              key={pt}
              onClick={() => setPackageType(pt)}
              style={{
                border: `1.5px solid ${packageType === pt ? colors.primary : colors.border}`,
                borderRadius: radius.md,
                padding: `${spacing.sm}px ${spacing.md}px`,
                backgroundColor: packageType === pt ? colors.accentSoft : colors.surface,
                color: packageType === pt ? colors.primary : colors.textMuted,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t(`common.packageType.${pt}`)}
            </button>
          ))}
        </div>
      </div>

      <TextField
        label={t('newDelivery.notes')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('newDelivery.notesPlaceholder')}
      />

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('newDelivery.estimatedFee')}</p>
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            border: `1px solid ${colors.border}`,
          }}
        >
          {quoting ? (
            <p style={{ color: colors.textMuted, margin: 0 }}>{t('newDelivery.calculating')}</p>
          ) : quote ? (
            <>
              <p style={{ fontSize: 22, fontWeight: 800, color: colors.primary, margin: 0 }}>{quote.fee.toLocaleString()} FCFA</p>
              <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>{quote.distance_km} km</p>
            </>
          ) : (
            <p style={{ color: colors.textMuted, margin: 0 }}>{t('newDelivery.placeAddressesPrompt')}</p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <p style={sectionTitleStyle}>{t('newDelivery.paymentMethod')}</p>
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
              <WalletIcon
                size={15}
                color={paymentMethod === 'wallet' ? colors.primary : colors.textMuted}
                detailColor={paymentMethod === 'wallet' ? colors.accentSoft : colors.surface}
              />
              {t('newDelivery.walletWithBalance', { balance: walletBalance !== null ? `(${walletBalance.toLocaleString()} F)` : '' })}
            </span>
          </button>
        </div>
        {insufficientWalletFunds && (
          <p style={{ fontSize: 12.5, color: colors.danger, marginTop: spacing.xs, marginBottom: 0 }}>
            {t('common.insufficientFunds')}{' '}
            <button
              onClick={() => navigate('/wallet')}
              style={{ border: 'none', background: 'none', color: colors.danger, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 12.5 }}
            >
              {t('common.topUp')}
            </button>
          </p>
        )}
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.md }}>{error}</p>}

      <Button
        label={quote ? t('newDelivery.submitWithFee', { amount: quote.fee.toLocaleString() }) : t('newDelivery.submit')}
        onClick={handleSubmit}
        loading={submitting}
        disabled={!canSubmit || insufficientWalletFunds}
      />
    </div>
  );
}
