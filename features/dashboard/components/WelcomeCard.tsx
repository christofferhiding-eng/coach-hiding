import React from "react";
import { StyleSheet, View } from "react-native";

import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Metric from "@/components/ui/Metric";

type WelcomeCardProps = {
  greeting: string;
  firstName: string;
  goalName: string;
  goalDate: string;
};

export default function WelcomeCard({
  greeting,
  firstName,
  goalName,
  goalDate,
}: WelcomeCardProps) {
  const today = new Date();
  const goal = new Date(`${goalDate}T00:00:00`);

  const millisecondsUntilGoal = goal.getTime() - today.getTime();
  const daysUntilGoal = Math.max(
    0,
    Math.ceil(millisecondsUntilGoal / (1000 * 60 * 60 * 24))
  );

  return (
    <Card>
      <BodyText style={styles.greeting}>
        👋 {greeting}, {firstName}
      </BodyText>

      <View style={styles.goalContainer}>
        <BodyText style={styles.goalLabel}>NÄSTA MÅL</BodyText>

        <Metric>{goalName}</Metric>

        <BodyText style={styles.days}>
          {daysUntilGoal} dagar kvar
        </BodyText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 17,
    marginBottom: 20,
  },

  goalContainer: {
    gap: 4,
  },

  goalLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.55,
  },

  days: {
    fontSize: 15,
    opacity: 0.7,
    marginTop: 2,
  },
});