import React from 'react';
import { StatusBar } from 'expo-status-bar';
import MainNavigator from './src/navigation/MainNavigator';

export default function App() {
  return (
    <>
      <MainNavigator />
      <StatusBar style="light" />
    </>
  );
}