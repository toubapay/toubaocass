import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable } from 'react-native';

import { colors } from '../theme';

interface Props {
  onResult: (text: string) => void;
  color?: string;
}

export function VoiceSearchButton({ onResult, color = colors.textMuted }: Props) {
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
      Alert.alert('Recherche vocale indisponible', "Impossible d'utiliser la reconnaissance vocale sur cet appareil.");
    }
  });

  const handlePress = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Micro non autorisé', "Activez l'accès au microphone dans les réglages pour utiliser la recherche vocale.");
      return;
    }
    ExpoSpeechRecognitionModule.start({ lang: 'fr-FR', interimResults: false, continuous: false });
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
