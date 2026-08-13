import React, { useEffect, useState } from "react";
import {
  Button,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import ProgressBar from "@/components/ui/ProgressBar";
import SectionLabel from "@/components/ui/SectionLabel";

import { getAthlete } from "@/features/athletes";
import {
  getNote,
  saveNote as saveStoredNote,
} from "@/features/notes";

export default function AthleteProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const athlete = getAthlete(id);

  const [isWritingNote, setIsWritingNote] = useState(false);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [isLoadingNote, setIsLoadingNote] = useState(true);

  useEffect(() => {
    async function loadNote() {
      if (!id) return;

      try {
        const storedNote = await getNote(id);

        if (storedNote) {
          setSavedNote(storedNote.text);
        }
      } catch (error) {
        console.error("Kunde inte läsa coachnotering:", error);
      } finally {
        setIsLoadingNote(false);
      }
    }

    loadNote();
  }, [id]);

  if (!athlete) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Adept",
          }}
        />

        <Screen>
          <BodyText>Adepten kunde inte hittas.</BodyText>
        </Screen>
      </>
    );
  }

  const weeklyProgress = Math.min(
    (athlete.weeklyDistance / athlete.weeklyGoal) * 100,
    100
  );

  async function saveNote() {
    const trimmedNote = note.trim();

    if (!trimmedNote) return;

    try {
      await saveStoredNote(athlete.id, trimmedNote);

      setSavedNote(trimmedNote);
      setNote("");
      setIsWritingNote(false);
    } catch (error) {
      console.error("Kunde inte spara coachnotering:", error);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: athlete.name,
        }}
      />

      <Screen>
        <View style={styles.header}>
          <SectionLabel>ADEPT</SectionLabel>

          <Metric>{athlete.name}</Metric>

          <BodyText style={styles.status}>
            {getStatusIcon(athlete.status)} {athlete.statusText}
          </BodyText>
        </View>

        <Card>
          <SectionLabel>DAGENS STATUS</SectionLabel>

          <Metric>{athlete.score.toFixed(1)} / 10</Metric>

          <BodyText style={styles.message}>
            {athlete.message}
          </BodyText>
        </Card>

        <Card>
          <SectionLabel>VECKANS TRÄNING</SectionLabel>

          <Metric>
            {athlete.weeklyDistance} / {athlete.weeklyGoal} km
          </Metric>

          <ProgressBar value={weeklyProgress} />

          <BodyText style={styles.info}>
            {Math.max(
              athlete.weeklyGoal - athlete.weeklyDistance,
              0
            )}{" "}
            km kvar till veckans mål
          </BodyText>
        </Card>

        <Card>
          <SectionLabel>SENASTE PASS</SectionLabel>

          <BodyText style={styles.detail}>
            {athlete.lastRun}
          </BodyText>
        </Card>

        <Card>
          <SectionLabel>NÄSTA NYCKELPASS</SectionLabel>

          <BodyText style={styles.detail}>
            {athlete.nextKeySession}
          </BodyText>
        </Card>

        <Card>
          <SectionLabel>DAGENS PASS</SectionLabel>

          <Metric>{athlete.training}</Metric>
        </Card>

        <Card>
          <SectionLabel>COACHNOTERING</SectionLabel>

          {isLoadingNote ? (
            <BodyText style={styles.emptyNote}>
              Laddar notering...
            </BodyText>
          ) : savedNote ? (
            <BodyText style={styles.note}>
              {savedNote}
            </BodyText>
          ) : (
            <BodyText style={styles.emptyNote}>
              Ingen notering ännu.
            </BodyText>
          )}

          {isWritingNote ? (
            <>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Skriv en notering..."
                placeholderTextColor="#888"
                multiline
                style={styles.input}
              />

              <View style={styles.buttonRow}>
                <Button
                  title="Avbryt"
                  onPress={() => {
                    setNote("");
                    setIsWritingNote(false);
                  }}
                />

                <Button
                  title="Spara"
                  onPress={saveNote}
                />
              </View>
            </>
          ) : (
            <View style={styles.button}>
   <Button
  title={
    savedNote
      ? "✏️ Redigera coachnotering"
      : "✍️ Lägg till coachnotering"
  }
  onPress={() => {
    setNote(savedNote);
    setIsWritingNote(true);
  }}
/>
            </View>
          )}
        </Card>
      </Screen>
    </>
  );
}

function getStatusIcon(status: "green" | "yellow" | "red") {
  if (status === "green") return "🟢";
  if (status === "yellow") return "🟡";
  return "🔴";
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },

  status: {
    fontSize: 16,
    marginTop: 8,
    opacity: 0.8,
  },

  message: {
    marginTop: 12,
    lineHeight: 22,
    opacity: 0.75,
  },

  info: {
    marginTop: 12,
    opacity: 0.72,
  },

  detail: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 6,
  },

  note: {
    marginTop: 8,
    lineHeight: 22,
  },

  emptyNote: {
    marginTop: 8,
    opacity: 0.6,
  },

  input: {
    marginTop: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 12,
    color: "white",
    textAlignVertical: "top",
  },

  button: {
    marginTop: 16,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
});