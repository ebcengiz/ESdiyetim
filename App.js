import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import MainNavigator from './src/navigation/MainNavigator';

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}