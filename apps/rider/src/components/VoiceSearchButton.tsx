import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../theme';

const SPEECH_LANG: Record<string, string> = { fr: 'fr-FR', ar: 'ar-SA' };

interface Props {
  onResult: (text: string) => void;
  color?: string;
}

export function VoiceSearchButton({ onResult, color = colors.textMuted }: Props) {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) onResult(transcript);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      Alert.alert(t('common.voiceSearchUnavailableTitle'), t('common.voiceSearchUnavailableBody'));
    }
  });

  const handlePress = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert(t('common.micNotAuthorizedTitle'), t('common.micNotAuthorizedBody'));
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: SPEECH_LANG[i18n.language] ?? 'fr-FR',
      interimResults: false,
      continuous: false,
    });
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      {listening ? (
        <ActivityIndicator size="small" color={colors.danger} />
      ) : (
        <Ionicons name="mic" size={18} color={color} />
      )}
    </Pressable>
  );
}
