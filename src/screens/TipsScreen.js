import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { aiService } from '../services/aiService';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  {
    id: 'genel',
    name: 'Genel',
    icon: 'bulb-outline',
    activeIcon: 'bulb',
    gradient: ['#6C63FF', '#4ECDC4'],
    emoji: '💡',
    desc: 'Günlük sağlık önerileri',
  },
  {
    id: 'beslenme',
    name: 'Beslenme',
    icon: 'nutrition-outline',
    activeIcon: 'nutrition',
    gradient: ['#FF6B6B', '#FEA846'],
    emoji: '🥗',
    desc: 'Sağlıklı beslenme rehberi',
  },
  {
    id: 'egzersiz',
    name: 'Egzersiz',
    icon: 'barbell-outline',
    activeIcon: 'barbell',
    gradient: ['#0EA5E9', '#6366F1'],
    emoji: '💪',
    desc: 'Fitness ve hareket',
  },
  {
    id: 'motivasyon',
    name: 'Motivasyon',
    icon: 'trophy-outline',
    activeIcon: 'trophy',
    gradient: ['#F59E0B', '#EF4444'],
    emoji: '🌟',
    desc: 'Zihinsel güç & hedef',
  },
];

export default function TipsScreen() {
  const [selected, setSelected] = useState('genel');
  // Her kategori için ayrı AI tavsiye cache
  const [adviceCache, setAdviceCache] = useState({});
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const currentCat = CATEGORIES.find(c => c.id === selected);

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const startSpin = useCallback(() => {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    ).start();
  }, [spinAnim]);

  const fetchAdvice = useCallback(async (categoryId, force = false) => {
    if (!force && adviceCache[categoryId]) {
      animateIn();
      return;
    }
    setLoading(true);
    startSpin();
    try {
      const result = await aiService.getHealthTip(categoryId);
      setAdviceCache(prev => ({ ...prev, [categoryId]: result.advice || '' }));
      animateIn();
    } catch {
      setAdviceCache(prev => ({
        ...prev,
        [categoryId]: '⚠️ Tavsiye alınamadı. Lütfen tekrar deneyin.',
      }));
    } finally {
      setLoading(false);
      spinAnim.stopAnimation();
    }
  }, [adviceCache, animateIn, startSpin, spinAnim]);

  useEffect(() => {
    fetchAdvice(selected);
  }, [selected]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const currentAdvice = adviceCache[selected] || '';

  // Metni satırlara böl ve başlık/içerik ayrıştır
  const parseAdvice = (text) => {
    if (!text) return { title: '', paragraphs: [] };
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // İlk satır veya ** ile çevrilmiş kısım başlık olabilir
    let title = '';
    let rest = [...lines];

    const firstLine = lines[0] || '';
    if (firstLine.startsWith('**') || firstLine.length < 80) {
      title = firstLine.replace(/\*\*/g, '').trim();
      rest = lines.slice(1);
    }

    const paragraphs = rest
      .map(l => l.replace(/\*\*/g, '').replace(/^[-•]\s*/, '').trim())
      .filter(Boolean);

    return { title, paragraphs };
  };

  const { title, paragraphs } = parseAdvice(currentAdvice);

  return (
    <View style={styles.container}>
      {/* Kategori Seçici */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {CATEGORIES.map(cat => {
            const active = selected === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelected(cat.id)}
                activeOpacity={0.75}
                style={styles.tabWrap}
              >
                {active ? (
                  <LinearGradient
                    colors={cat.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tabActive}
                  >
                    <Ionicons name={cat.activeIcon} size={15} color="#fff" />
                    <Text style={styles.tabTextActive}>{cat.name}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInactive}>
                    <Ionicons name={cat.icon} size={15} color={COLORS.textSecondary} />
                    <Text style={styles.tabText}>{cat.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Kart */}
        <View style={styles.heroCard}>
          {/* Gradient Başlık */}
          <LinearGradient
            colors={currentCat.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroHeader}
          >
            {/* Dekoratif daireler */}
            <View style={styles.decCircle1} />
            <View style={styles.decCircle2} />

            <View style={styles.heroHeaderContent}>
              <View style={styles.heroLeft}>
                <View style={styles.emojiBox}>
                  <Text style={styles.emoji}>{currentCat.emoji}</Text>
                </View>
                <View>
                  <Text style={styles.heroLabel}>Yapay Zeka Tavsiyesi</Text>
                  <Text style={styles.heroSub}>{currentCat.desc}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => fetchAdvice(selected, true)}
                disabled={loading}
                activeOpacity={0.75}
              >
                <Animated.View style={{ transform: [{ rotate: loading ? spin : '0deg' }] }}>
                  <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.95)" />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* İçerik */}
          <View style={styles.heroBody}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={currentCat.gradient[0]} />
                <Text style={[styles.loadingText, { color: currentCat.gradient[0] }]}>
                  AI tavsiyeniz hazırlanıyor...
                </Text>
                <Text style={styles.loadingHint}>Bu birkaç saniye sürebilir</Text>
                {/* Skeleton satırlar */}
                <View style={styles.skeletonWrap}>
                  {[100, 85, 90, 70].map((w, i) => (
                    <View key={i} style={[styles.skeletonLine, { width: `${w}%` }]} />
                  ))}
                </View>
              </View>
            ) : (
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                {/* Başlık */}
                {!!title && (
                  <View style={styles.adviceTitleRow}>
                    <LinearGradient
                      colors={currentCat.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.titleAccent}
                    />
                    <Text style={styles.adviceTitle}>{title}</Text>
                  </View>
                )}

                {/* Paragraflar */}
                {paragraphs.map((p, i) => (
                  <Text key={i} style={styles.adviceParagraph}>{p}</Text>
                ))}

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={[styles.disclaimer, { borderColor: `${currentCat.gradient[0]}25` }]}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={currentCat.gradient[0]} />
                    <Text style={styles.disclaimerText}>
                      Bu tavsiye tıbbi teşhis veya tedavi yerine geçmez.
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Alt Kartlar: diğer kategorilerin cache'lenmiş tavsiyeleri */}
        {CATEGORIES.filter(c => c.id !== selected && adviceCache[c.id]).length > 0 && (
          <>
            <View style={styles.otherHeader}>
              <View style={styles.otherHeaderLine} />
              <Text style={styles.otherHeaderText}>Diğer Kategoriler</Text>
              <View style={styles.otherHeaderLine} />
            </View>

            {CATEGORIES.filter(c => c.id !== selected && adviceCache[c.id]).map(cat => {
              const { title: t, paragraphs: ps } = parseAdvice(adviceCache[cat.id]);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.miniCard}
                  onPress={() => setSelected(cat.id)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={cat.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.miniCardLeft}
                  >
                    <Text style={styles.miniEmoji}>{cat.emoji}</Text>
                  </LinearGradient>
                  <View style={styles.miniCardRight}>
                    <View style={styles.miniCardHeader}>
                      <Text style={styles.miniCardCat}>{cat.name}</Text>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} />
                    </View>
                    {!!t && <Text style={styles.miniCardTitle} numberOfLines={1}>{t}</Text>}
                    {ps.length > 0 && (
                      <Text style={styles.miniCardSnippet} numberOfLines={2}>
                        {ps[0]}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* Tab Bar */
  tabBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabScroll: { paddingHorizontal: SIZES.containerPadding, gap: SIZES.sm },
  tabWrap: {},
  tabActive: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  tabInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
  },
  tabTextActive: { fontSize: 13, fontWeight: '700', color: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  /* Hero Kart */
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...SHADOWS.large,
  },
  heroHeader: { padding: 20, overflow: 'hidden' },
  decCircle1: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)', top: -30, right: -20,
  },
  decCircle2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)', bottom: -20, right: 60,
  },
  heroHeaderContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  emojiBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 24 },
  heroLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Hero Body */
  heroBody: { padding: 20 },

  /* Loading */
  loadingWrap: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  loadingText: { fontSize: 15, fontWeight: '700' },
  loadingHint: { fontSize: 12, color: COLORS.textLight },
  skeletonWrap: { width: '100%', gap: 8, marginTop: 8 },
  skeletonLine: {
    height: 12, borderRadius: 6,
    backgroundColor: COLORS.surfaceAlt,
  },

  /* Advice */
  adviceTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  titleAccent: { width: 4, borderRadius: 2, minHeight: 20, marginTop: 2 },
  adviceTitle: {
    flex: 1, fontSize: 17, fontWeight: '800',
    color: COLORS.text, lineHeight: 24,
  },
  adviceParagraph: {
    fontSize: 15, color: COLORS.textSecondary,
    lineHeight: 24, marginBottom: 10,
  },

  /* Card Footer */
  cardFooter: { marginTop: 8 },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10, padding: 10,
    borderWidth: 1,
  },
  disclaimerText: {
    flex: 1, fontSize: 11, color: COLORS.textLight, lineHeight: 16,
  },

  /* Diğer Kategoriler */
  otherHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8,
  },
  otherHeaderLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  otherHeaderText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },

  /* Mini Kart */
  miniCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  miniCardLeft: {
    width: 56, justifyContent: 'center', alignItems: 'center',
  },
  miniEmoji: { fontSize: 22 },
  miniCardRight: { flex: 1, padding: 12 },
  miniCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  miniCardCat: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  miniCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  miniCardSnippet: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
});