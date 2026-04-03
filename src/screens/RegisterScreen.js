import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, INPUT_FIELD } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, continueAsGuest } = useAuth();

  const handleRegister = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Hata', 'Lütfen adınızı ve soyadınızı girin.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi girin.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Hata', 'Lütfen şifrenizi girin.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
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
          Alert.alert('Hata', 'Bu e-posta adresi zaten kayıtlı.');
        } else {
          Alert.alert('Hata', error.message || 'Kayıt olurken bir hata oluştu.');
        }
        return;
      }

      // Oturum hemen açıldıysa (e-posta doğrulaması kapalı vb.) kök navigator zaten ana uygulamaya geçer;
      // bu durumda Login ekranı yoktur — navigate('Login') hata verir.
      if (data?.session) {
        Alert.alert(
          'Kayıt Başarılı!',
          'Hesabınız oluşturuldu. Hoş geldiniz!',
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert(
          'Kayıt Başarılı!',
          'Hesabınız oluşturuldu. E-posta doğrulaması isteniyorsa gelen kutunuzu kontrol edin; ardından giriş yapabilirsiniz.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
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
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.titleContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBadge}
            >
              <Ionicons name="person-add" size={32} color={COLORS.textOnPrimary} />
            </LinearGradient>
            <Text style={styles.title}>Hesap Oluşturun</Text>
            <Text style={styles.subtitle}>Sağlıklı yaşam yolculuğunuza başlayın</Text>
          </View>

          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor={COLORS.textSecondary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="E-posta adresiniz"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            </View>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Şifre (en az 6 karakter)"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            </View>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Şifre Tekrar"
              placeholderTextColor={COLORS.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? [COLORS.disabled, COLORS.disabled] : [COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.registerGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textOnPrimary} />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Kayıt Ol</Text>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.textOnPrimary} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={async () => {
              await continueAsGuest();
            }}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="phone-portrait-outline" size={20} color={COLORS.primary} />
            <Text style={styles.guestButtonText}>Hesap olmadan devam et</Text>
          </TouchableOpacity>
          <Text style={styles.guestHint}>
            Sağlık ipuçları hesap olmadan kullanılabilir; diğer özellikler için giriş gerekir.
          </Text>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Giriş Yapın</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: SIZES.containerPadding,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  formContainer: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.lg,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    ...INPUT_FIELD,
    borderRadius: SIZES.radiusMedium,
  },
  inputIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 56,
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
  registerButton: {
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
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
    paddingVertical: SIZES.md,
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
  guestHint: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
    paddingHorizontal: SIZES.sm,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
  },
  registerButtonText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: SIZES.md,
    paddingBottom: 4,
  },
  loginText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
