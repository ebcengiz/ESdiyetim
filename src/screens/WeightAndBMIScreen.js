import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, MAX_FONT_SCALE, whiteAlpha } from '../constants/theme';
import { weightService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useAppError } from '../hooks/useAppError';
import { ScreenContainer, SegmentedControl } from '../components/ui';
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
  const { topPad } = useResponsive();
  const { handleError } = useAppError();
  const [activeTab, setActiveTab] = useState('weight');
  const [latestWeight, setLatestWeight] = useState(null);

  useEffect(() => {
    if (!user) { setLatestWeight(null); return; }
    weightService.getLatest()
      .then((record) => setLatestWeight(record ? record.weight : null))
      .catch((e) => handleError(e, { context: 'weightBmi.latest', silent: true }));
  }, [user]);

  const header = (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.header, { paddingTop: topPad - SIZES.xs }]}
    >
      <View style={s.topRow}>
        <View style={s.badge}>
          <Ionicons name="analytics-outline" size={14} color={COLORS.textOnPrimary} />
          <Text style={s.badgeText} maxFontSizeMultiplier={MAX_FONT_SCALE}>Sağlık Takibi</Text>
        </View>
        <Text style={s.date} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text style={s.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>Kilo ve VKİ</Text>
      <Text style={s.subtitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Kilo trendinizi ve vücut kitle indeksinizi tek yerden takip edin.
      </Text>
      <SegmentedControl options={TABS} value={activeTab} onChange={setActiveTab} style={s.segment} />
    </LinearGradient>
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
  header: { paddingBottom: SIZES.md, paddingHorizontal: SIZES.containerPadding, gap: SIZES.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: whiteAlpha(0.2),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
  },
  badgeText: { color: COLORS.textOnPrimary, fontSize: SIZES.tiny, fontWeight: '700' },
  date: { color: whiteAlpha(0.9), fontSize: SIZES.tiny, fontWeight: '600' },
  title: { fontSize: SIZES.h3, fontWeight: '800', letterSpacing: -0.35, color: COLORS.textOnPrimary },
  subtitle: { fontSize: SIZES.tiny, color: whiteAlpha(0.92), marginBottom: 2 },
  segment: { marginTop: 2 },
});
