import React, { useState, useRef } from "react";
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
  Image,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SIZES, SHADOWS, INPUT_FIELD } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const { signIn, continueAsGuest } = useAuth();
  const { showToast } = useToast();

  // Shake animation for submit error
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
    if (!email.trim()) {
      errs.email = "E-posta adresi gerekli.";
    } else if (!emailRegex.test(email)) {
      errs.email = "Geçerli bir e-posta adresi girin.";
    }
    if (!password.trim()) {
      errs.password = "Şifre gerekli.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleLogin = async () => {
    if (!validate()) {
      shake();
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email.trim().toLowerCase(), password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrors({ password: "E-posta veya şifre hatalı." });
          shake();
        } else if (error.message.includes("Email not confirmed")) {
          showToast("E-postanızdaki doğrulama linkine tıklayın.", "warning");
        } else {
          showToast(error.message || "Giriş yapılırken bir hata oluştu.", "error");
        }
      }
    } catch (_) {
      showToast("Beklenmeyen bir hata oluştu.", "error");
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 16 }]}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appTitle}>ESdiyet</Text>
            <Text style={styles.appSubtitle}>Sağlıklı Yaşam Asistanınız</Text>
          </View>
        </LinearGradient>

        {/* Form */}
        <Animated.View
          style={[
            styles.formContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
          <Text style={styles.subtitleText}>Hesabınıza giriş yapın</Text>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <View
              style={[
                styles.inputContainer,
                { borderColor: inputBorderColor("email") },
                focusedField === "email" && styles.inputFocused,
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focusedField === "email" ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="E-posta adresiniz"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={(v) => { setEmail(v); clearError("email"); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.email ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <View
              style={[
                styles.inputContainer,
                { borderColor: inputBorderColor("password") },
                focusedField === "password" && styles.inputFocused,
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedField === "password" ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Şifreniz"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={(v) => { setPassword(v); clearError("password"); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            ) : null}
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
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
                  <Text style={styles.buttonText}>Giriş Yap</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
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
              Sağlık ipuçları hesap olmadan kullanılabilir. Diyet planı, kilo takibi ve hedefler için giriş gerekir.
            </Text>
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")} disabled={loading}>
              <Text style={styles.registerLink}>Kayıt Olun</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    paddingBottom: 44,
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.96)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.md,
    overflow: "hidden",
    ...SHADOWS.large,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: "#fff",
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: SIZES.bodySmall,
    color: "#fff",
    opacity: 0.9,
  },
  formContainer: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.xl + 4,
  },
  welcomeText: {
    fontSize: SIZES.h2,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  subtitleText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xl,
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
    alignItems: "center",
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
    position: "absolute",
    right: SIZES.md,
    padding: SIZES.xs,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: SIZES.small,
    color: COLORS.error,
    fontWeight: "500",
  },
  loginButton: {
    borderRadius: SIZES.radiusMedium,
    overflow: "hidden",
    marginTop: SIZES.sm,
    ...SHADOWS.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.sm,
  },
  buttonText: {
    fontSize: SIZES.h4,
    fontWeight: "700",
    color: "#fff",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SIZES.xl,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.sm,
    paddingVertical: 14,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  guestButtonText: {
    fontSize: SIZES.body,
    fontWeight: "700",
    color: COLORS.primary,
  },
  guestHintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    paddingBottom: 4,
  },
  registerText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: "700",
  },
});
