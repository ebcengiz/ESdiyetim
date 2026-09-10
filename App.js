import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AIConsentProvider } from './src/contexts/AIConsentContext';
import MainNavigator from './src/navigation/MainNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AIConsentProvider>
          <SubscriptionProvider>
            <ToastProvider>
              <MainNavigator />
              <StatusBar style="auto" />
            </ToastProvider>
          </SubscriptionProvider>
        </AIConsentProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}