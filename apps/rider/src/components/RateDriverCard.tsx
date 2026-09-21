import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { Button } from './Button';
import { colors, radius, spacing } from '../theme';

interface Props {
  onSubmit: (score: number, comment?: string) => Promise<void>;
}

/**
 * Shown once a trip/delivery reaches its terminal success status
 * (completed/delivered) so the rider can leave a 1-5 star review of the
 * driver. Submitting is an upsert on the backend, so re-opening this after
 * already rating just edits the existing review — no "already rated" state
 * to track here.
 */
export function RateDriverCard({ onSubmit }: Props) {
  const { t } = useTranslation();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submitted) {
    return (
      <View style={styles.card}>
        <Text style={styles.thanks}>{t('rating.thanks')}</Text>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(score, comment.trim() || undefined);
      setSubmitted(true);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.prompt}>{t('rating.prompt')}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setScore(n)} hitSlop={6} accessibilityLabel={t('rating.starLabel', { count: n }) as string}>
            <Ionicons name={n <= score ? 'star' : 'star-outline'} size={30} color={colors.primary} />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={t('rating.commentPlaceholder') as string}
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={2}
        maxLength={500}
        style={styles.input}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button label={t('rating.submit') as string} onPress={handleSubmit} loading={submitting} disabled={score === 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prompt: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  stars: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  thanks: { fontSize: 15, fontWeight: '700', color: colors.success },
});
