import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import Screen from "@/components/ui/Screen";
import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import { supabase } from "@/lib/supabase";
import { CoachNote, getNotes } from "@/features/notes";
import {
  getFeedbacks,
  TrainingFeedback,
} from "@/features/training-feedback";

type CoachAthlete = {
  id: string;
  name: string;
  status: "green" | "yellow" | "red";
  statusText: string;
  score: number;
  training: string;
  weeklyDistance: number;
  weeklyGoal: number;
};

const statusPriority = {
  red: 1,
  yellow: 2,
  green: 3,
};

export default function AthletesScreen() {
  const [athletes, setAthletes] = useState<CoachAthlete[]>([]);
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [
          { data: athleteProfiles, error: athleteError },
          storedNotes,
          storedFeedbacks,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, name, athlete_id")
            .eq("role", "athlete")
            .order("name"),
          getNotes(),
          getFeedbacks(),
        ]);

        if (athleteError) {
          console.error(
            "Kunde inte läsa adepter från Supabase:",
            athleteError
          );
          return;
        }
        
        console.log("ADEPTER FRÅN SUPABASE:", athleteProfiles);

        const mappedAthletes: CoachAthlete[] = (
          athleteProfiles ?? []
        )
          .filter((profile) => profile.athlete_id)
          .map((profile) => ({
            id: profile.athlete_id as string,
            name: profile.name,
            status: "green",
            statusText: "Ingen träningsplan ännu",
            score: 0,
            training: "Ingen träning planerad ännu",
            weeklyDistance: 0,
            weeklyGoal: 0,
          }));

        setAthletes(mappedAthletes);
        setNotes(storedNotes);
        setFeedbacks(storedFeedbacks);
      } catch (error) {
        console.error("Kunde inte läsa coachdata:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const sortedAthletes = [...athletes].sort(
    (a, b) => statusPriority[a.status] - statusPriority[b.status]
  );

  const needsAttention = sortedAthletes.filter(
    (athlete) =>
      athlete.status === "red" || athlete.status === "yellow"
  );

  const readyAthletes = sortedAthletes.filter(
    (athlete) => athlete.status === "green"
  );

  function getNoteForAthlete(athleteId: string) {
    return notes.find((note) => note.athleteId === athleteId);
  }

  function getFeedbackForAthlete(athleteId: string) {
    const athleteFeedbacks = feedbacks.filter((feedback) =>
      feedbackBelongsToAthlete(feedback.sessionId, athleteId)
    );

    return athleteFeedbacks[athleteFeedbacks.length - 1];
  }

  return (
    <Screen>
      <View style={styles.header}>
        <SectionLabel>ADEPTER</SectionLabel>
        <Metric>Dina löpare</Metric>
      </View>

      {loading ? (
        <BodyText style={styles.loading}>
          Hämtar adepter...
        </BodyText>
      ) : athletes.length === 0 ? (
        <BodyText style={styles.empty}>
          Inga adepter har registrerat sig ännu.
        </BodyText>
      ) : (
        <>
          {needsAttention.length > 0 && (
            <>
              <SectionLabel>KRÄVER UPPMÄRKSAMHET</SectionLabel>

              {needsAttention.map((athlete) => (
                <AthleteCard
                  key={athlete.id}
                  athlete={athlete}
                  note={getNoteForAthlete(athlete.id)}
                  feedback={getFeedbackForAthlete(athlete.id)}
                />
              ))}
            </>
          )}

          {readyAthletes.length > 0 && (
            <View style={styles.section}>
              <SectionLabel>ÖVRIGA ADEPTER</SectionLabel>

              {readyAthletes.map((athlete) => (
                <AthleteCard
                  key={athlete.id}
                  athlete={athlete}
                  note={getNoteForAthlete(athlete.id)}
                  feedback={getFeedbackForAthlete(athlete.id)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function AthleteCard({
  athlete,
  note,
  feedback,
}: {
  athlete: CoachAthlete;
  note?: CoachNote;
  feedback?: TrainingFeedback;
}) {
  const progress =
    athlete.weeklyGoal > 0
      ? Math.min(
          (athlete.weeklyDistance / athlete.weeklyGoal) * 100,
          100
        )
      : 0;

  const statusColor = getStatusColor(athlete.status);

  return (
    <Pressable
      onPress={() => router.push(`/athletes/${athlete.id}`)}
    >
      <Card>
        <View style={styles.topRow}>
          <BodyText style={styles.name}>
            {athlete.name}
          </BodyText>

          <BodyText
            style={[
              styles.score,
              { color: statusColor },
            ]}
          >
            {athlete.score > 0
              ? athlete.score.toFixed(1)
              : "–"}
          </BodyText>
        </View>

        <BodyText style={styles.status}>
          {getStatusIcon(athlete.status)} {athlete.statusText}
        </BodyText>

        <BodyText style={styles.training}>
          {athlete.training}
        </BodyText>

        <View style={styles.progressRow}>
          <BodyText style={styles.progressLabel}>
            VECKANS TRÄNING
          </BodyText>

          <BodyText style={styles.progressValue}>
            {athlete.weeklyDistance} / {athlete.weeklyGoal} km
          </BodyText>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        {feedback && (
          <View style={styles.feedbackContainer}>
            <BodyText style={styles.feedbackLabel}>
              SENASTE ÅTERRAPPORTERING
            </BodyText>

            <BodyText style={styles.feedbackRpe}>
              🔥 RPE {feedback.rpe}
            </BodyText>

            {feedback.comment ? (
              <BodyText
                style={styles.feedbackText}
                numberOfLines={2}
              >
                &quot;{feedback.comment}&quot;
              </BodyText>
            ) : null}
          </View>
        )}

        {note && (
          <View style={styles.noteContainer}>
            <BodyText style={styles.noteLabel}>
              SENASTE COACHNOTERING
            </BodyText>

            <BodyText
              style={styles.noteText}
              numberOfLines={2}
            >
              {note.text}
            </BodyText>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

function feedbackBelongsToAthlete(
  sessionId: string,
  athleteId: string
) {
  return sessionId.startsWith(`${athleteId}-`);
}

function getStatusIcon(status: "green" | "yellow" | "red") {
  if (status === "red") return "🔴";
  if (status === "yellow") return "🟡";
  return "🟢";
}

function getStatusColor(status: "green" | "yellow" | "red") {
  if (status === "red") return "#F87171";
  if (status === "yellow") return "#FACC15";
  return "#8EE3B0";
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },

  section: {
    marginTop: 20,
  },

  loading: {
    marginTop: 20,
    opacity: 0.7,
  },

  empty: {
    marginTop: 20,
    opacity: 0.7,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
  },

  score: {
    fontSize: 22,
    fontWeight: "700",
  },

  status: {
    fontSize: 15,
    marginTop: 8,
    opacity: 0.8,
  },

  training: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    opacity: 0.75,
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },

  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.55,
  },

  progressValue: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.75,
  },

  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  feedbackContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  feedbackLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.5,
  },

  feedbackRpe: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
  },

  feedbackText: {
    marginTop: 5,
    lineHeight: 20,
    opacity: 0.75,
  },

  noteContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.5,
  },

  noteText: {
    marginTop: 6,
    lineHeight: 20,
    opacity: 0.75,
  },
});