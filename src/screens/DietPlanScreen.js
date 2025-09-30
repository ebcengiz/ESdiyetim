import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { dietPlanService } from '../services/supabase';

export default function DietPlanScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
  const [isEditing, setIsEditing] = useState(false);
  const [existingPlanId, setExistingPlanId] = useState(null);

  useEffect(() => {
    loadDietPlan();
  }, [selectedDate]);

  const loadDietPlan = async () => {
    try {
      const data = await dietPlanService.getByDate(selectedDate);
      if (data) {
        setDietPlan({
          breakfast: data.breakfast || '',
          morning_snack: data.morning_snack || '',
          lunch: data.lunch || '',
          afternoon_snack: data.afternoon_snack || '',
          dinner: data.dinner || '',
          evening_snack: data.evening_snack || '',
          notes: data.notes || '',
          total_calories: data.total_calories?.toString() || '',
        });
        setExistingPlanId(data.id);
        setIsEditing(false);
      } else {
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
        setExistingPlanId(null);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Diyet planı yükleme hatası:', error);
      Alert.alert('Hata', 'Diyet planı yüklenirken bir hata oluştu.');
    }
  };

  const saveDietPlan = async () => {
    try {
      const planData = {
        date: selectedDate,
        breakfast: dietPlan.breakfast,
        morning_snack: dietPlan.morning_snack,
        lunch: dietPlan.lunch,
        afternoon_snack: dietPlan.afternoon_snack,
        dinner: dietPlan.dinner,
        evening_snack: dietPlan.evening_snack,
        notes: dietPlan.notes,
        total_calories: dietPlan.total_calories ? parseInt(dietPlan.total_calories) : null,
      };

      if (existingPlanId) {
        await dietPlanService.update(existingPlanId, planData);
        Alert.alert('✅ Başarılı', 'Diyet planı güncellendi!');
      } else {
        const newPlan = await dietPlanService.create(planData);
        setExistingPlanId(newPlan.id);
        Alert.alert('✅ Başarılı', 'Diyet planı kaydedildi!');
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Diyet planı kaydetme hatası:', error);
      Alert.alert('❌ Hata', 'Diyet planı kaydedilirken bir hata oluştu.');
    }
  };

  const deleteDietPlan = () => {
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
              await dietPlanService.delete(existingPlanId);
              Alert.alert('✅ Başarılı', 'Diyet planı silindi!');
              loadDietPlan();
            } catch (error) {
              console.error('Diyet planı silme hatası:', error);
              Alert.alert('❌ Hata', 'Diyet planı silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];

    if (dateString === today) {
      return 'Bugün';
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Dün';
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'Yarın';
    }

    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      weekday: 'short'
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Date Selector */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.dateSelector}
      >
        <TouchableOpacity
          onPress={() => changeDate(-1)}
          style={styles.dateArrow}
        >
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <Text style={styles.dateSubText}>
            {new Date(selectedDate).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => changeDate(1)}
          style={styles.dateArrow}
        >
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Main Meals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ana Öğünler</Text>

            <MealInput
              icon="sunny"
              label="Kahvaltı"
              placeholder="Kahvaltıda ne yediniz?"
              value={dietPlan.breakfast}
              onChangeText={(text) => setDietPlan({ ...dietPlan, breakfast: text })}
              editable={isEditing}
            />

            <MealInput
              icon="partly-sunny"
              label="Öğle Yemeği"
              placeholder="Öğle yemeğinde ne yediniz?"
              value={dietPlan.lunch}
              onChangeText={(text) => setDietPlan({ ...dietPlan, lunch: text })}
              editable={isEditing}
            />

            <MealInput
              icon="moon"
              label="Akşam Yemeği"
              placeholder="Akşam yemeğinde ne yediniz?"
              value={dietPlan.dinner}
              onChangeText={(text) => setDietPlan({ ...dietPlan, dinner: text })}
              editable={isEditing}
            />
          </View>

          {/* Snacks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ara Öğünler</Text>

            <MealInput
              icon="cafe"
              label="Kuşluk"
              placeholder="Sabah ara öğünü..."
              value={dietPlan.morning_snack}
              onChangeText={(text) => setDietPlan({ ...dietPlan, morning_snack: text })}
              editable={isEditing}
              compact
            />

            <MealInput
              icon="nutrition"
              label="İkindi"
              placeholder="Öğleden sonra ara öğünü..."
              value={dietPlan.afternoon_snack}
              onChangeText={(text) => setDietPlan({ ...dietPlan, afternoon_snack: text })}
              editable={isEditing}
              compact
            />

            <MealInput
              icon="moon-outline"
              label="Gece"
              placeholder="Akşam ara öğünü..."
              value={dietPlan.evening_snack}
              onChangeText={(text) => setDietPlan({ ...dietPlan, evening_snack: text })}
              editable={isEditing}
              compact
            />
          </View>

          {/* Calories & Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ek Bilgiler</Text>

            <View style={styles.modernCard}>
              <View style={styles.calorieContainer}>
                <View style={styles.calorieIcon}>
                  <Ionicons name="flame" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.calorieInput}>
                  <Text style={styles.label}>Toplam Kalori</Text>
                  <TextInput
                    style={[
                      styles.calorieTextInput,
                      !isEditing && styles.inputDisabled
                    ]}
                    value={dietPlan.total_calories}
                    onChangeText={(text) => setDietPlan({ ...dietPlan, total_calories: text })}
                    placeholder="1500"
                    keyboardType="numeric"
                    editable={isEditing}
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.notesContainer}>
                <View style={styles.notesIcon}>
                  <Ionicons name="document-text" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.notesInput}>
                  <Text style={styles.label}>Notlar</Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      !isEditing && styles.inputDisabled
                    ]}
                    value={dietPlan.notes}
                    onChangeText={(text) => setDietPlan({ ...dietPlan, notes: text })}
                    placeholder="Notlarınızı buraya yazabilirsiniz..."
                    multiline
                    numberOfLines={3}
                    editable={isEditing}
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.saveBtn]}
                  onPress={saveDietPlan}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btnGradient}
                  >
                    <View style={styles.btnContent}>
                      <Ionicons name="save" size={20} color={COLORS.textOnPrimary} />
                      <Text style={styles.btnText}>Kaydet</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                {existingPlanId && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={() => {
                      loadDietPlan();
                      setIsEditing(false);
                    }}
                  >
                    <View style={styles.btnContent}>
                      <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                      <Text style={styles.cancelBtnText}>İptal</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => setIsEditing(true)}
                >
                  <LinearGradient
                    colors={[COLORS.secondary, COLORS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btnGradient}
                  >
                    <View style={styles.btnContent}>
                      <Ionicons name="create" size={20} color={COLORS.textOnPrimary} />
                      <Text style={styles.btnText}>Düzenle</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                {existingPlanId && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={deleteDietPlan}
                  >
                    <View style={styles.btnContent}>
                      <Ionicons name="trash" size={20} color={COLORS.error} />
                      <Text style={styles.deleteBtnText}>Sil</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Meal Input Component
const MealInput = ({ icon, label, placeholder, value, onChangeText, editable, compact }) => (
  <View style={[styles.mealCard, compact && styles.mealCardCompact]}>
    <View style={styles.mealHeader}>
      <View style={styles.mealIconBadge}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.mealLabel}>{label}</Text>
    </View>
    <TextInput
      style={[
        styles.mealInput,
        !editable && styles.inputDisabled,
        compact && styles.mealInputCompact
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      multiline
      editable={editable}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
  },
  dateArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowText: {
    fontSize: 28,
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
  },
  dateText: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginBottom: 4,
  },
  dateSubText: {
    fontSize: SIZES.small,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
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
  mealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  mealCardCompact: {
    padding: SIZES.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  mealIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  mealEmoji: {
    fontSize: 18,
  },
  mealLabel: {
    fontSize: SIZES.h5,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealInput: {
    fontSize: SIZES.body,
    color: COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
    paddingHorizontal: SIZES.sm,
  },
  mealInputCompact: {
    minHeight: 40,
  },
  inputDisabled: {
    color: COLORS.textSecondary,
  },
  modernCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  calorieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  calorieIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  calorieEmoji: {
    fontSize: 24,
  },
  calorieInput: {
    flex: 1,
  },
  label: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  calorieTextInput: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SIZES.md,
  },
  notesContainer: {
    flexDirection: 'row',
    paddingVertical: SIZES.sm,
  },
  notesIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  notesEmoji: {
    fontSize: 24,
  },
  notesInput: {
    flex: 1,
  },
  textArea: {
    fontSize: SIZES.body,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginBottom: SIZES.xl,
  },
  actionBtn: {
    flex: 1,
    height: 56,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  btnText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  saveBtn: {},
  editBtn: {},
  cancelBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: SIZES.h5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deleteBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: SIZES.h5,
    fontWeight: '600',
    color: COLORS.error,
  },
});