import React from "react";
import { StyleSheet, View } from "react-native";

import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";
import ProgressBar from "@/components/ui/ProgressBar";

import { getAthlete } from "@/features/athletes";

export default function AthleteScreen() {
  const athlete = getAthlete("anna");

  if (!athlete) {
    return (
      <Screen>
        <BodyText>Adepten kunde inte hittas.</BodyText>
      </Screen>
    );
  }

  const weeklyProgress = Math.min(
    (athlete.weeklyDistance / athlete.weeklyGoal) * 100,
    100
  );

  return (
    <Screen>
      <View style={styles.header}>
        <SectionLabel>DIN TRÄNING</SectionLabel>

        <Metric>{athlete.greeting.title}</Metric>

        <BodyText style={styles.greeting}>
          {athlete.greeting.message}
        </BodyText>
      </View>

      <Card>
        <SectionLabel>DAGENS STATUS</SectionLabel>

        <Metric>{athlete.score.toFixed(1)} / 10</Metric>

        <BodyText style={styles.status}>
          {getStatusIcon(athlete.status)} {athlete.statusText}
        </BodyText>

        <BodyText style={styles.message}>
          {athlete.message}
        </BodyText>
      </Card>

      <Card>
        <SectionLabel>DAGENS PASS</SectionLabel>

        <Metric>{athlete.training}</Metric>

        <BodyText style={styles.message}>
          Följ planen, men anpassa efter hur kroppen känns.
        </BodyText>
      </Card>

      <Card>
        <SectionLabel>VECKANS MÅL</SectionLabel>

        <Metric>
          {athlete.weeklyDistance} / {athlete.weeklyGoal} km
        </Metric>

        <ProgressBar value={weeklyProgress} />

        <BodyText style={styles.message}>
          {Math.max(
            athlete.weeklyGoal - athlete.weeklyDistance,
            0
          )}{" "}
          km kvar den här veckan.
        </BodyText>
      </Card>

      <Card>
        <SectionLabel>{athlete.coachMessage.title}</SectionLabel>

        <BodyText style={styles.coachMessage}>
          {athlete.coachMessage.message}
        </BodyText>
      </Card>
    </Screen>
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

  greeting: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
  },

  status: {
    marginTop: 8,
    fontSize: 16,
    opacity: 0.8,
  },

  message: {
    marginTop: 12,
    lineHeight: 22,
    opacity: 0.75,
  },

  coachMessage: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 24,
  },
});