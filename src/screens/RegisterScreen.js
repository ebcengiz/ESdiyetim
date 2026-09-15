import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, TYPOGRAPHY, HIT_SLOP, MAX_FONT_SCALE } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { useShake } from '../hooks/useShake';
import { ERROR_CODES } from '../services/errors';
import { validateEmail, validatePassword, validateRequired } from '../utils/validation';
import { ScreenContainer, AppInput, AppButton, IconBadge } from '../components/ui';
import AuthFooter from '../components/auth/AuthFooter';

export default function RegisterScreen({ navigation }) {
  const { signUp, continueAsGuest } = useAuth();
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const { shake, shakeStyle } = useShake();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const validators = {
    fullName: () => validateRequired(fullName, 'Ad soyad'),
    email: () => validateEmail(email.trim()),
    password: () => validatePassword(password),
    confirmPassword: () =>
      !confirmPassword.trim()
        ? 'Şifre tekrarı gerekli.'
        : password !== confirmPassword
          ? 'Şifreler eşleşmiyor.'
          : null,
    privacy: () => (acceptedPrivacy ? null : 'Devam etmek için gizlilik politikasını kabul etmelisiniz.'),
  };

  const validateField = (field) => {
    const msg = validators[field]();
    setErrors((prev) => ({ ...prev, [field]: msg || undefined }));
    return !msg;
  };

  const validateAll = () => {
    const errs = {};
    Object.keys(validators).forEach((f) => {
      const msg = validators[f]();
      if (msg) errs[f] = msg;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleRegister = async () => {
    if (!validateAll()) {
      shake();
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await signUp(email.trim().toLowerCase(), password, fullName.trim());
      if (error) {
        // Alan içi hatalar toast yerine ilgili alanda gösterilir
        if (error.code === ERROR_CODES.AUTH_ALREADY_REGISTERED) {
          setErrors({ email: 'Bu e-posta adresi zaten kayıtlı.' });
          shake();
        } else if (error.code === ERROR_CODES.AUTH_WEAK_PASSWORD) {
          setErrors({ password: error.userMessage });
          shake();
        } else if (error.code === ERROR_CODES.AUTH_INVALID_EMAIL) {
          setErrors({ email: error.userMessage });
          shake();
        } else {
          handleError(error, { context: 'register', onRetry: handleRegister });
        }
        return;
      }

      if (data?.session) {
        showToast('Hesabınız oluşturuldu. Hoş geldiniz!', 'success');
      } else {
        showToast('Hesap oluşturuldu! Doğrulama için gelen kutunuzu kontrol edin.', 'success');
        setTimeout(() => navigation.navigate('Login'), 1200);
      }
    } catch (e) {
      handleError(e, { context: 'register' });
    } finally {
      setLoading(false);
    }
  };

  const togglePrivacy = () => {
    setAcceptedPrivacy((v) => !v);
    clearError('privacy');
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => navigation.goBack()}
        disabled={loading}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Geri"
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.text} />
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer keyboard header={header} contentContainerStyle={styles.scroll}>
      <Animated.View style={shakeStyle}>
        <View style={styles.titleBlock}>
          <IconBadge name="person-add" tone="solid" size={64} style={styles.titleIcon} />
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Hesap Oluşturun
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Sağlıklı yaşam yolculuğunuza başlayın
          </Text>
        </View>

        <AppInput
          label="Ad Soyad"
          icon="person-outline"
          placeholder="Adınız ve soyadınız"
          value={fullName}
          onChangeText={(v) => { setFullName(v); clearError('fullName'); }}
          onBlur={() => fullName && validateField('fullName')}
          error={errors.fullName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!loading}
        />

        <AppInput
          ref={emailRef}
          label="E-posta"
          icon="mail-outline"
          placeholder="ornek@eposta.com"
          value={email}
          onChangeText={(v) => { setEmail(v); clearError('email'); }}
          onBlur={() => email && validateField('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading}
        />

        <AppInput
          ref={passwordRef}
          label="Şifre"
          icon="lock-closed-outline"
          placeholder="En az 6 karakter"
          helper={!errors.password && password.length > 0 && password.length < 6 ? `${6 - password.length} karakter daha` : undefined}
          value={password}
          onChangeText={(v) => { setPassword(v); clearError('password'); }}
          onBlur={() => password && validateField('password')}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!loading}
        />

        <AppInput
          ref={confirmRef}
          label="Şifre Tekrar"
          icon="lock-closed-outline"
          placeholder="Şifrenizi tekrar girin"
          value={confirmPassword}
          onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
          onBlur={() => confirmPassword && validateField('confirmPassword')}
          error={errors.confirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleRegister}
          editable={!loading}
        />

        {/* App Store 5.1: açık rıza — gizlilik politikası */}
        <View style={styles.privacyBlock}>
          <Pressable
            onPress={togglePrivacy}
            disabled={loading}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedPrivacy }}
            accessibilityLabel="Gizlilik politikasını okudum ve kabul ediyorum"
            style={({ pressed }) => [styles.privacyRow, pressed && styles.pressed]}
          >
            <Ionicons
              name={acceptedPrivacy ? 'checkbox' : 'square-outline'}
              size={24}
              color={acceptedPrivacy ? COLORS.primary : errors.privacy ? COLORS.error : COLORS.textSecondary}
            />
            <Text style={styles.privacyText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              <Text onPress={() => navigation.navigate('PrivacyPolicy')} style={styles.privacyLink} accessibilityRole="link">
                Gizlilik Politikası
              </Text>
              <Text> metnini okudum ve kabul ediyorum.</Text>
            </Text>
          </Pressable>
          {!!errors.privacy && (
            <View style={styles.errorRow} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={14} color={COLORS.error} />
              <Text style={styles.errorText}>{errors.privacy}</Text>
            </View>
          )}
        </View>

        <AppButton
          title="Kayıt Ol"
          iconRight="checkmark-circle"
          size="lg"
          fullWidth
          onPress={handleRegister}
          loading={loading}
        />

        <AuthFooter
          onGuest={continueAsGuest}
          guestHint="Sağlık ipuçları hesap olmadan kullanılabilir; diğer özellikler için giriş gerekir."
          switchPrompt="Zaten hesabınız var mı?"
          switchLabel="Giriş Yapın"
          onSwitch={() => navigation.navigate('Login')}
          disabled={loading}
        />
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: SIZES.sm },
  header: { paddingHorizontal: SIZES.containerPadding, paddingTop: SIZES.sm },
  backButton: {
    width: SIZES.minTouch,
    height: SIZES.minTouch,
    borderRadius: SIZES.minTouch / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
  titleBlock: { alignItems: 'center', marginBottom: SIZES.lg },
  titleIcon: { marginBottom: SIZES.md },
  title: { ...TYPOGRAPHY.screenTitle, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: SIZES.body, color: COLORS.textSecondary, textAlign: 'center' },
  privacyBlock: { marginBottom: SIZES.lg },
  privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm + 2, minHeight: SIZES.minTouch, paddingVertical: SIZES.xs },
  privacyText: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 20 },
  privacyLink: { color: COLORS.primary, fontWeight: '700', textDecorationLine: 'underline' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginLeft: 4 },
  errorText: { fontSize: SIZES.tiny + 1, color: COLORS.error, fontWeight: '600', flex: 1 },
});
