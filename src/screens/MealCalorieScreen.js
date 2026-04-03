import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { aiService } from '../services/aiService';

export default function MealCalorieScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState(null);
  const [base64, setBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const reset = useCallback(() => {
    setImageUri(null);
    setBase64(null);
    setMimeType('image/jpeg');
    setResult(null);
  }, []);

  const pickImage = async (useCamera) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin gerekli', 'Kamera kullanımına izin verin.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin gerekli', 'Galeri erişimine izin verin.');
          return;
        }
      }

      const options = {
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.62,
        base64: true,
      };

      const res = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (res.canceled || !res.assets?.[0]) return;

      const asset = res.assets[0];
      setImageUri(asset.uri);
      setBase64(asset.base64 || null);
      setMimeType(asset.mimeType || 'image/jpeg');
      setResult(null);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Görsel seçilemedi.');
    }
  };

  const analyze = async () => {
    if (!base64) {
      Alert.alert('Görsel yok', 'Önce bir fotoğraf seçin.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await aiService.getMealCaloriesFromImage({
        base64,
        mimeType,
      });
      setResult(data);
    } catch (e) {
      Alert.alert('Analiz başarısız', e.message || 'Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="camera" size={36} color={COLORS.textOnPrimary} />
          <Text style={styles.heroSub}>
            Yemeğin fotoğrafını yükleyin; tahmini kalori ve öğe listesi alın.
          </Text>
        </LinearGradient>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={18} color={COLORS.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            Sonuçlar yapay zeka tahminidir; gerçek kalori porsiyon ve malzemeye göre değişir. Tıbbi
            beslenme tavsiyesi değildir.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => pickImage(false)}
            activeOpacity={0.85}
          >
            <Ionicons name="images-outline" size={22} color={COLORS.primary} />
            <Text style={styles.pickBtnText}>Galeriden seç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => pickImage(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
            <Text style={styles.pickBtnText}>Fotoğraf çek</Text>
          </TouchableOpacity>
        </View>

        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <TouchableOpacity style={styles.clearPhoto} onPress={reset} hitSlop={12}>
              <Ionicons name="close-circle" size={28} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.analyzeBtn, (!base64 || loading) && styles.analyzeBtnDisabled]}
          onPress={analyze}
          disabled={!base64 || loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              !base64 || loading
                ? [COLORS.disabled, COLORS.disabled]
                : [COLORS.primary, COLORS.primaryDark]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.analyzeGradient}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="sparkles" size={22} color={COLORS.textOnPrimary} />
                <Text style={styles.analyzeText}>Tahmini kaloriyi hesapla</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultMeal}>{result.mealName}</Text>
            <View style={styles.kcalRow}>
              <Text style={styles.kcalValue}>{result.estimatedCalories}</Text>
              <Text style={styles.kcalUnit}>kcal</Text>
            </View>
            <Text style={styles.confidence}>
              Güven: {result.confidence}
            </Text>
            {result.provider === 'groq-vision' || result.provider === 'gemini-vision' ? (
              <Text style={styles.providerHint}>
                {result.provider === 'groq-vision' ? 'Analiz: Groq' : 'Analiz: Google Gemini'}
              </Text>
            ) : null}
            {result.items?.length > 0 ? (
              <View style={styles.itemsBox}>
                <Text style={styles.itemsTitle}>Tahmini dağılım</Text>
                {result.items.map((it, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {it.name || 'Öğe'}
                    </Text>
                    <Text style={styles.itemKcal}>
                      {(() => {
                        const k = Number(it.estimatedKcal ?? it.kcal);
                        return Number.isFinite(k) ? `${Math.round(k)} kcal` : '—';
                      })()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {result.notes ? (
              <Text style={styles.notes}>{result.notes}</Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.keyHint}>
          Önce hızlı analiz için{' '}
          <Text style={styles.keyBold}>EXPO_PUBLIC_GROQ_API_KEY</Text> (console.groq.com); gerekirse
          yedek olarak{' '}
          <Text style={styles.keyBold}>EXPO_PUBLIC_GEMINI_API_KEY</Text> .env içinde tanımlı
          olmalıdır.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.sm,
  },
  hero: {
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.lg,
    alignItems: 'center',
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  heroSub: {
    fontSize: SIZES.small,
    color: COLORS.textOnPrimary,
    opacity: 0.92,
    textAlign: 'center',
    marginTop: SIZES.md,
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    backgroundColor: COLORS.disclaimerBackground,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.disclaimerBorder,
    marginBottom: SIZES.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: SIZES.tiny,
    color: COLORS.disclaimerText,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.xs,
    backgroundColor: COLORS.surface,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  pickBtnText: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewWrap: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  preview: {
    width: '100%',
    height: 220,
    backgroundColor: COLORS.surfaceAlt,
  },
  clearPhoto: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
  },
  analyzeBtn: {
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    marginBottom: SIZES.lg,
    ...SHADOWS.medium,
  },
  analyzeBtnDisabled: {
    opacity: 0.85,
  },
  analyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.md + 2,
  },
  analyzeText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.lg,
    ...SHADOWS.small,
  },
  resultMeal: {
    fontSize: SIZES.body,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: SIZES.xs,
  },
  kcalValue: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  kcalUnit: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confidence: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  providerHint: {
    fontSize: SIZES.small - 1,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  itemsBox: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SIZES.md,
  },
  itemsTitle: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SIZES.md,
    marginBottom: SIZES.sm,
  },
  itemName: {
    flex: 1,
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
  },
  itemKcal: {
    fontSize: SIZES.bodySmall,
    fontWeight: '600',
    color: COLORS.text,
  },
  notes: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SIZES.sm,
    fontStyle: 'italic',
  },
  keyHint: {
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  keyBold: {
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
