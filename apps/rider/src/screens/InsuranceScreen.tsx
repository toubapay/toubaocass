import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { CarteGriseFile, purchaseVehicleInsurance, quoteVehicleInsurance, scanVehicleDocument } from '../api/insurance';
import {
  InsuranceCoverageType,
  InsuranceQuote,
  ScannedVehicleInfo,
  VehicleAgeBracket,
  VehicleCategory,
  VehicleUsageType,
} from '../api/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { ProfileStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Insurance'>;

type Step = 'landing' | 'type' | 'scan-front' | 'scan-back' | 'analyzing' | 'vehicle-info' | 'quotes';

const COVERAGE_OPTIONS: InsuranceCoverageType[] = ['tiers_simple', 'tiers_collision', 'tous_risques'];
const AGE_BRACKETS: VehicleAgeBracket[] = ['under_5', 'from_5_to_10', 'over_10'];

export function InsuranceScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('landing');
  const [category, setCategory] = useState<VehicleCategory>('car');
  const [frontFile, setFrontFile] = useState<CarteGriseFile | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [powerCv, setPowerCv] = useState('');
  const [seats, setSeats] = useState('');
  const [ageBracket, setAgeBracket] = useState<VehicleAgeBracket>('under_5');
  const [usageType, setUsageType] = useState<VehicleUsageType>('personal');
  const [cartePaths, setCartePaths] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });

  const [coverageType, setCoverageType] = useState<InsuranceCoverageType>('tiers_simple');
  const [quotes, setQuotes] = useState<InsuranceQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [purchasingIndex, setPurchasingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchasedPolicyNumber, setPurchasedPolicyNumber] = useState<string | null>(null);

  const applyScanResult = (info: ScannedVehicleInfo) => {
    setMake(info.make ?? '');
    setModel(info.model ?? '');
    setPlateNumber(info.plate_number ?? '');
    setPowerCv(info.power_cv != null ? String(info.power_cv) : '');
    setSeats(info.seats != null ? String(info.seats) : '');
    setAgeBracket(info.vehicle_age_bracket ?? 'under_5');
    setCartePaths({ front: info.carte_grise_front_path, back: info.carte_grise_back_path });
  };

  const runScan = (front: CarteGriseFile, back: CarteGriseFile | null) => {
    setStep('analyzing');
    setScanError(null);
    scanVehicleDocument(front, back)
      .then((info) => {
        applyScanResult(info);
        setStep('vehicle-info');
      })
      .catch((e) => {
        setScanError(extractErrorMessage(e));
        setStep('vehicle-info');
      });
  };

  const takePhoto = async (onCaptured: (file: CarteGriseFile) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('insurance.cameraPermissionDeniedTitle'), t('insurance.cameraPermissionDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onCaptured({ uri: asset.uri, name: asset.fileName ?? 'carte-grise.jpg', mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  };

  const loadQuotes = (coverage: InsuranceCoverageType) => {
    setLoadingQuotes(true);
    setQuotes([]);
    quoteVehicleInsurance(
      {
        vehicle_category: category,
        vehicle_power_cv: powerCv ? Number(powerCv) : null,
        vehicle_seats: seats ? Number(seats) : null,
        vehicle_age_bracket: ageBracket,
        vehicle_usage_type: usageType,
      },
      coverage,
    )
      .then(setQuotes)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoadingQuotes(false));
  };

  const handleVehicleInfoNext = () => {
    setError(null);
    setStep('quotes');
    loadQuotes(coverageType);
  };

  const handleCoverageChange = (coverage: InsuranceCoverageType) => {
    setCoverageType(coverage);
    loadQuotes(coverage);
  };

  const handlePurchase = (quote: InsuranceQuote, index: number) => {
    Alert.alert(
      t('insurance.purchaseConfirmTitle'),
      `${quote.provider_name} — ${quote.plan_name}\n${t('insurance.perYear', { amount: quote.annual_premium.toLocaleString() })}`,
      [
        { text: t('insurance.purchaseConfirmCancel'), style: 'cancel' },
        {
          text: t('insurance.purchaseConfirmSubmit'),
          onPress: () => {
            setPurchasingIndex(index);
            setError(null);
            purchaseVehicleInsurance(
              {
                vehicle_category: category,
                make: make || null,
                model: model || null,
                plate_number: plateNumber || null,
                vehicle_power_cv: powerCv ? Number(powerCv) : null,
                vehicle_seats: seats ? Number(seats) : null,
                vehicle_age_bracket: ageBracket,
                vehicle_usage_type: usageType,
                carte_grise_front_path: cartePaths.front,
                carte_grise_back_path: cartePaths.back,
              },
              quote,
            )
              .then((policy) => setPurchasedPolicyNumber(policy.policy_number))
              .catch((e) => setError(extractErrorMessage(e)))
              .finally(() => setPurchasingIndex(null));
          },
        },
      ],
    );
  };

  if (purchasedPolicyNumber) {
    return (
      <Screen>
        <Text style={styles.title}>{t('insurance.purchaseSuccessTitle')}</Text>
        <Text style={styles.subtitle}>{t('insurance.policyNumber', { number: purchasedPolicyNumber })}</Text>
        <Button label={t('insurance.myPoliciesTitle')} onPress={() => navigation.navigate('MyInsurancePolicies')} />
      </Screen>
    );
  }

  if (step === 'landing') {
    return (
      <Screen>
        <View style={styles.landingCenter}>
          <Text style={styles.landingEmoji}>🛡️</Text>
          <Text style={styles.title}>{t('insurance.landingTitle')}</Text>
          <Text style={styles.subtitle}>{t('insurance.landingSubtitle')}</Text>
        </View>
        <Button label={t('insurance.getQuote')} onPress={() => setStep('type')} />
      </Screen>
    );
  }

  if (step === 'type') {
    return (
      <Screen>
        <Text style={styles.title}>{t('insurance.selectTypeTitle')}</Text>
        <View style={styles.typeRow}>
          {(['car', 'motorcycle'] as VehicleCategory[]).map((c) => (
            <Pressable
              key={c}
              style={styles.typeCard}
              onPress={() => {
                setCategory(c);
                setStep('scan-front');
              }}
            >
              <Text style={styles.typeEmoji}>{c === 'car' ? '🚗' : '🏍️'}</Text>
              <Text style={styles.typeLabel}>{t(`insurance.vehicleCategory.${c}`)}</Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    );
  }

  if (step === 'scan-front' || step === 'scan-back') {
    const isFront = step === 'scan-front';
    return (
      <Screen>
        <Text style={styles.title}>{t(isFront ? 'insurance.scanFrontTitle' : 'insurance.scanBackTitle')}</Text>
        <Text style={styles.subtitle}>{t('insurance.scanHint')}</Text>
        <Text style={styles.landingEmoji}>🪪</Text>
        <View style={styles.buttonSpacing}>
          <Button
            label={`📷 ${t('insurance.takePhoto')}`}
            onPress={() =>
              takePhoto((file) => {
                if (isFront) {
                  setFrontFile(file);
                  setStep('scan-back');
                } else {
                  runScan(frontFile as CarteGriseFile, file);
                }
              })
            }
          />
        </View>
        <Button
          label={t(isFront ? 'insurance.enterManually' : 'insurance.skipOldCard')}
          variant="outline"
          onPress={() => (isFront ? setStep('vehicle-info') : runScan(frontFile as CarteGriseFile, null))}
        />
      </Screen>
    );
  }

  if (step === 'analyzing') {
    return (
      <Screen style={styles.landingCenter}>
        <Text style={styles.title}>{t('insurance.analyzingTitle')}</Text>
        <Text style={styles.subtitle}>{t('insurance.analyzingHint')}</Text>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  if (step === 'vehicle-info') {
    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('insurance.vehicleInfoTitle')}</Text>
          {scanError ? <Text style={styles.error}>{scanError}</Text> : null}

          <TextField label={t('insurance.make')} value={make} onChangeText={setMake} />
          <TextField label={t('insurance.model')} value={model} onChangeText={setModel} />
          <TextField label={t('insurance.plateNumber')} value={plateNumber} onChangeText={setPlateNumber} />
          <TextField label={t('insurance.powerCv')} keyboardType="numeric" value={powerCv} onChangeText={setPowerCv} />
          {category === 'car' && <TextField label={t('insurance.seats')} keyboardType="numeric" value={seats} onChangeText={setSeats} />}

          <Text style={styles.fieldLabel}>{t('insurance.vehicleAge')}</Text>
          <View style={styles.chipRow}>
            {AGE_BRACKETS.map((bracket) => (
              <Pressable
                key={bracket}
                style={[styles.chip, ageBracket === bracket && styles.chipActive]}
                onPress={() => setAgeBracket(bracket)}
              >
                <Text style={[styles.chipText, ageBracket === bracket && styles.chipTextActive]}>
                  {t(`insurance.ageBracket.${bracket}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{t('insurance.vehicleUsage')}</Text>
          <View style={styles.usageRow}>
            {(['personal', 'professional'] as VehicleUsageType[]).map((usage) => (
              <Pressable
                key={usage}
                style={[styles.usageOption, usageType === usage && styles.chipActive]}
                onPress={() => setUsageType(usage)}
              >
                <Text style={[styles.chipText, usageType === usage && styles.chipTextActive]}>
                  {t(`insurance.usageType.${usage}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button label={t('insurance.next')} onPress={handleVehicleInfoNext} />
        </ScrollView>
      </Screen>
    );
  }

  // step === 'quotes'
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('insurance.compareTitle')}</Text>

        <View style={styles.tabs}>
          {COVERAGE_OPTIONS.map((option) => (
            <Pressable key={option} onPress={() => handleCoverageChange(option)} style={styles.tab}>
              <Text style={[styles.tabText, coverageType === option && styles.tabTextActive]}>{t(`insurance.coverage.${option}`)}</Text>
              {coverageType === option && <View style={styles.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loadingQuotes ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.lg }} />
        ) : quotes.length === 0 ? (
          <Text style={styles.emptyQuotes}>{t('insurance.emptyQuotes')}</Text>
        ) : (
          quotes.map((quote, index) => (
            <View key={`${quote.provider_id}-${index}`} style={styles.quoteCard}>
              <Text style={styles.quoteProvider}>{quote.provider_name}</Text>
              <Text style={styles.quotePlan}>{quote.plan_name}</Text>
              <Text style={styles.quotePrice}>{t('insurance.perYear', { amount: quote.annual_premium.toLocaleString() })}</Text>
              <Text style={styles.quotePriceMonthly}>{t('insurance.perMonthApprox', { amount: quote.monthly_premium.toLocaleString() })}</Text>
              {quote.highlights.map((h) => (
                <Text key={h} style={styles.highlight}>
                  • {h}
                </Text>
              ))}
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  label={t('insurance.chooseOffer')}
                  onPress={() => handlePurchase(quote, index)}
                  loading={purchasingIndex === index}
                  disabled={purchasingIndex !== null}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: 13.5, marginBottom: spacing.md },
  landingCenter: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  landingEmoji: { fontSize: 64, textAlign: 'center', marginBottom: spacing.md },
  buttonSpacing: { marginBottom: spacing.sm },
  typeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  typeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  typeEmoji: { fontSize: 40, marginBottom: spacing.sm },
  typeLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  chipText: { fontSize: 13.5, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  usageRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  usageOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.lg },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  tabUnderline: { height: 2.5, backgroundColor: colors.primary, width: '100%', marginTop: spacing.xs },
  emptyQuotes: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
  quoteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  quoteProvider: { fontSize: 17, fontWeight: '700', color: colors.text },
  quotePlan: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  quotePrice: { fontSize: 22, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  quotePriceMonthly: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  highlight: { fontSize: 13.5, color: colors.textMuted },
});
