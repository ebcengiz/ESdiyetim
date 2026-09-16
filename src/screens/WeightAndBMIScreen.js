import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { weightService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppError } from '../hooks/useAppError';
import { ScreenContainer, HeroHeader, SegmentedControl } from '../components/ui';
import WeightPanel from '../components/WeightPanel';
import BMIPanel from '../components/BMIPanel';
import GuestGateBanner from '../components/GuestGateBanner';

const TABS = [
  { key: 'weight', label: 'Kilo Takibi', icon: 'fitness' },
  { key: 'bmi', label: 'VKİ', icon: 'body' },
];

export default function WeightAndBMIScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { handleError } = useAppError();
  const [activeTab, setActiveTab] = useState('weight');
  const [latestWeight, setLatestWeight] = useState(null);

  useEffect(() => {
    if (!user) { setLatestWeight(null); return; }
    weightService.getLatest()
      .then((record) => setLatestWeight(record ? record.weight : null))
      .catch((e) => handleError(e, { context: 'weightBmi.latest', silent: true }));
  }, [user]);

  // Kompakt başlık: başlık + son kayıt (tek satır) + sekme seçici (birincil kontrol)
  const header = (
    <HeroHeader title="Kilo ve VKİ" meta={user && latestWeight != null ? `Son kayıt: ${latestWeight} kg` : undefined}>
      <SegmentedControl options={TABS} value={activeTab} onChange={setActiveTab} />
    </HeroHeader>
  );

  if (!user) {
    return (
      <ScreenContainer tab edges={[]} header={header}>
        <GuestGateBanner
          navigation={navigation}
          message="Kilo takibi ve VKİ kayıtları hesabınıza bağlıdır. Kaydetmek ve yapay zeka önerileri almak için giriş yapın."
        />
      </ScreenContainer>
    );
  }

  return (
    <View style={s.container}>
      {header}
      {activeTab === 'weight' ? (
        <WeightPanel onWeightChange={setLatestWeight} />
      ) : (
        <BMIPanel latestWeight={latestWeight} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
