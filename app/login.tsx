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

import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError(
        "Fyll i e-post och lösenord."
      );
      return;
    }

    try {
      setLoading(true);

      const { error } =
        await supabase.auth.signInWithPassword(
          {
            email: email.trim(),
            password,
          }
        );

      if (error) {
        setError(error.message);
        return;
      }

      router.replace("/");
    } catch (error) {
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

    if (!email || !password) {
      setError(
        "Fyll i e-post och lösenord."
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

      router.replace("/");
    } catch (error) {
      setError(
        "Något gick fel när kontot skulle skapas."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
      <SectionLabel>
  COACH HIDING
</SectionLabel>

        <Metric>
          Logga in
        </Metric>

        <BodyText
          style={styles.intro}
        >
          Logga in för att se din
          träningsplan.
        </BodyText>

        <View style={styles.form}>
          <BodyText
            style={styles.label}
          >
            E-post
          </BodyText>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="din@email.se"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            style={styles.input}
          />

          <BodyText
            style={styles.label}
          >
            Lösenord
          </BodyText>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Lösenord"
            placeholderTextColor="rgba(255,255,255,0.35)"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          {error && (
            <BodyText
              style={styles.error}
            >
              {error}
            </BodyText>
          )}

          {message && (
            <BodyText
              style={styles.message}
            >
              {message}
            </BodyText>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={[
              styles.primaryButton,
              loading &&
                styles.disabledButton,
            ]}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <BodyText
                style={
                  styles.primaryText
                }
              >
                Logga in
              </BodyText>
            )}
          </Pressable>

          <Pressable
            onPress={handleSignup}
            disabled={loading}
            style={
              styles.secondaryButton
            }
          >
            <BodyText
              style={
                styles.secondaryText
              }
            >
              Skapa testkonto
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
    maxWidth: 430,
    alignSelf: "center",
    paddingTop: 30,
  },

  intro: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.6,
  },

  form: {
    marginTop: 28,
  },

  label: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.65,
  },

  input: {
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderRadius: 9,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.12)",
    backgroundColor:
      "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 15,
  },

  error: {
    marginBottom: 12,
    color: "#ff7b7b",
    fontSize: 13,
    lineHeight: 19,
  },

  message: {
    marginBottom: 12,
    color: "#6ee7a5",
    fontSize: 13,
    lineHeight: 19,
  },

  primaryButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor:
      "rgba(80,200,140,0.9)",
  },

  disabledButton: {
    opacity: 0.5,
  },

  primaryText: {
    fontSize: 14,
    fontWeight: "800",
  },

  secondaryButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderRadius: 9,
    backgroundColor:
      "rgba(255,255,255,0.07)",
  },

  secondaryText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.75,
  },
});