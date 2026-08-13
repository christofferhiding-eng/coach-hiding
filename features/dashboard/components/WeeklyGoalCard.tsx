import React from "react";
import { StyleSheet } from "react-native";

import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Metric from "@/components/ui/Metric";
import ProgressBar from "@/components/ui/ProgressBar";
import SectionLabel from "@/components/ui/SectionLabel";

type WeeklyGoalCardProps = {
  completed: number;
  goal: number;
  plannedByToday: number;
};

export default function WeeklyGoalCard({
  completed,
  goal,
  plannedByToday,
}: WeeklyGoalCardProps) {
  const percentage = Math.min((completed / goal) * 100, 100);
  const remaining = Math.max(goal - completed, 0);
  const difference = completed - plannedByToday;

  let planMessage = "Precis enligt plan";

  if (difference > 0) {
    planMessage = `🔥 ${difference} km före plan`;
  }

  if (difference < 0) {
    planMessage = `⚠️ ${Math.abs(difference)} km efter plan`;
  }

  return (
    <Card>
      <SectionLabel>VECKANS MÅL</SectionLabel>

      <Metric>
        {completed} / {goal} km
      </Metric>

      <ProgressBar value={percentage} />

      <BodyText style={styles.remaining}>
        {remaining === 0 ? "Veckans mål är uppnått! 🎉" : `${remaining} km kvar`}
      </BodyText>

      <BodyText
        style={[
          styles.planStatus,
          difference > 0 && styles.ahead,
          difference < 0 && styles.behind,
        ]}
      >
        {planMessage}
      </BodyText>
    </Card>
  );
}

const styles = StyleSheet.create({
  remaining: {
    marginTop: 12,
    opacity: 0.72,
  },

  planStatus: {
    marginTop: 6,
    fontWeight: "700",
  },

  ahead: {
    color: "#8EE3B0",
  },

  behind: {
    color: "#F3B0A7",
  },
});