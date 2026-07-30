import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth";
import { OtpInput } from "@/components/ui/otp-input";

type Step = "email" | "code" | "password";

export default function ForgotPassword() {
  const { setRecovering } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Sécurité : si l'écran est quitté en pleine récupération (session ouverte mais
  // mot de passe pas encore défini), on relâche le flag pour ne pas bloquer le routing.
  useEffect(() => {
    return () => setRecovering(false);
  }, [setRecovering]);

  // Étape 1 — envoi du code de réinitialisation par email.
  async function sendCode() {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    // Message neutre : on passe à l'étape code quoi qu'il arrive (anti-énumération).
    if (error && error.status && error.status >= 500) {
      Alert.alert("Erreur", "Une erreur est survenue. Réessayez plus tard.");
      return;
    }
    setCode("");
    setStep("code");
  }

  // Étape 2 — vérification auto du code (ouvre une session de récupération).
  // `recovering` empêche le layout de router l'utilisateur dans l'app avant l'étape 3.
  async function verifyCode(fullCode: string) {
    if (loading || fullCode.length < 6) return;
    setLoading(true);
    setRecovering(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: fullCode,
      type: "recovery",
    });
    setLoading(false);
    if (error) {
      setRecovering(false);
      setCode("");
      Alert.alert("Code invalide", "Ce code est invalide ou a expiré.");
      return;
    }
    setStep("password");
  }

  // Étape 3 — définition du nouveau mot de passe, puis on relâche le flag :
  // le layout route alors l'utilisateur dans l'app.
  async function resetPassword() {
    if (password.length < 8) {
      Alert.alert(
        "Mot de passe trop court",
        "Choisissez un mot de passe d'au moins 8 caractères.",
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      Alert.alert("Erreur", error.message);
      return;
    }
    setRecovering(false);
  }

  function goBack() {
    if (step === "code") {
      setStep("email");
    } else {
      router.back();
    }
  }

  const fieldClass =
    "w-full rounded-xl px-4 py-3.5 text-body font-sans text-foreground bg-white border-hairline border-border";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-7 pt-13 max-w-sm mx-auto w-full">
          <Pressable onPress={goBack} hitSlop={8} className="mb-6 self-start">
            <Text className="font-sans-medium text-action text-muted-foreground">
              ← Retour
            </Text>
          </Pressable>

          <Text className="mb-2 font-display text-display-sm leading-none tracking-tighter text-foreground">
            Mot de passe oublié
          </Text>

          {step === "email" && (
            <>
              <Text className="mb-10 font-sans text-body-sm text-muted-foreground">
                Entrez votre email : nous vous enverrons un code de
                réinitialisation.
              </Text>
              <View className="gap-4">
                <View>
                  <Text className="mb-2 font-sans-medium text-caption uppercase tracking-label text-muted-foreground">
                    E-mail
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="vous@exemple.com"
                    placeholderTextColor="rgba(138,127,114,0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={fieldClass}
                  />
                </View>
                <Pressable
                  onPress={sendCode}
                  disabled={loading}
                  className="mt-2 w-full items-center justify-center rounded-full bg-foreground py-4 active:opacity-90 disabled:opacity-60"
                >
                  <Text className="font-sans-medium text-body tracking-cta text-background">
                    {loading ? "Envoi…" : "Envoyer le code"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {step === "code" && (
            <>
              <Text className="mb-10 font-sans text-body-sm text-muted-foreground">
                Entrez le code à 6 chiffres.
              </Text>
              <View className="gap-4">
                <Text className="font-sans-medium text-caption uppercase tracking-label text-muted-foreground">
                  Code de vérification
                </Text>
                <OtpInput
                  value={code}
                  onChange={setCode}
                  onComplete={verifyCode}
                  autoFocus
                  editable={!loading}
                />
                <Text className="text-center font-sans text-body-sm text-muted-foreground">
                  {loading && "Vérification…"}
                </Text>
              </View>
            </>
          )}

          {step === "password" && (
            <>
              <Text className="mb-10 font-sans text-body-sm text-muted-foreground">
                Code vérifié. Choisissez votre nouveau mot de passe.
              </Text>
              <View className="gap-4">
                <View>
                  <Text className="mb-2 font-sans-medium text-caption uppercase tracking-label text-muted-foreground">
                    Nouveau mot de passe
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(138,127,114,0.5)"
                    secureTextEntry
                    autoCapitalize="none"
                    autoFocus
                    className={fieldClass}
                  />
                </View>
                <Pressable
                  onPress={resetPassword}
                  disabled={loading}
                  className="mt-2 w-full items-center justify-center rounded-full bg-foreground py-4 active:opacity-90 disabled:opacity-60"
                >
                  <Text className="font-sans-medium text-body tracking-cta text-background">
                    {loading ? "Validation…" : "Réinitialiser"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
