import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { dietPlanService } from '../services/supabase';
import { aiService } from '../services/aiService';

export default function DietPlanScreen() {
  const [dietPlans, setDietPlans] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dietPlan, setDietPlan] = useState({
    breakfast: '',
    morning_snack: '',
    lunch: '',
    afternoon_snack: '',
    dinner: '',
    evening_snack: '',
    notes: '',
    total_calories: '',
  });

  // AI Tavsiye state'leri
  const [aiAdviceModalVisible, setAiAdviceModalVisible] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    loadDietPlans();
  }, []);

  const loadDietPlans = async () => {
    try {
      const data = await dietPlanService.getAll();
      setDietPlans(data || []);
    } catch (error) {
      console.error('Diyet planları yükleme hatası:', error);
      Alert.alert('Hata', 'Diyet planları yüklenirken bir hata oluştu.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setSelectedDate(new Date());
    setDietPlan({
      breakfast: '',
      morning_snack: '',
      lunch: '',
      afternoon_snack: '',
      dinner: '',
      evening_snack: '',
      notes: '',
      total_calories: '',
    });
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const openEditModal = (plan) => {
    setEditingId(plan.id);
    setSelectedDate(new Date(plan.date));
    setDietPlan({
      breakfast: plan.breakfast || '',
      morning_snack: plan.morning_snack || '',
      lunch: plan.lunch || '',
      afternoon_snack: plan.afternoon_snack || '',
      dinner: plan.dinner || '',
      evening_snack: plan.evening_snack || '',
      notes: plan.notes || '',
      total_calories: plan.total_calories?.toString() || '',
    });
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const saveDietPlan = async () => {
    try {
      const planData = {
        date: selectedDate.toISOString().split('T')[0],
        breakfast: dietPlan.breakfast,
        morning_snack: dietPlan.morning_snack,
        lunch: dietPlan.lunch,
        afternoon_snack: dietPlan.afternoon_snack,
        dinner: dietPlan.dinner,
        evening_snack: dietPlan.evening_snack,
        notes: dietPlan.notes,
        total_calories: dietPlan.total_calories ? parseInt(dietPlan.total_calories) : null,
      };

      if (editingId) {
        await dietPlanService.update(editingId, planData);
        Alert.alert('✅ Başarılı', 'Diyet planı güncellendi!');
      } else {
        await dietPlanService.create(planData);
        Alert.alert('✅ Başarılı', 'Diyet planı eklendi!');
      }

      setModalVisible(false);
      loadDietPlans();
    } catch (error) {
      console.error('Diyet planı kaydetme hatası:', error);
      Alert.alert('❌ Hata', 'Diyet planı kaydedilirken bir hata oluştu.');
    }
  };

  const deleteDietPlan = (id) => {
    Alert.alert(
      'Diyet Planını Sil',
      'Bu diyet planını silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await dietPlanService.delete(id);
              Alert.alert('✅ Başarılı', 'Diyet planı silindi!');
              loadDietPlans();
            } catch (error) {
              console.error('Diyet planı silme hatası:', error);
              Alert.alert('❌ Hata', 'Diyet planı silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  // AI Tavsiye Al
  const getAIAdvice = async () => {
    if (!stats || dietPlans.length === 0) {
      Alert.alert(
        '⚠️ Yetersiz Veri',
        'AI tavsiyesi alabilmek için en az bir diyet planı oluşturmalısınız.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }

    setLoadingAdvice(true);
    setAiAdviceModalVisible(true);
    setAiAdvice('');

    try {
      const dietData = {
        stats: stats,
        recentPlans: dietPlans,
      };
      const result = await aiService.getDietPlanAdvice(dietData);
      setAiAdvice(result.advice);
    } catch (error) {
      setAiAdvice('⚠️ Tavsiye alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getStats = () => {
    if (dietPlans.length === 0) return null;

    const totalPlans = dietPlans.length;
    const withCalories = dietPlans.filter((p) => p.total_calories).length;
    const avgCalories =
      withCalories > 0
        ? Math.round(
            dietPlans.reduce((sum, p) => sum + (p.total_calories || 0), 0) / withCalories
          )
        : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyPlans = dietPlans.filter((p) => new Date(p.date) >= thirtyDaysAgo).length;

    return {
      totalPlans,
      avgCalories,
      monthlyPlans,
    };
  };

  const getMealSummary = (plan) => {
    const meals = [];
    if (plan.breakfast) meals.push('Kahvaltı');
    if (plan.lunch) meals.push('Öğle');
    if (plan.dinner) meals.push('Akşam');
    return meals.length > 0 ? meals.join(' • ') : 'Öğün yok';
  };

  const stats = getStats();

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      {stats && (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsHeader}
        >
          <StatCard label="Toplam Plan" value={stats.totalPlans} icon="restaurant" />
          <StatCard
            label="Ort. Kalori"
            value={stats.avgCalories > 0 ? `${stats.avgCalories}` : '-'}
            icon="flame"
          />
          <StatCard label="Bu Ay" value={stats.monthlyPlans} icon="calendar" />
        </LinearGradient>
      )}

      {/* AI Tavsiye Butonu */}
      {stats && (
        <View style={styles.aiButtonContainer}>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={getAIAdvice}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiButtonGradient}
            >
              <Ionicons name="sparkles" size={20} color={COLORS.textOnPrimary} />
              <Text style={styles.aiButtonText}>AI'dan Diyet Tavsiyesi Al</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Diyet Planlarım</Text>
            <Text style={styles.subtitle}>{dietPlans.length} plan</Text>
          </View>

          {/* Info Message */}
          {dietPlans.length > 0 && (
            <View style={styles.infoMessage}>
              <Ionicons name="information-circle" size={16} color={COLORS.info} />
              <Text style={styles.infoText}>
                Düzenlemek için dokunun, silmek için basılı tutun
              </Text>
            </View>
          )}

          {/* Diet Plans List */}
          {dietPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Henüz diyet planı yok</Text>
              <Text style={styles.emptySubtext}>Başlamak için + butonuna tıklayın</Text>
            </View>
          ) : (
            dietPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.planCard}
                onPress={() => openEditModal(plan)}
                onLongPress={() => deleteDietPlan(plan.id)}
                activeOpacity={0.7}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planDateContainer}>
                    <Ionicons name="calendar" size={16} color={COLORS.primary} />
                    <Text style={styles.planDate}>{formatDate(plan.date)}</Text>
                  </View>
                  {plan.total_calories && (
                    <View style={styles.calorieBadge}>
                      <Ionicons name="flame" size={14} color={COLORS.textOnPrimary} />
                      <Text style={styles.calorieText}>{plan.total_calories} kcal</Text>
                    </View>
                  )}
                </View>

                <View style={styles.planBody}>
                  <View style={styles.mealSummaryContainer}>
                    <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                    <Text style={styles.mealSummary}>{getMealSummary(plan)}</Text>
                  </View>

                  {plan.notes && (
                    <View style={styles.notesPreview}>
                      <Ionicons name="document-text" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.notesPreviewText} numberOfLines={1}>
                        {plan.notes}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.addButtonGradient}
        >
          <Text style={styles.addButtonText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleContainer}>
                      <Ionicons
                        name={editingId ? 'create' : 'add-circle'}
                        size={24}
                        color={COLORS.primary}
                        style={styles.modalIcon}
                      />
                      <Text style={styles.modalTitle}>
                        {editingId ? 'Planı Düzenle' : 'Yeni Plan'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalBody}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Date Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tarih</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <Text style={styles.dateButtonText}>
                          {selectedDate.toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                      {showDatePicker && (
                        <View style={styles.datePickerContainer}>
                          <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            locale="tr-TR"
                          />
                          {Platform.OS === 'ios' && (
                            <TouchableOpacity
                              style={styles.datePickerCloseBtn}
                              onPress={() => setShowDatePicker(false)}
                            >
                              <Text style={styles.datePickerCloseText}>Tamam</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Main Meals Section */}
                    <Text style={styles.sectionTitle}>Ana Öğünler</Text>

                    <MealInput
                      icon="sunny"
                      label="Kahvaltı"
                      placeholder="Kahvaltıda ne yediniz?"
                      value={dietPlan.breakfast}
                      onChangeText={(text) => setDietPlan({ ...dietPlan, breakfast: text })}
                    />

                    <MealInput
                      icon="partly-sunny"
                      label="Öğle Yemeği"
                      placeholder="Öğle yemeğinde ne yediniz?"
                      value={dietPlan.lunch}
                      onChangeText={(text) => setDietPlan({ ...dietPlan, lunch: text })}
                    />

                    <MealInput
                      icon="moon"
                      label="Akşam Yemeği"
                      placeholder="Akşam yemeğinde ne yediniz?"
                      value={dietPlan.dinner}
                      onChangeText={(text) => setDietPlan({ ...dietPlan, dinner: text })}
                    />

                    {/* Snacks Section */}
                    <Text style={styles.sectionTitle}>Ara Öğünler</Text>

                    <MealInput
                      icon="cafe"
                      label="Kuşluk"
                      placeholder="Sabah ara öğünü..."
                      value={dietPlan.morning_snack}
                      onChangeText={(text) =>
                        setDietPlan({ ...dietPlan, morning_snack: text })
                      }
                      compact
                    />

                    <MealInput
                      icon="nutrition"
                      label="İkindi"
                      placeholder="Öğleden sonra ara öğünü..."
                      value={dietPlan.afternoon_snack}
                      onChangeText={(text) =>
                        setDietPlan({ ...dietPlan, afternoon_snack: text })
                      }
                      compact
                    />

                    <MealInput
                      icon="moon-outline"
                      label="Gece"
                      placeholder="Akşam ara öğünü..."
                      value={dietPlan.evening_snack}
                      onChangeText={(text) =>
                        setDietPlan({ ...dietPlan, evening_snack: text })
                      }
                      compact
                    />

                    {/* Additional Info Section */}
                    <Text style={styles.sectionTitle}>Ek Bilgiler</Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Toplam Kalori</Text>
                      <View style={styles.calorieInputContainer}>
                        <Ionicons name="flame" size={20} color={COLORS.primary} />
                        <TextInput
                          style={styles.calorieInput}
                          value={dietPlan.total_calories}
                          onChangeText={(text) =>
                            setDietPlan({ ...dietPlan, total_calories: text })
                          }
                          placeholder="1500"
                          keyboardType="numeric"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Notlar (Opsiyonel)</Text>
                      <View style={styles.notesInputContainer}>
                        <Ionicons name="document-text" size={20} color={COLORS.primary} />
                        <TextInput
                          style={styles.notesInput}
                          value={dietPlan.notes}
                          onChangeText={(text) => setDietPlan({ ...dietPlan, notes: text })}
                          placeholder="Notlarınızı yazın..."
                          multiline
                          numberOfLines={3}
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.cancelBtn]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.cancelBtnText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.saveBtnModal]}
                      onPress={saveDietPlan}
                    >
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.saveBtnGradient}
                      >
                        <Text style={styles.saveBtnText}>Kaydet</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

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
                <Text style={styles.modalTitle}>AI Diyet Tavsiyesi</Text>
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
                    Diyet planlarınız analiz ediliyor...
                  </Text>
                  <Text style={styles.aiLoadingSubtext}>
                    Bu birkaç saniye sürebilir
                  </Text>
                </View>
              ) : (
                <View style={styles.aiAdviceContainer}>
                  <LinearGradient
                    colors={[COLORS.accent, COLORS.accentDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiAdviceHeader}
                  >
                    <Ionicons name="restaurant" size={32} color={COLORS.textOnPrimary} />
                    <Text style={styles.aiAdviceTitle}>
                      Beslenme Analizi
                    </Text>
                  </LinearGradient>
                  <View style={styles.aiAdviceContent}>
                    <Text style={styles.aiAdviceText}>{aiAdvice}</Text>
                    <View style={styles.disclaimerBox}>
                      <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.disclaimerText}>Bu bilgiler tıbbi tavsiye yerine geçmez. Sağlık kararları için bir doktor veya uzman diyetisyene danışınız.</Text>
                    </View>
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
    </View>
  );
}

// Stat Card Component
const StatCard = ({ label, value, icon }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={28} color={COLORS.textOnPrimary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Meal Input Component
const MealInput = ({ icon, label, placeholder, value, onChangeText, compact }) => (
  <View style={[styles.mealInputGroup, compact && styles.mealInputGroupCompact]}>
    <View style={styles.mealInputHeader}>
      <View style={styles.mealIconBadge}>
        <Ionicons name={icon} size={16} color={COLORS.primary} />
      </View>
      <Text style={styles.mealInputLabel}>{label}</Text>
    </View>
    <TextInput
      style={[styles.mealInput, compact && styles.mealInputCompact]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      multiline
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SIZES.containerPadding,
    paddingTop: SIZES.lg,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.xs,
  },
  statLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.containerPadding,
  },
  titleContainer: {
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.highlight,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSmall,
    marginBottom: SIZES.md,
    gap: SIZES.xs,
  },
  infoText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxxl,
  },
  emptyText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.body,
    color: COLORS.textLight,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  planDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  planDate: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSmall,
    gap: 4,
  },
  calorieText: {
    fontSize: SIZES.tiny,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  planBody: {
    gap: SIZES.xs,
  },
  mealSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  mealSummary: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    marginTop: SIZES.xs,
  },
  notesPreviewText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    flex: 1,
  },
  addButton: {
    position: 'absolute',
    bottom: SIZES.lg,
    right: SIZES.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  addButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 36,
    fontWeight: '300',
    color: COLORS.textOnPrimary,
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXL,
    borderTopRightRadius: SIZES.radiusXL,
    maxHeight: '90%',
  },
  modalHeader: {
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
  modalIcon: {
    marginRight: SIZES.xs,
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
  modalBody: {
    padding: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
  },
  dateButtonText: {
    flex: 1,
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  datePickerContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    marginTop: SIZES.sm,
    overflow: 'hidden',
  },
  datePickerCloseBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  datePickerCloseText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  mealInputGroup: {
    marginBottom: SIZES.md,
  },
  mealInputGroupCompact: {
    marginBottom: SIZES.sm,
  },
  mealInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
    gap: SIZES.xs,
  },
  mealIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInputLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mealInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    fontSize: SIZES.body,
    color: COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  mealInputCompact: {
    minHeight: 50,
  },
  calorieInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    paddingHorizontal: SIZES.md,
    gap: SIZES.sm,
  },
  calorieInput: {
    flex: 1,
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: SIZES.md,
  },
  notesInputContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
    alignItems: 'flex-start',
  },
  notesInput: {
    flex: 1,
    fontSize: SIZES.body,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SIZES.md,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  modalBtn: {
    flex: 1,
    height: 56,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
  },
  cancelBtn: {
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: SIZES.h5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtnModal: {},
  saveBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  // AI Buton Stilleri
  aiButtonContainer: {
    padding: SIZES.md,
    backgroundColor: COLORS.background,
  },
  aiButton: {
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  aiButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    gap: SIZES.sm,
  },
  aiButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
  // AI Modal Stilleri
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
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall,
    padding: SIZES.sm,
    marginTop: SIZES.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: SIZES.tiny,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
});
