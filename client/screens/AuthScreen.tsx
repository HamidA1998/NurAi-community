import React, { useCallback, useRef, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { AuthContext } from "@/context/AuthContext";
import {
  CrescentMark,
  GoldDivider,
} from "@/components/premium/svg/PremiumSvgs";

import logoImage from "../../assets/images/nurai-logo-refined.png";
import { AppIcon } from "@/components/icons";

const APPLE_SERVICE_ID = process.env.EXPO_PUBLIC_APPLE_SERVICE_ID || "";

const TERMS_URL = "https://eliteautomations.co.uk/nurai/terms";
const PRIVACY_URL = "https://eliteautomations.co.uk/nurai/privacy-policy";

const SCHOLAR_GOLD = "#C6A75E";
const GOLD_TINT_35 = "rgba(198, 167, 94, 0.35)";
const GOLD_TINT_55 = "rgba(198, 167, 94, 0.55)";

type AuthMode = "login" | "register";

type AuthRequestFailure = Error & {
  status?: number;
  code?: string;
};

function customerAuthError(error: unknown, mode: AuthMode): string {
  const failure = error as AuthRequestFailure | undefined;
  const status = failure?.status;
  const code = failure?.code;
  const message = failure?.message?.trim();

  if (status === 409 || code === "email_already_exists") {
    return "An account with this email already exists. Sign in instead.";
  }
  if (status === 401 || code === "invalid_credentials") {
    return "Invalid email, username, or password.";
  }
  if (status === 400) {
    return mode === "login"
      ? "Use your email address or NurAI username with your password."
      : message || "Check your name, email address, and password.";
  }
  if (status === 404) {
    return "The sign-in service is temporarily unavailable. Please try again shortly.";
  }
  if (message && status && status < 500) {
    return message;
  }
  return mode === "login"
    ? "We could not sign you in. Check your connection and try again."
    : "We could not create your account. Check your connection and try again.";
}

export default function AuthScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, register, loginWithApple } = useContext(AuthContext);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  // Belt-and-braces against a double-tap slipping through before `disabled`
  // re-renders — `loading` state updates are async, so a fast second tap in
  // the same event loop tick could otherwise fire a second request.
  const submitInFlightRef = useRef(false);

  const openTerms = () => {
    WebBrowser.openBrowserAsync(TERMS_URL);
  };

  const openPrivacy = () => {
    WebBrowser.openBrowserAsync(PRIVACY_URL);
  };

  const handleEmailAuth = useCallback(async () => {
    if (submitInFlightRef.current) return;
    Keyboard.dismiss();
    setError("");
    const rawIdentifier = email.trim();
    const loginIdentifier =
      mode === "login" && !rawIdentifier.includes("@")
        ? rawIdentifier.toLowerCase().replace(/^@+/, "")
        : rawIdentifier.toLowerCase();

    if (!rawIdentifier || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    submitInFlightRef.current = true;
    setLoading(true);
    try {
      if (mode === "login") {
        await login(loginIdentifier, password);
      } else {
        await register(
          rawIdentifier.toLowerCase(),
          password,
          displayName.trim() || rawIdentifier.split("@")[0],
        );
      }
    } catch (err: unknown) {
      setError(customerAuthError(err, mode));
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  }, [displayName, email, login, mode, password, register]);

  const handleAppleSignIn = async () => {
    if (Platform.OS === "ios") {
      try {
        setError("");
        setLoading(true);
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (credential.identityToken) {
          await loginWithApple(
            credential.identityToken,
            credential.fullName
              ? {
                  givenName: credential.fullName.givenName || undefined,
                  familyName: credential.fullName.familyName || undefined,
                }
              : undefined,
            credential.email || undefined,
          );
        }
      } catch (err: any) {
        if (err?.code !== "ERR_REQUEST_CANCELED") {
          setError("Apple sign-in failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setError("");
        setLoading(true);

        const redirectUri = AuthSession.makeRedirectUri({
          preferLocalhost: true,
        });
        const discovery = {
          authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
          tokenEndpoint: "https://appleid.apple.com/auth/token",
        };

        const serviceId = APPLE_SERVICE_ID;
        if (!serviceId) {
          setError(
            "Apple sign-in is unavailable right now. Please use email or try again later.",
          );
          setLoading(false);
          return;
        }

        const authRequest = new AuthSession.AuthRequest({
          clientId: serviceId,
          redirectUri,
          scopes: ["name", "email"],
          responseType: AuthSession.ResponseType.Code,
          usePKCE: false,
          extraParams: {
            response_mode: "form_post",
          },
        });

        const result = await authRequest.promptAsync(discovery);

        if (result.type === "success" && result.params?.id_token) {
          await loginWithApple(result.params.id_token);
        } else if (result.type === "success" && result.params?.code) {
          await loginWithApple(result.params.code);
        } else if (result.type === "error") {
          setError("Apple sign-in failed. Please try again.");
        }
      } catch (err: any) {
        if (err?.code !== "ERR_REQUEST_CANCELED") {
          setError("Apple sign-in failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <LinearGradient
      colors={
        isDark
          ? [theme.backgroundRoot, theme.backgroundDefault]
          : ["#0F172A", "#1E293B"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.header}
          >
            <View style={styles.brandRow}>
              <View style={styles.logoGlow}>
                <Image
                  source={logoImage}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandCopy}>
                <Text
                  style={[
                    styles.appName,
                    {
                      fontFamily:
                        Fonts?.serifBold || "LibreBaskerville_700Bold",
                    },
                  ]}
                >
                  NurAI
                </Text>
                <Text
                  style={[
                    styles.tagline,
                    {
                      fontFamily:
                        Fonts?.sansMedium || "PlusJakartaSans_500Medium",
                    },
                  ]}
                >
                  Personal Islamic Intelligence
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.heroTitle,
                { fontFamily: Fonts?.serifBold || "LibreBaskerville_700Bold" },
              ]}
            >
              Your deen, organized around today.
            </Text>
            <Text
              style={[
                styles.heroCopy,
                { fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular" },
              ]}
            >
              Quran, salah, dhikr, family, and progress in one private daily
              rhythm.
            </Text>
            <View style={styles.trustPillRow}>
              <View style={styles.trustPill}>
                <AppIcon name="shield" size={13} color={theme.primary} />
                <Text style={styles.trustPillText}>Private</Text>
              </View>
              <View style={styles.trustPill}>
                <CrescentMark
                  size={14}
                  color={theme.scholar}
                  accentColor={theme.primary}
                />
                <Text style={styles.trustPillText}>Source-aware</Text>
              </View>
              <View style={styles.trustPill}>
                <AppIcon name="activity" size={13} color={theme.primary} />
                <Text style={styles.trustPillText}>Progress</Text>
              </View>
            </View>
          </Animated.View>

          {/* Deliberately NOT animated: Reanimated entering animations on the
              New Architecture can leave a mounted view with broken touch
              hit-testing in rare cases, which would make every control in
              this card (tabs, inputs, submit) silently dead — the exact
              reported sign-in symptom. The sign-in form must be the most
              boring, reliable view in the app. */}
          <View style={styles.glassCard}>
            <View style={styles.cardIntro}>
              <Text style={styles.cardEyebrow}>
                {mode === "login" ? "Welcome back" : "Begin with intention"}
              </Text>
              <Text style={styles.cardTitle}>
                {mode === "login"
                  ? "Sign in to continue your Quran, prayer, dhikr, and family rhythm."
                  : "Create a private space for worship, learning, and daily growth."}
              </Text>
            </View>
            <GoldDivider color={theme.scholar} opacity={0.5} />

            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab]}
                onPress={() => {
                  setMode("login");
                  setError("");
                }}
                testID="tab-login"
                accessible
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                accessibilityHint="Shows the sign in form"
                accessibilityState={{ selected: mode === "login" }}
              >
                {mode === "login" ? (
                  <LinearGradient
                    colors={["#56B394", "#56B394"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabGradient}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        styles.tabTextActive,
                        {
                          fontFamily:
                            Fonts?.sansSemiBold ||
                            "PlusJakartaSans_600SemiBold",
                        },
                      ]}
                    >
                      Sign In
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInactive}>
                    <Text
                      style={[
                        styles.tabText,
                        styles.tabTextInactive,
                        {
                          fontFamily:
                            Fonts?.sansSemiBold ||
                            "PlusJakartaSans_600SemiBold",
                        },
                      ]}
                    >
                      Sign In
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                style={[styles.tab]}
                onPress={() => {
                  setMode("register");
                  setError("");
                }}
                testID="tab-register"
                accessible
                accessibilityRole="button"
                accessibilityLabel="Create account"
                accessibilityHint="Shows the new account form"
                accessibilityState={{ selected: mode === "register" }}
              >
                {mode === "register" ? (
                  <LinearGradient
                    colors={["#56B394", "#56B394"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabGradient}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        styles.tabTextActive,
                        {
                          fontFamily:
                            Fonts?.sansSemiBold ||
                            "PlusJakartaSans_600SemiBold",
                        },
                      ]}
                    >
                      Create Account
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInactive}>
                    <Text
                      style={[
                        styles.tabText,
                        styles.tabTextInactive,
                        {
                          fontFamily:
                            Fonts?.sansSemiBold ||
                            "PlusJakartaSans_600SemiBold",
                        },
                      ]}
                    >
                      Create Account
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {error.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={styles.errorBox}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <AppIcon name="alert-circle" size={16} color="#D9827C" />
                <Text
                  style={[
                    styles.errorText,
                    { fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular" },
                  ]}
                >
                  {error}
                </Text>
              </Animated.View>
            ) : null}

            {mode === "register" ? (
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    {
                      fontFamily:
                        Fonts?.sansMedium || "PlusJakartaSans_500Medium",
                    },
                  ]}
                >
                  Name
                </Text>
                <View
                  onTouchStart={() => nameInputRef.current?.focus()}
                  style={[
                    styles.inputWrapper,
                    focusedInput === "name" ? styles.inputWrapperFocused : null,
                  ]}
                >
                  <AppIcon
                    name="user"
                    size={18}
                    color={GOLD_TINT_35}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={nameInputRef}
                    style={[
                      styles.input,
                      {
                        fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular",
                      },
                    ]}
                    placeholder="Display name"
                    placeholderTextColor={GOLD_TINT_35}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    blurOnSubmit={false}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    testID="input-name"
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    fontFamily:
                      Fonts?.sansMedium || "PlusJakartaSans_500Medium",
                  },
                ]}
              >
                {mode === "login" ? "Email or username" : "Email"}
              </Text>
              <View
                onTouchStart={() => emailInputRef.current?.focus()}
                style={[
                  styles.inputWrapper,
                  focusedInput === "email" ? styles.inputWrapperFocused : null,
                ]}
              >
                <AppIcon
                  name={mode === "login" ? "user" : "mail"}
                  size={18}
                  color={GOLD_TINT_35}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailInputRef}
                  style={[
                    styles.input,
                    { fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular" },
                  ]}
                  placeholder={
                    mode === "login" ? "Email or username" : "Email address"
                  }
                  placeholderTextColor={GOLD_TINT_35}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={mode === "login" ? "default" : "email-address"}
                  autoComplete={mode === "login" ? "username" : "email"}
                  textContentType={
                    mode === "login" ? "username" : "emailAddress"
                  }
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  testID="input-email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    fontFamily:
                      Fonts?.sansMedium || "PlusJakartaSans_500Medium",
                  },
                ]}
              >
                Password
              </Text>
              <View
                onTouchStart={() => passwordInputRef.current?.focus()}
                style={[
                  styles.inputWrapper,
                  focusedInput === "password"
                    ? styles.inputWrapperFocused
                    : null,
                ]}
              >
                <AppIcon
                  name="lock"
                  size={18}
                  color={GOLD_TINT_35}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordInputRef}
                  style={[
                    styles.input,
                    {
                      fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular",
                      flex: 1,
                    },
                  ]}
                  placeholder={
                    mode === "register" ? "Min 6 characters" : "Enter password"
                  }
                  placeholderTextColor={GOLD_TINT_35}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  textContentType={
                    mode === "login" ? "password" : "newPassword"
                  }
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (!loading) handleEmailAuth();
                  }}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  testID="input-password"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  testID="button-toggle-password"
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <AppIcon
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={GOLD_TINT_35}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleEmailAuth}
              disabled={loading}
              testID="button-submit-auth"
              accessibilityRole="button"
              accessibilityLabel={
                mode === "login" ? "Continue sign in" : "Create account"
              }
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              <LinearGradient
                colors={["#56B394", "#56B394"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.primaryBtnText,
                      {
                        fontFamily:
                          Fonts?.sansSemiBold || "PlusJakartaSans_600SemiBold",
                      },
                    ]}
                  >
                    {mode === "login" ? "Continue" : "Create Account"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.authHintRow}>
              <AppIcon name="info" size={14} color={theme.primary} />
              <Text style={styles.authHintText}>
                {mode === "login"
                  ? "You can sign in with either your email address or NurAI username."
                  : "Your username is created from your name and can be changed later."}
              </Text>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text
                style={[
                  styles.dividerText,
                  { fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular" },
                ]}
              >
                or continue with
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              {Platform.OS === "ios" ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  }
                  cornerRadius={14}
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                />
              ) : (
                <Pressable
                  style={styles.socialBtn}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                  testID="button-apple-signin"
                >
                  <AppIcon name="command" size={18} color={theme.buttonText} />
                  <Text
                    style={[
                      styles.socialBtnText,
                      {
                        fontFamily:
                          Fonts?.sansMedium || "PlusJakartaSans_500Medium",
                      },
                    ]}
                  >
                    Sign in with Apple
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <Animated.View
            entering={FadeInUp.duration(600).delay(300)}
            style={styles.footer}
          >
            <Text
              style={[
                styles.footerText,
                { fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular" },
              ]}
            >
              By continuing, you agree to our{" "}
              <Text
                style={styles.footerLink}
                onPress={openTerms}
                testID="link-terms"
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                style={styles.footerLink}
                onPress={openPrivacy}
                testID="link-privacy"
              >
                Privacy Policy
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  header: {
    alignItems: "stretch",
    marginBottom: 16,
  },
  brandRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  logoGlow: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(86,179,148, 0.24)",
    backgroundColor: "rgba(7, 18, 31, 0.72)",
    shadowColor: SCHOLAR_GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
    overflow: "hidden",
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  brandCopy: {
    flex: 1,
  },
  appName: {
    fontSize: 26,
    marginBottom: 4,
    color: "#FFFFFF",
    letterSpacing: 0,
  },
  tagline: {
    fontSize: 13,
    color: "rgba(169,187,199,0.86)",
  },
  heroTitle: {
    color: "#F8FBFF",
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: 0,
  },
  heroCopy: {
    color: "rgba(169,187,199,0.84)",
    fontSize: 15,
    lineHeight: 21,
    marginTop: Spacing.sm,
  },
  trustPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(86,179,148, 0.18)",
    backgroundColor: "rgba(7, 18, 31, 0.68)",
    paddingHorizontal: Spacing.md,
  },
  trustPillText: {
    color: "rgba(248,251,255,0.78)",
    fontFamily: Fonts?.sansSemiBold || "PlusJakartaSans_600SemiBold",
    fontSize: 12,
  },
  glassCard: {
    backgroundColor: "rgba(7, 18, 31, 0.82)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(86,179,148, 0.16)",
    padding: 18,
    gap: 13,
    overflow: "hidden",
    shadowColor: "#56B394",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 8,
  },
  cardIntro: {
    gap: 6,
  },
  cardEyebrow: {
    color: "#56B394",
    fontFamily: Fonts?.sansBold || "PlusJakartaSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: Fonts?.sansSemiBold || "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
  },
  tabRow: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.xs,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  tab: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  tabGradient: {
    minHeight: 44,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
  },
  tabInactive: {
    minHeight: 44,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
  },
  tabText: {
    fontSize: 15,
  },
  tabTextActive: {
    color: "#031018",
  },
  tabTextInactive: {
    color: "rgba(255, 255, 255, 0.45)",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    backgroundColor: "rgba(217, 130, 124, 0.12)",
    borderColor: "rgba(217, 130, 124, 0.25)",
  },
  errorText: {
    color: "#D9827C",
    fontSize: 14,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    marginLeft: 4,
    color: "rgba(169,187,199,0.82)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    height: 54,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(5, 7, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(169,187,199,0.16)",
  },
  inputWrapperFocused: {
    borderWidth: 1.5,
    borderColor: "#56B394",
    shadowColor: "#56B394",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
    color: "#FFFFFF",
  },
  eyeBtn: {
    padding: Spacing.xs,
  },
  primaryBtn: {
    marginTop: 4,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#56B394",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  primaryBtnText: {
    color: "#06110C",
    fontSize: 16,
  },
  authHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 18,
    backgroundColor: "rgba(86,179,148, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(86,179,148, 0.18)",
  },
  authHintText: {
    flex: 1,
    color: "rgba(255,255,255,0.58)",
    fontFamily: Fonts?.sans || "PlusJakartaSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(169,187,199,0.14)",
  },
  dividerText: {
    fontSize: 13,
    color: "rgba(169,187,199,0.58)",
  },
  socialButtons: {
    gap: Spacing.md,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.md,
    backgroundColor: "rgba(5, 7, 18, 0.64)",
    borderColor: "rgba(169,187,199,0.18)",
  },
  socialBtnText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  appleBtn: {
    height: 52,
    width: "100%",
  },
  footer: {
    marginTop: 18,
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    color: GOLD_TINT_55,
  },
  footerLink: {
    textDecorationLine: "underline",
    color: SCHOLAR_GOLD,
  },
});
