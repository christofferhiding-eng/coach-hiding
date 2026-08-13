import React, { useEffect, useState } from "react";
import {
  Button,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import {
  trainingWeeks,
  TrainingSession,
} from "@/features/training-plan";

import {
  isSessionCompleted,
  setSessionCompleted,
} from "@/features/training-completion";

import {
  getFeedback,
  saveFeedback,
} from "@/features/training-feedback";

export default function TrainingSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const session = findSession(id);

  const [completed, setCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [rpe, setRpe] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  useEffect(() => {
    async function loadSessionData() {
      if (!id) return;

      try {
        const savedCompletion = await isSessionCompleted(id);
        setCompleted(savedCompletion);

        const savedFeedback = await getFeedback(id);

        if (savedFeedback) {
          setRpe(savedFeedback.rpe);
          setComment(savedFeedback.comment);
          setFeedbackSaved(true);
        }
      } catch (error) {
        console.error(
          "Kunde inte läsa passdata:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadSessionData();
  }, [id]);

  if (!session) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Pass",
          }}
        />

        <Screen>
          <BodyText>Passet kunde inte hittas.</BodyText>
        </Screen>
      </>
    );
  }

  async function handleCompletion() {
    try {
      const newCompletedState = !completed;

      await setSessionCompleted(
        session.id,
        newCompletedState
      );

      setCompleted(newCompletedState);
    } catch (error) {
      console.error(
        "Kunde inte spara passets status:",
        error
      );
    }
  }

  async function handleSaveFeedback() {
    if (rpe === null) return;

    try {
      await saveFeedback(
        session.id,
        rpe,
        comment.trim()
      );

      setFeedbackSaved(true);
    } catch (error) {
      console.error(
        "Kunde inte spara återrapporteringen:",
        error
      );
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: session.title,
        }}
      />

      <Screen>
        <View style={styles.header}>
          <SectionLabel>
            {session.day.toUpperCase()}
          </SectionLabel>

          <Metric>{session.title}</Metric>
        </View>

        <Card>
          <SectionLabel>DATUM</SectionLabel>

          <BodyText style={styles.text}>
            {formatFullDate(session.date)}
          </BodyText>
        </Card>

        <Card>
          <SectionLabel>PASS</SectionLabel>

          <BodyText style={styles.text}>
            {session.description}
          </BodyText>
        </Card>

        <Card>
          <SectionLabel>STATUS</SectionLabel>

          {isLoading ? (
            <BodyText style={styles.text}>
              Laddar...
            </BodyText>
          ) : (
            <>
              <BodyText style={styles.status}>
                {completed
                  ? "✅ Passet är genomfört"
                  : "⬜ Passet är inte genomfört"}
              </BodyText>

              <View style={styles.button}>
                <Button
                  title={
                    completed
                      ? "Markera som ej genomfört"
                      : "✓ Markera som genomfört"
                  }
                  onPress={handleCompletion}
                />
              </View>
            </>
          )}
        </Card>

        <Card>
          <SectionLabel>ÅTERRAPPORTERING</SectionLabel>

          <BodyText style={styles.question}>
            Hur ansträngande var passet?
          </BodyText>

          <BodyText style={styles.scaleHint}>
            Borg RPE 6–20
          </BodyText>

          <View style={styles.rpeGrid}>
            {Array.from(
              { length: 15 },
              (_, index) => index + 6
            ).map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  setRpe(value);
                  setFeedbackSaved(false);
                }}
                style={[
                  styles.rpeButton,
                  rpe === value &&
                    styles.rpeButtonSelected,
                ]}
              >
                <BodyText
                  style={[
                    styles.rpeText,
                    rpe === value &&
                      styles.rpeTextSelected,
                  ]}
                >
                  {value}
                </BodyText>
              </Pressable>
            ))}
          </View>

          <BodyText style={styles.scaleDescription}>
            6 = ingen ansträngning · 20 = maximal
            ansträngning
          </BodyText>

          <TextInput
            value={comment}
            onChangeText={(value) => {
              setComment(value);
              setFeedbackSaved(false);
            }}
            placeholder="Kommentar till coachen (valfritt)"
            placeholderTextColor="#888"
            multiline
            style={styles.input}
          />

          <View style={styles.button}>
            <Button
              title={
                feedbackSaved
                  ? "Återrapportering sparad"
                  : "Spara återrapportering"
              }
              onPress={handleSaveFeedback}
              disabled={rpe === null}
            />
          </View>
        </Card>
      </Screen>
    </>
  );
}

function findSession(
  id: string | undefined
): TrainingSession | undefined {
  if (!id) return undefined;

  for (const week of trainingWeeks) {
    const session = week.sessions.find(
      (session) => session.id === id
    );

    if (session) {
      return session;
    }
  }

  return undefined;
}

function formatFullDate(date: string) {
  return new Date(date).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },

  text: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
  },

  status: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "600",
  },

  question: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "600",
  },

  scaleHint: {
    marginTop: 4,
    opacity: 0.6,
  },

  rpeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  rpeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  rpeButtonSelected: {
    backgroundColor: "#8EE3B0",
    borderColor: "#8EE3B0",
  },

  rpeText: {
    fontSize: 14,
    fontWeight: "600",
  },

  rpeTextSelected: {
    color: "#111",
  },

  scaleDescription: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.55,
  },

  input: {
    marginTop: 16,
    minHeight: 90,
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
});