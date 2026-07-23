import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { ModuleStatusProvider } from './src/context/ModuleStatusContext';
import './src/i18n/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ModuleStatusProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </ModuleStatusProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
