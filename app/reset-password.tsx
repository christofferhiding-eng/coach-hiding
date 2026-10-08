import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
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
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleUpdatePassword() {
    setError(null);
    setMessage(null);
    if (password.length < 6) { setError("Lösenordet måste vara minst 6 tecken."); return; }
    if (password !== confirmPassword) { setError("Lösenorden matchar inte."); return; }
    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message || "Kunde inte uppdatera lösenordet."); return; }
      setMessage("Lösenordet är uppdaterat. Du kan nu logga in med ditt nya lösenord.");
      setPassword("");
      setConfirmPassword("");
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Lösenordsuppdatering misslyckades:", e);
      setError("Något gick fel när lösenordet skulle uppdateras.");
    } finally { setLoading(false); }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <SectionLabel>COACH HIDING</SectionLabel>
        <Metric>Nytt lösenord</Metric>
        <BodyText style={styles.intro}>Välj ett nytt lösenord för ditt konto.</BodyText>
        <View style={styles.form}>
          <BodyText style={styles.label}>Nytt lösenord</BodyText>
          <TextInput value={password} onChangeText={setPassword} placeholder="Nytt lösenord" placeholderTextColor="#8A8A8A" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" style={styles.input} editable={!loading} />
          <BodyText style={styles.label}>Bekräfta lösenord</BodyText>
          <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Skriv lösenordet igen" placeholderTextColor="#8A8A8A" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" style={styles.input} editable={!loading} />
          {error && <BodyText style={styles.error}>{error}</BodyText>}
          {message && <BodyText style={styles.message}>{message}</BodyText>}
          <Pressable onPress={handleUpdatePassword} disabled={loading || !ready} style={[styles.button, (loading || !ready) && styles.buttonDisabled]}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <BodyText style={styles.buttonText}>Spara nytt lösenord</BodyText>}
          </Pressable>
          {message && <Pressable onPress={() => router.replace("/login")} style={styles.backButton}><BodyText style={styles.backButtonText}>Tillbaka till inloggningen</BodyText></Pressable>}
          {!ready && !message && <BodyText style={styles.info}>Öppna sidan via länken i mejlet för att välja ett nytt lösenord.</BodyText>}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 480, alignSelf: "center", paddingTop: 40 },
  intro: { marginTop: 10, color: Colors.textSecondary, lineHeight: 22 },
  form: { marginTop: 32 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: "600", color: Colors.text },
  input: { width: "100%", height: 52, paddingHorizontal: 16, marginBottom: 20, borderRadius: Radius.card, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D5D5D5", color: "#111111", fontSize: 16 },
  error: { marginBottom: 16, color: "#C0392B", fontSize: 14 },
  message: { marginBottom: 16, color: Colors.primary, fontSize: 14, lineHeight: 20 },
  info: { marginTop: 16, color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  button: { height: 52, borderRadius: Radius.card, alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  backButton: { alignItems: "center", justifyContent: "center", paddingVertical: 16, marginTop: Spacing.sm },
  backButtonText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
});
