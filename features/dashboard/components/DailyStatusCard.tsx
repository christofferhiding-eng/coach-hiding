import React from "react";
import { StyleSheet, View } from "react-native";

import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

type DailyStatusCardProps = {
  title: string;
  score: number;
  message: string;
};

export default function DailyStatusCard({
  title,
  score,
  message,
}: DailyStatusCardProps) {
  return (
    <Card>
      <SectionLabel>DAGENS STATUS</SectionLabel>

      <View style={styles.content}>
        <Metric>{score.toFixed(1)} / 10</Metric>

        <BodyText style={styles.status}>{title}</BodyText>

        <BodyText style={styles.message}>{message}</BodyText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: 8,
  },

  status: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
  },

  message: {
    lineHeight: 22,
    opacity: 0.72,
  },
});