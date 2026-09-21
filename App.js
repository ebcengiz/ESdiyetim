import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AIConsentProvider } from './src/contexts/AIConsentContext';
import { AdsProvider } from './src/contexts/AdsContext';
import MainNavigator from './src/navigation/MainNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/ui/OfflineBanner';
import { installGlobalErrorHandlers, startConnectivityWatch, stopConnectivityWatch } from './src/services/errors';

// Global hata yakalayıcılar modül yüklenirken kurulur — ilk render'dan önce aktif olsun.
installGlobalErrorHandlers();

export default function App() {
  useEffect(() => {
    startConnectivityWatch();
    return stopConnectivityWatch;
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AIConsentProvider>
            <SubscriptionProvider>
              <AdsProvider>
                <ToastProvider>
                  <MainNavigator />
                  <OfflineBanner />
                  <StatusBar style="auto" />
                </ToastProvider>
              </AdsProvider>
            </SubscriptionProvider>
          </AIConsentProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
