import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY, MAX_FONT_SCALE, whiteAlpha } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useAppError } from '../hooks/useAppError';
import { useShake } from '../hooks/useShake';
import { useResponsive } from '../hooks/useResponsive';
import { ERROR_CODES } from '../services/errors';
import { validateEmail, validateRequired } from '../utils/validation';
import { ScreenContainer, AppInput, AppButton } from '../components/ui';
import AuthFooter from '../components/auth/AuthFooter';

export default function LoginScreen({ navigation }) {
  const { topPad, isSmall } = useResponsive();
  const { signIn, continueAsGuest } = useAuth();
  const { handleError } = useAppError();
  const { shake, shakeStyle } = useShake();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const passwordRef = useRef(null);

  // Alan bazlı doğrulama — hem blur'da (erken geri bildirim) hem submit'te
  const validators = {
    email: () => validateEmail(email.trim()),
    password: () => validateRequired(password, 'Şifre'),
  };

  const validateField = useCallback((field) => {
    const msg = validators[field]();
    setErrors((prev) => ({ ...prev, [field]: msg || undefined }));
    return !msg;
  }, [email, password]);

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

  const handleLogin = async () => {
    if (!validateAll()) {
      shake();
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email.trim().toLowerCase(), password);
      if (error) {
        if (error.code === ERROR_CODES.AUTH_INVALID_CREDENTIALS) {
          // Alan içi hata — toast yerine şifre alanında göster
          setErrors({ password: error.userMessage });
          shake();
        } else {
          handleError(error, { context: 'login', onRetry: handleLogin });
        }
      }
    } catch (e) {
      handleError(e, { context: 'login' });
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: topPad }]}
    >
      <View style={[styles.logoBadge, isSmall && styles.logoBadgeSmall]}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <Text style={styles.appTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        ESdiyet
      </Text>
      <Text style={styles.appSubtitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Sağlıklı Yaşam Asistanınız
      </Text>
    </LinearGradient>
  );

  return (
    <ScreenContainer keyboard edges={[]} padded={false} contentContainerStyle={styles.scroll}>
      {header}

      <Animated.View style={[styles.form, shakeStyle]}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Hoş Geldiniz
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Hesabınıza giriş yapın
        </Text>

        <AppInput
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
          placeholder="Şifreniz"
          value={password}
          onChangeText={(v) => { setPassword(v); clearError('password'); }}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          editable={!loading}
        />

        <AppButton
          title="Giriş Yap"
          iconRight="arrow-forward"
          size="lg"
          fullWidth
          onPress={handleLogin}
          loading={loading}
          style={styles.submit}
        />

        <AuthFooter
          onGuest={continueAsGuest}
          guestHint="Sağlık ipuçları hesap olmadan kullanılabilir. Diyet planı, kilo takibi ve hedefler için giriş gerekir."
          onPrivacy={() => navigation.navigate('PrivacyPolicy')}
          switchPrompt="Hesabınız yok mu?"
          switchLabel="Kayıt Olun"
          onSwitch={() => navigation.navigate('Register')}
          disabled={loading}
        />
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingTop: 0 },
  header: {
    paddingBottom: SIZES.xl + SIZES.sm,
    alignItems: 'center',
    borderBottomLeftRadius: SIZES.radiusXL,
    borderBottomRightRadius: SIZES.radiusXL,
  },
  logoBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: whiteAlpha(0.96),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  logoBadgeSmall: { width: 92, height: 92, borderRadius: 46 },
  logoImage: { width: '100%', height: '100%' },
  appTitle: { ...TYPOGRAPHY.hero, color: COLORS.textOnPrimary, marginBottom: 2 },
  appSubtitle: { fontSize: SIZES.bodySmall, color: whiteAlpha(0.9) },
  form: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.xl,
  },
  title: { ...TYPOGRAPHY.screenTitle, marginBottom: 4 },
  subtitle: { fontSize: SIZES.body, color: COLORS.textSecondary, marginBottom: SIZES.lg },
  submit: { marginTop: SIZES.xs },
});
