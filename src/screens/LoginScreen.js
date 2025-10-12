import React, { useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert("Hata", "Lütfen e-posta adresinizi girin.");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Hata", "Lütfen şifrenizi girin.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Hata", "Geçerli bir e-posta adresi girin.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signIn(
        email.trim().toLowerCase(),
        password
      );

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          Alert.alert("Giriş Başarısız", "E-posta veya şifre hatalı.");
        } else if (error.message.includes("Email not confirmed")) {
          Alert.alert(
            "E-posta Doğrulanmadı",
            "Lütfen e-postanızdaki doğrulama linkine tıklayın."
          );
        } else {
          Alert.alert(
            "Hata",
            error.message || "Giriş yapılırken bir hata oluştu."
          );
        }
        return;
      }

      // Navigation otomatik olarak AuthContext tarafından yönetilecek
    } catch (error) {
      Alert.alert("Hata", "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="leaf" size={48} color={COLORS.textOnPrimary} />
            </View>
            <Text style={styles.appTitle}>ESdiyet</Text>
            <Text style={styles.appSubtitle}>Sağlıklı Yaşam Asistanınız</Text>
          </View>
        </LinearGradient>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
          <Text style={styles.subtitleText}>Hesabınıza giriş yapın</Text>

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
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Şifreniz"
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
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                loading
                  ? [COLORS.disabled, COLORS.disabled]
                  : [COLORS.primary, COLORS.primaryDark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loginGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textOnPrimary} />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Giriş Yap</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.textOnPrimary}
                  />
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

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              disabled={loading}
            >
              <Text style={styles.registerLink}>Kayıt Olun</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.lg,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
    marginBottom: SIZES.xs,
  },
  appSubtitle: {
    fontSize: SIZES.body,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.xl,
  },
  welcomeText: {
    fontSize: SIZES.h2,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  subtitleText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xl,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.md,
    ...SHADOWS.small,
  },
  inputIconContainer: {
    width: 40,
    alignItems: "center",
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
    position: "absolute",
    right: SIZES.md,
    padding: SIZES.xs,
  },
  loginButton: {
    borderRadius: SIZES.radiusMedium,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginGradient: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.sm,
  },
  loginButtonText: {
    fontSize: SIZES.h4,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
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
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
