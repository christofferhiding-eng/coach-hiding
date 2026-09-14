import React, { useState } from "react";

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

export default function LoginScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("Fyll i e-post och lösenord.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: authData,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      const user = authData.user;

      if (!user) {
        setError("Kunde inte hitta den inloggade användaren.");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, name, role, athlete_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(
          "Kunde inte läsa användarprofil:",
          profileError
        );

        setError(
          "Ditt konto kunde inte kopplas till en profil."
        );

        await supabase.auth.signOut();
        return;
      }

      if (!profile) {
        setError("Ingen användarprofil hittades.");
        await supabase.auth.signOut();
        return;
      }

      if (profile.role === "coach") {
        router.replace("/coach");
        return;
      }

      if (profile.role === "athlete") {
        if (!profile.athlete_id) {
          setError(
            "Ditt konto är inte kopplat till någon adept."
          );

          await supabase.auth.signOut();
          return;
        }

        router.replace(
          `/athlete/${profile.athlete_id}`
        );

        return;
      }

      setError(
        "Ditt konto har ingen giltig användarroll."
      );

      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Inloggningsfel:",
        error
      );

      setError(
        "Något gick fel vid inloggningen."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    setError(null);
    setMessage(null);

    if (!name.trim() || !email || !password) {
      setError(
        "Fyll i namn, e-post och lösenord."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Lösenordet måste vara minst 6 tecken."
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.session) {
        setMessage(
          "Kontot är skapat. Kontrollera din e-post och bekräfta adressen innan du loggar in."
        );
        return;
      }

      setMessage(
        "Kontot är skapat. Du kan nu logga in."
      );

      setName("");
      setEmail("");
      setPassword("");
      setIsSignup(false);
    } catch (error) {
      console.error(
        "Signup-fel:",
        error
      );

      setError(
        "Något gick fel när kontot skulle skapas."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSignupToggle() {
    setError(null);
    setMessage(null);
    setIsSignup((current) => !current);
  }

  return (
    <Screen>
      <View style={styles.container}>
        <SectionLabel>
          COACH HIDING
        </SectionLabel>

        <Metric>
          {isSignup
            ? "Skapa konto"
            : "Logga in"}
        </Metric>

        <BodyText style={styles.intro}>
          {isSignup
            ? "Skapa ditt konto för att komma igång med din träningsplan."
            : "Logga in för att se din träningsplan."}
        </BodyText>

        <View style={styles.form}>
          {isSignup && (
            <>
              <BodyText style={styles.label}>
                Namn
              </BodyText>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ditt namn"
                placeholderTextColor="#8A8A8A"
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.input}
              />
            </>
          )}

          <BodyText style={styles.label}>
            E-post
          </BodyText>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="din@email.se"
            placeholderTextColor="#8A8A8A"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            style={styles.input}
          />

          <BodyText style={styles.label}>
            Lösenord
          </BodyText>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Lösenord"
            placeholderTextColor="#8A8A8A"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

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
            onPress={
              isSignup
                ? handleSignup
                : handleLogin
            }
            disabled={loading}
            style={[
              styles.loginButton,
              loading &&
                styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <BodyText
                style={styles.loginButtonText}
              >
                {isSignup
                  ? "Skapa konto"
                  : "Logga in"}
              </BodyText>
            )}
          </Pressable>

          <Pressable
            onPress={handleSignupToggle}
            disabled={loading}
            style={styles.signupButton}
          >
            <BodyText
              style={styles.signupButtonText}
            >
              {isSignup
                ? "Jag har redan ett konto"
                : "Skapa konto"}
            </BodyText>
          </Pressable>
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

  input: {
    width: "100%",
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderRadius: Radius.card,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5D5D5",
    color: "#111111",
    fontSize: 16,
  },

  error: {
    marginBottom: 16,
    color: "#C0392B",
    fontSize: 14,
  },

  message: {
    marginBottom: 16,
    color: Colors.primary,
    fontSize: 14,
    lineHeight: 20,
  },

  loginButton: {
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

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  signupButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: Spacing.sm,
  },

  signupButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});