import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, INPUT_FIELD } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const { signUp, continueAsGuest } = useAuth();
  const { showToast } = useToast();

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Ad soyad gerekli.';
    if (!email.trim()) {
      errs.email = 'E-posta adresi gerekli.';
    } else if (!emailRegex.test(email)) {
      errs.email = 'Geçerli bir e-posta adresi girin.';
    }
    if (!password.trim()) {
      errs.password = 'Şifre gerekli.';
    } else if (password.length < 6) {
      errs.password = 'Şifre en az 6 karakter olmalı.';
    }
    if (!confirmPassword.trim()) {
      errs.confirmPassword = 'Şifre tekrarı gerekli.';
    } else     if (password !== confirmPassword) {
      errs.confirmPassword = 'Şifreler eşleşmiyor.';
    }
    if (!acceptedPrivacy) {
      errs.privacy = 'Devam etmek için gizlilik politikasını kabul etmelisiniz.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleRegister = async () => {
    if (!validate()) {
      shake();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUp(
        email.trim().toLowerCase(),
        password,
        fullName.trim()
      );

      if (error) {
        if (error.message.includes('already registered')) {
          setErrors({ email: 'Bu e-posta adresi zaten kayıtlı.' });
          shake();
        } else {
          showToast(error.message || 'Kayıt olurken bir hata oluştu.', 'error');
        }
        return;
      }

      if (data?.session) {
        showToast('Hesabınız oluşturuldu. Hoş geldiniz!', 'success');
      } else {
        showToast('Hesap oluşturuldu! Gelen kutunuzu kontrol edin.', 'success');
        setTimeout(() => navigation.navigate('Login'), 1200);
      }
    } catch (_) {
      showToast('Beklenmeyen bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputBorderColor = (field) => {
    if (errors[field]) return COLORS.error;
    if (focusedField === field) return COLORS.primary;
    return COLORS.border;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.formContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBadge}
            >
              <Ionicons name="person-add" size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Hesap Oluşturun</Text>
            <Text style={styles.subtitle}>Sağlıklı yaşam yolculuğunuza başlayın</Text>
          </View>

          {/* Full Name */}
          <View style={styles.fieldWrap}>
            <View style={[styles.inputContainer, { borderColor: inputBorderColor('fullName') }, focusedField === 'fullName' && styles.inputFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="person-outline" size={20} color={focusedField === 'fullName' ? COLORS.primary : COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ad Soyad"
                placeholderTextColor={COLORS.textLight}
                value={fullName}
                onChangeText={(v) => { setFullName(v); clearError('fullName'); }}
                autoCapitalize="words"
                editable={!loading}
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.fullName ? <ErrorRow text={errors.fullName} /> : null}
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <View style={[styles.inputContainer, { borderColor: inputBorderColor('email') }, focusedField === 'email' && styles.inputFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="mail-outline" size={20} color={focusedField === 'email' ? COLORS.primary : COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="E-posta adresiniz"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={(v) => { setEmail(v); clearError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.email ? <ErrorRow text={errors.email} /> : null}
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <View style={[styles.inputContainer, { borderColor: inputBorderColor('password') }, focusedField === 'password' && styles.inputFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? COLORS.primary : COLORS.textSecondary} />
              </View>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Şifre (en az 6 karakter)"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={(v) => { setPassword(v); clearError('password'); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {errors.password ? <ErrorRow text={errors.password} /> : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldWrap}>
            <View style={[styles.inputContainer, { borderColor: inputBorderColor('confirmPassword') }, focusedField === 'confirmPassword' && styles.inputFocused]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'confirmPassword' ? COLORS.primary : COLORS.textSecondary} />
              </View>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Şifre Tekrar"
                placeholderTextColor={COLORS.textLight}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <ErrorRow text={errors.confirmPassword} /> : null}
          </View>

          {/* App Store 5.1: açık rıza — gizlilik politikası */}
          <View style={styles.privacyBlock}>
            <View style={styles.privacyRow}>
              <TouchableOpacity
                onPress={() => {
                  setAcceptedPrivacy(!acceptedPrivacy);
                  if (errors.privacy) setErrors((prev) => ({ ...prev, privacy: undefined }));
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={loading}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedPrivacy }}
              >
                <Ionicons
                  name={acceptedPrivacy ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={acceptedPrivacy ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.privacyText}>
                <Text
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                  style={styles.privacyLink}
                >
                  Gizlilik Politikası
                </Text>
                <Text> metnini okudum ve kabul ediyorum.</Text>
              </Text>
            </View>
            {errors.privacy ? <ErrorRow text={errors.privacy} /> : null}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={loading ? [COLORS.disabled, COLORS.disabled] : [COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Kayıt Ol</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => continueAsGuest()}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="phone-portrait-outline" size={20} color={COLORS.primary} />
            <Text style={styles.guestButtonText}>Hesap olmadan devam et</Text>
          </TouchableOpacity>

          <View style={styles.guestHintBox}>
            <Ionicons name="information-circle-outline" size={15} color={COLORS.textLight} />
            <Text style={styles.guestHintText}>
              Sağlık ipuçları hesap olmadan kullanılabilir; diğer özellikler için giriş gerekir.
            </Text>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
              <Text style={styles.loginLink}>Giriş Yapın</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ErrorRow = ({ text }) => (
  <View style={styles.errorRow}>
    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
    <Text style={styles.errorText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingHorizontal: SIZES.containerPadding,
    paddingBottom: SIZES.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  formContainer: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.md,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  privacyBlock: {
    marginBottom: SIZES.md,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  privacyLink: {
    color: COLORS.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  fieldWrap: {
    marginBottom: SIZES.md,
  },
  inputContainer: {
    ...INPUT_FIELD,
    borderRadius: SIZES.radiusMedium,
    marginBottom: 0,
    borderWidth: 1.5,
  },
  inputFocused: {
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 54,
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: SIZES.md,
    padding: SIZES.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: SIZES.small,
    color: COLORS.error,
    fontWeight: '500',
  },
  registerButton: {
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    marginTop: SIZES.sm,
    ...SHADOWS.medium,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
  },
  buttonText: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    marginHorizontal: SIZES.md,
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    paddingVertical: 14,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  guestButtonText: {
    fontSize: SIZES.body,
    fontWeight: '700',
    color: COLORS.primary,
  },
  guestHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.radiusSmall,
    padding: SIZES.sm + 2,
  },
  guestHintText: {
    flex: 1,
    fontSize: SIZES.small,
    color: COLORS.textLight,
    lineHeight: 19,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: SIZES.md,
    paddingBottom: 4,
  },
  loginText: { fontSize: SIZES.body, color: COLORS.textSecondary },
  loginLink: { fontSize: SIZES.body, color: COLORS.primary, fontWeight: '700' },
});
