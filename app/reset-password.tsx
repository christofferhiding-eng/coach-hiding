import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import Screen from "@/components/ui/Screen";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";
import { Colors, Radius, Spacing } from "@/constants/design";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initialiseRecovery() {
      setError(null);

      try {
        // På web kan Supabase skicka tillbaka en PKCE-kod
        // som måste bytas mot en session.
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          const code = url.searchParams.get("code");

          if (code) {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              console.error(
                "Kunde inte byta auth-kod mot session:",
                exchangeError
              );

              if (mounted) {
                setError(
                  "Länken för lösenordsåterställning är ogiltig eller har gått ut. Begär en ny länk."
                );
              }

              return;
            }

            // Ta bort ?code=... från adressfältet efter lyckad
            // inloggning så att koden inte kan användas igen.
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        }

        // Kontrollera att vi nu har en session.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setReady(!!session);

          if (!session) {
            setError(
              "Länken kunde inte verifieras. Begär en ny länk för att återställa lösenordet."
            );
          }
        }
      } catch (initialiseError) {
        console.error(
          "Kunde inte initiera lösenordsåterställningen:",
          initialiseError
        );

        if (mounted) {
          setError(
            "Något gick fel när återställningslänken skulle öppnas."
          );
        }
      }
    }

    initialiseRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword() {
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        console.error(
          "Kunde inte uppdatera lösenordet:",
          updateError
        );

        setError(
          updateError.message ||
            "Kunde inte uppdatera lösenordet."
        );

        return;
      }

      setMessage(
        "Lösenordet är uppdaterat. Du kan nu logga in med ditt nya lösenord."
      );

      setPassword("");
      setConfirmPassword("");

      await supabase.auth.signOut();
    } catch (updateError) {
      console.error(
        "Lösenordsuppdatering misslyckades:",
        updateError
      );

      setError(
        "Något gick fel när lösenordet skulle uppdateras."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <SectionLabel>COACH HIDING</SectionLabel>

        <Metric>Nytt lösenord</Metric>

        <BodyText style={styles.intro}>
          Välj ett nytt lösenord för ditt konto.
        </BodyText>

        <View style={styles.form}>
          <BodyText style={styles.label}>
            Nytt lösenord
          </BodyText>

          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Nytt lösenord"
              placeholderTextColor="#8A8A8A"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              style={styles.passwordInput}
              editable={!loading}
            />

            <Pressable
              onPress={() =>
                setShowPassword((current) => !current)
              }
              disabled={loading}
              style={styles.visibilityButton}
            >
              <BodyText style={styles.visibilityText}>
                {showPassword ? "Dölj" : "Visa"}
              </BodyText>
            </Pressable>
          </View>

          <BodyText style={styles.label}>
            Bekräfta lösenord
          </BodyText>

          <View style={styles.passwordRow}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Skriv lösenordet igen"
              placeholderTextColor="#8A8A8A"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              style={styles.passwordInput}
              editable={!loading}
            />

            <Pressable
              onPress={() =>
                setShowConfirmPassword((current) => !current)
              }
              disabled={loading}
              style={styles.visibilityButton}
            >
              <BodyText style={styles.visibilityText}>
                {showConfirmPassword ? "Dölj" : "Visa"}
              </BodyText>
            </Pressable>
          </View>

          {error && (
            <BodyText style={styles.error}>
              {error}
            </BodyText>
          )}

          {message && (
            <BodyText style={styles.message}>
              {message}
            </BodyText>
          )}

          <Pressable
            onPress={handleUpdatePassword}
            disabled={loading || !ready || !!message}
            style={[
              styles.button,
              (loading || !ready || !!message) &&
                styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <BodyText style={styles.buttonText}>
                Spara nytt lösenord
              </BodyText>
            )}
          </Pressable>

          {message && (
            <Pressable
              onPress={() => router.replace("/login")}
              style={styles.backButton}
            >
              <BodyText style={styles.backButtonText}>
                Tillbaka till inloggningen
              </BodyText>
            </Pressable>
          )}

          {!ready && !message && !error && (
            <BodyText style={styles.info}>
              Verifierar återställningslänken...
            </BodyText>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingTop: 40,
  },

  intro: {
    marginTop: 10,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  form: {
    marginTop: 32,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },

  passwordRow: {
    width: "100%",
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderRadius: Radius.card,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5D5D5",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    color: "#111111",
    fontSize: 16,
    outlineStyle: "none",
  } as any,

  visibilityButton: {
    paddingHorizontal: 16,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  visibilityText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  error: {
    marginBottom: 16,
    color: "#C0392B",
    fontSize: 14,
    lineHeight: 20,
  },

  message: {
    marginBottom: 16,
    color: Colors.primary,
    fontSize: 14,
    lineHeight: 20,
  },

  info: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  button: {
    height: 52,
    borderRadius: Radius.card,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    marginTop: 4,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  backButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: Spacing.sm,
  },

  backButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});