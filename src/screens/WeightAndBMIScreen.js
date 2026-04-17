import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../constants/theme';
import { weightService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import WeightPanel from '../components/WeightPanel';
import BMIPanel from '../components/BMIPanel';
import GuestGateBanner from '../components/GuestGateBanner';
import PremiumGate from '../components/PremiumGate';

export default function WeightAndBMIScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('weight');
  const [latestWeight, setLatestWeight] = useState(null);

  useEffect(() => {
    if (!user) { setLatestWeight(null); return; }
    weightService.getLatest()
      .then((record) => setLatestWeight(record ? record.weight : null))
      .catch(() => {});
  }, [user]);

  return (
    <PremiumGate
      icon="fitness"
      title="Kilo & VKİ Premium'a Özel"
      description="Kilo takibi, VKİ hesaplama ve yapay zeka analizine erişmek için premium üyelik gereklidir."
    >
    <View style={s.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 8) + 10 }]}
      >
        <View style={s.headerTopRow}>
          <View style={s.headerBadge}>
            <Ionicons name="analytics-outline" size={14} color={COLORS.textOnPrimary} />
            <Text style={s.headerBadgeText}>Sağlık Takibi</Text>
          </View>
          <Text style={s.headerDate}>
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={s.headerTitle}>Kilo ve VKİ</Text>
        <Text style={s.headerSubtitle}>Kilo trendinizi ve vücut kitle indeksinizi tek yerden takip edin.</Text>
        <View style={s.segmentWrap}>
          {[
            { key: 'weight', label: 'Kilo Takibi', icon: 'fitness' },
            { key: 'bmi',    label: 'VKİ',         icon: 'body'    },
          ].map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={[s.segmentBtn, activeTab === key && s.segmentBtnActive]}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.8}
            >
              <Ionicons name={icon} size={16} color={activeTab === key ? COLORS.primary : 'rgba(255,255,255,0.7)'} />
              <Text style={[s.segmentText, activeTab === key && s.segmentTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {!user ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SIZES.containerPadding, paddingBottom: 40 }}>
          <GuestGateBanner
            navigation={navigation}
            message="Kilo takibi ve VKİ kayıtları hesabınıza bağlıdır. Kaydetmek ve yapay zeka önerileri almak için giriş yapın."
          />
        </ScrollView>
      ) : activeTab === 'weight' ? (
        <WeightPanel onWeightChange={setLatestWeight} />
      ) : (
        <BMIPanel latestWeight={latestWeight} />
      )}
    </View>
    </PremiumGate>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: 14, paddingHorizontal: SIZES.containerPadding, alignItems: 'center', gap: SIZES.sm },
  headerTopRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerBadgeText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: '700' },
  headerDate: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: '600', opacity: 0.9 },
  headerTitle: { alignSelf: 'flex-start', fontSize: SIZES.h3, fontWeight: '800', letterSpacing: -0.35, color: COLORS.textOnPrimary },
  headerSubtitle: { alignSelf: 'flex-start', fontSize: SIZES.tiny, color: COLORS.textOnPrimary, opacity: 0.92, marginBottom: 2 },
  segmentWrap: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: SIZES.radiusMedium, padding: 4, width: '100%' },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: SIZES.radiusSmall, gap: 6 },
  segmentBtnActive: { backgroundColor: COLORS.surface },
  segmentText: { fontSize: SIZES.small, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  segmentTextActive: { color: COLORS.primary },
});
