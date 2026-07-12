import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { extractErrorMessage } from '../api/client';
import { fetchMessages, sendMessage } from '../api/messages';
import { Message } from '../api/types';
import { Screen } from '../components/Screen';
import { TripsStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'Chat'>;

const POLL_INTERVAL_MS = 4000;

export function ChatScreen({ route }: Props) {
  const { bookingId, title, subtitle } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchMessages(bookingId);
      setMessages(data);
    } catch {
      // Keep the last known messages on a transient poll failure.
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(undefined);
    try {
      const message = await sendMessage(bookingId, trimmed);
      setMessages((prev) => [...prev, message]);
      setBody('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>{title ?? 'Discussion'}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun message pour l'instant. Dites bonjour !</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.is_mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
              <View style={[styles.bubble, item.is_mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {!item.is_mine && <Text style={styles.senderName}>{item.sender_name}</Text>}
                <Text style={item.is_mine ? styles.bodyMine : styles.bodyTheirs}>{item.body}</Text>
                <Text style={[styles.time, item.is_mine ? styles.timeMine : styles.timeTheirs]}>
                  {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.inputRow}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Écrire un message..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !body.trim()}
            style={[styles.sendButton, (sending || !body.trim()) && styles.sendButtonDisabled]}
          >
            <Text style={styles.sendButtonText}>Envoyer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  listContent: { paddingBottom: spacing.md, flexGrow: 1 },
  empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xl },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  senderName: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 2 },
  bodyMine: { fontSize: 14.5, color: '#fff' },
  bodyTheirs: { fontSize: 14.5, color: colors.text },
  time: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  timeTheirs: { color: colors.textMuted },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.xs },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', paddingTop: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
