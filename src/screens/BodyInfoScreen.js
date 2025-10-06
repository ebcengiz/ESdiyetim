import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { bodyInfoService } from '../services/supabase';
import { aiService } from '../services/aiService';

export default function BodyInfoScreen() {
  const [loading, setLoading] = useState(true);
  const [bodyInfo, setBodyInfo] = useState({
    height: '',
    weight: '',
    age: '',
    gender: 'male',
  });
  const [existingId, setExistingId] = useState(null);
  const [bmi, setBmi] = useState(null);
  const [bmiCategory, setBmiCategory] = useState(null);

  // AI Tavsiye state'leri
  const [aiAdviceModalVisible, setAiAdviceModalVisible] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    loadBodyInfo();
  }, []);

  useEffect(() => {
    calculateBMI();
  }, [bodyInfo.height, bodyInfo.weight]);

  const loadBodyInfo = async () => {
    try {
      const data = await bodyInfoService.getLatest();
      if (data) {
        setBodyInfo({
          height: data.height?.toString() || '',
          weight: data.weight?.toString() || '',
          age: data.age?.toString() || '',
          gender: data.gender || 'male',
        });
        setExistingId(data.id);
      }
    } catch (error) {
      console.error('Vücut bilgileri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = () => {
    const height = parseFloat(bodyInfo.height);
    const weight = parseFloat(bodyInfo.weight);

    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100;
      const calculatedBMI = weight / (heightInMeters * heightInMeters);
      setBmi(calculatedBMI.toFixed(1));

      // VKİ kategorisi belirleme
      if (calculatedBMI < 18.5) {
        setBmiCategory({
          name: 'Zayıf',
          color: COLORS.info,
          icon: 'trending-down',
        });
      } else if (calculatedBMI >= 18.5 && calculatedBMI < 25) {
        setBmiCategory({
          name: 'Normal',
          color: COLORS.success,
          icon: 'checkmark-circle',
        });
      } else if (calculatedBMI >= 25 && calculatedBMI < 30) {
        setBmiCategory({
          name: 'Fazla Kilolu',
          color: COLORS.warning,
          icon: 'alert-circle',
        });
      } else {
        setBmiCategory({
          name: 'Obez',
          color: COLORS.error,
          icon: 'close-circle',
        });
      }
    } else {
      setBmi(null);
      setBmiCategory(null);
    }
  };

  const saveBodyInfo = async () => {
    if (!bodyInfo.height || !bodyInfo.weight || !bodyInfo.age) {
      Alert.alert('⚠️ Uyarı', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      const data = {
        height: parseFloat(bodyInfo.height),
        weight: parseFloat(bodyInfo.weight),
        age: parseInt(bodyInfo.age),
        gender: bodyInfo.gender,
      };

      if (existingId) {
        await bodyInfoService.update(existingId, data);
        Alert.alert('✅ Başarılı', 'Vücut bilgileriniz güncellendi!');
      } else {
        const newInfo = await bodyInfoService.create(data);
        setExistingId(newInfo.id);
        Alert.alert('✅ Başarılı', 'Vücut bilgileriniz kaydedildi!');
      }
    } catch (error) {
      console.error('Vücut bilgileri kaydetme hatası:', error);
      Alert.alert('❌ Hata', 'Vücut bilgileri kaydedilirken bir hata oluştu.');
    }
  };

  // AI Tavsiye Al
  const getAIAdvice = async () => {
    if (!bmi || !bmiCategory) {
      Alert.alert('⚠️ Uyarı', 'Lütfen önce vücut bilgilerinizi girin ve VKİ hesaplansın.');
      return;
    }

    setLoadingAdvice(true);
    setAiAdviceModalVisible(true);
    setAiAdvice('');

    try {
      const bmiData = {
        bmi: parseFloat(bmi),
        category: bmiCategory.name,
        height: parseFloat(bodyInfo.height),
        weight: parseFloat(bodyInfo.weight),
        age: parseInt(bodyInfo.age),
        gender: bodyInfo.gender,
      };

      const result = await aiService.getBMIAdvice(bmiData);
      setAiAdvice(result.advice);
    } catch (error) {
      setAiAdvice('⚠️ Tavsiye alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const getRecommendations = () => {
    if (!bmiCategory) return [];

    const recommendations = {
      'Zayıf': [
        'Kalori alımınızı artırın',
        'Protein açısından zengin besinler tüketin',
        'Düzenli kuvvet antrenmanı yapın',
        'Sağlıklı yağlar ekleyin (fındık, avokado)',
        'Günde 5-6 öğün şeklinde beslenin',
      ],
      'Normal': [
        'Harika! Sağlıklı kilonuzu koruyun',
        'Dengeli beslenmeye devam edin',
        'Haftada 150 dk orta yoğunlukta egzersiz yapın',
        'Bol su için',
        'Düzenli uyku düzenine dikkat edin',
      ],
      'Fazla Kilolu': [
        'Günlük kalori alımınızı kontrol edin',
        'Porsiyon kontrolüne dikkat edin',
        'Haftada en az 4 gün egzersiz yapın',
        'Şekerli içeceklerden kaçının',
        'Sebze ve meyve tüketiminizi artırın',
      ],
      'Obez': [
        'Bir diyetisyene danışmanızı öneririz',
        'Günlük kalori açığı oluşturun',
        'Düzenli egzersiz programı başlatın',
        'İşlenmiş gıdalardan uzak durun',
        'Stres yönetimi teknikleri uygulayın',
        'Yeterli uyku almaya özen gösterin',
      ],
    };

    return recommendations[bmiCategory.name] || [];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const recommendations = getRecommendations();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="body" size={48} color={COLORS.textOnPrimary} />
        <Text style={styles.headerTitle}>Vücut Bilgileri</Text>
        <Text style={styles.headerSubtitle}>
          Bilgilerinizi girin ve VKİ'nizi hesaplayın
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Body Info Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temel Bilgiler</Text>

          {/* Height */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Boy (cm)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="resize" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                value={bodyInfo.height}
                onChangeText={(text) => setBodyInfo({ ...bodyInfo, height: text })}
                placeholder="175"
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          {/* Weight */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kilo (kg)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="fitness" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                value={bodyInfo.weight}
                onChangeText={(text) => setBodyInfo({ ...bodyInfo, weight: text })}
                placeholder="75"
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          {/* Age */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Yaş</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                value={bodyInfo.age}
                onChangeText={(text) => setBodyInfo({ ...bodyInfo, age: text })}
                placeholder="30"
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cinsiyet</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderBtn,
                  bodyInfo.gender === 'male' && styles.genderBtnActive,
                ]}
                onPress={() => setBodyInfo({ ...bodyInfo, gender: 'male' })}
              >
                <Ionicons
                  name="male"
                  size={24}
                  color={bodyInfo.gender === 'male' ? COLORS.textOnPrimary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.genderText,
                    bodyInfo.gender === 'male' && styles.genderTextActive,
                  ]}
                >
                  Erkek
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderBtn,
                  bodyInfo.gender === 'female' && styles.genderBtnActive,
                ]}
                onPress={() => setBodyInfo({ ...bodyInfo, gender: 'female' })}
              >
                <Ionicons
                  name="female"
                  size={24}
                  color={bodyInfo.gender === 'female' ? COLORS.textOnPrimary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.genderText,
                    bodyInfo.gender === 'female' && styles.genderTextActive,
                  ]}
                >
                  Kadın
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={saveBodyInfo}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.saveBtnGradient}
            >
              <Ionicons name="save" size={20} color={COLORS.textOnPrimary} />
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* BMI Result */}
        {bmi && bmiCategory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vücut Kitle İndeksi (VKİ)</Text>

            <View style={styles.bmiCard}>
              <LinearGradient
                colors={[bmiCategory.color, bmiCategory.color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bmiGradient}
              >
                <View style={styles.bmiIconContainer}>
                  <Ionicons name={bmiCategory.icon} size={40} color={COLORS.textOnPrimary} />
                </View>
                <Text style={styles.bmiValue}>{bmi}</Text>
                <Text style={styles.bmiCategory}>{bmiCategory.name}</Text>
              </LinearGradient>
            </View>

            {/* BMI Scale */}
            <View style={styles.bmiScale}>
              <View style={styles.bmiScaleItem}>
                <View style={[styles.bmiScaleDot, { backgroundColor: COLORS.info }]} />
                <Text style={styles.bmiScaleText}>Zayıf (&lt;18.5)</Text>
              </View>
              <View style={styles.bmiScaleItem}>
                <View style={[styles.bmiScaleDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.bmiScaleText}>Normal (18.5-24.9)</Text>
              </View>
              <View style={styles.bmiScaleItem}>
                <View style={[styles.bmiScaleDot, { backgroundColor: COLORS.warning }]} />
                <Text style={styles.bmiScaleText}>Fazla Kilolu (25-29.9)</Text>
              </View>
              <View style={styles.bmiScaleItem}>
                <View style={[styles.bmiScaleDot, { backgroundColor: COLORS.error }]} />
                <Text style={styles.bmiScaleText}>Obez (≥30)</Text>
              </View>
            </View>

            {/* AI Tavsiye Butonu */}
            <TouchableOpacity
              style={styles.aiAdviceButton}
              onPress={getAIAdvice}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[COLORS.accent, COLORS.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiAdviceGradient}
              >
                <Ionicons name="sparkles" size={20} color={COLORS.textOnPrimary} />
                <Text style={styles.aiAdviceButtonText}>AI'dan Detaylı Tavsiye Al</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Öneriler</Text>
            {recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationCard}>
                <View style={styles.recommendationIcon}>
                  <Ionicons name="bulb" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* AI Tavsiye Modal */}
      <Modal
        visible={aiAdviceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAiAdviceModalVisible(false)}
      >
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            <View style={styles.aiModalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons
                  name="sparkles"
                  size={24}
                  color={COLORS.accent}
                />
                <Text style={styles.modalTitle}>AI VKİ Tavsiyesi</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAiAdviceModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.aiModalBody}
              showsVerticalScrollIndicator={false}
            >
              {loadingAdvice ? (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={styles.aiLoadingText}>
                    AI tavsiyeniz hazırlanıyor...
                  </Text>
                  <Text style={styles.aiLoadingSubtext}>
                    Bu birkaç saniye sürebilir
                  </Text>
                </View>
              ) : (
                <View style={styles.aiAdviceContainer}>
                  <LinearGradient
                    colors={bmiCategory ? [bmiCategory.color, bmiCategory.color + 'CC'] : [COLORS.accent, COLORS.accentDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiAdviceHeader}
                  >
                    <Ionicons name="fitness" size={32} color={COLORS.textOnPrimary} />
                    <Text style={styles.aiAdviceTitle}>
                      VKİ: {bmi} - {bmiCategory?.name}
                    </Text>
                  </LinearGradient>
                  <View style={styles.aiAdviceContent}>
                    <Text style={styles.aiAdviceText}>{aiAdvice}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.aiModalFooter}>
              <TouchableOpacity
                style={styles.aiCloseButton}
                onPress={() => setAiAdviceModalVisible(false)}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.aiCloseButtonGradient}
                >
                  <Text style={styles.aiCloseButtonText}>Kapat</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SIZES.containerPadding,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xxl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginTop: SIZES.md,
  },
  headerSubtitle: {
    fontSize: SIZES.body,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
    marginTop: SIZES.xs,
  },
  content: {
    padding: SIZES.containerPadding,
  },
  section: {
    marginBottom: SIZES.sectionSpacing,
  },
  sectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  input: {
    flex: 1,
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.text,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  genderBtnActive: {
    backgroundColor: COLORS.primary,
  },
  genderText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  genderTextActive: {
    color: COLORS.textOnPrimary,
  },
  saveBtn: {
    marginTop: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.md,
    gap: SIZES.sm,
  },
  saveBtnText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  bmiCard: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  bmiGradient: {
    padding: SIZES.xl,
    alignItems: 'center',
  },
  bmiIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  bmiValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginBottom: SIZES.xs,
  },
  bmiCategory: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
  bmiScale: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  bmiScaleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  bmiScaleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bmiScaleText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationText: {
    flex: 1,
    fontSize: SIZES.body,
    color: COLORS.text,
    lineHeight: 22,
  },
  // AI Tavsiye Stilleri
  aiAdviceButton: {
    marginTop: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  aiAdviceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    gap: SIZES.sm,
  },
  aiAdviceButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
  aiModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  aiModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXL,
    borderTopRightRadius: SIZES.radiusXL,
    maxHeight: '85%',
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  modalTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiModalBody: {
    padding: SIZES.lg,
  },
  aiLoadingContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xxxl,
    gap: SIZES.md,
  },
  aiLoadingText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.text,
  },
  aiLoadingSubtext: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  aiAdviceContainer: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  aiAdviceHeader: {
    padding: SIZES.lg,
    alignItems: 'center',
    gap: SIZES.sm,
  },
  aiAdviceTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    textAlign: 'center',
  },
  aiAdviceContent: {
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
  },
  aiAdviceText: {
    fontSize: SIZES.body,
    color: COLORS.text,
    lineHeight: 24,
  },
  aiModalFooter: {
    padding: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  aiCloseButton: {
    height: 56,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  aiCloseButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCloseButtonText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
});
