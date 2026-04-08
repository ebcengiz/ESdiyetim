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
    <View style={s.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 8) + 10 }]}
      >
        <Text style={s.headerTitle}>Kilo ve VKİ</Text>
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
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: 16, paddingHorizontal: SIZES.containerPadding, alignItems: 'center', gap: SIZES.md },
  headerTitle: { fontSize: SIZES.h3, fontWeight: '800', letterSpacing: -0.35, color: COLORS.textOnPrimary },
  segmentWrap: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: SIZES.radiusMedium, padding: 3, width: '100%' },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: SIZES.radiusSmall, gap: 6 },
  segmentBtnActive: { backgroundColor: COLORS.surface },
  segmentText: { fontSize: SIZES.small, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  segmentTextActive: { color: COLORS.primary },
});
