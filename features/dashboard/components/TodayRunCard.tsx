import React from "react";
import { StyleSheet, View } from "react-native";

import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

type TodayRunCardProps = {
  title: string;
  time: string;
  description: string;
};

export default function TodayRunCard({
  title,
  time,
  description,
}: TodayRunCardProps) {
  return (
    <Card>
      <SectionLabel>DAGENS PASS</SectionLabel>

      <View style={styles.content}>
        <Metric>{title}</Metric>

        <BodyText style={styles.time}>{time}</BodyText>

        <BodyText style={styles.description}>{description}</BodyText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: 8,
  },

  time: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
    opacity: 0.75,
  },

  description: {
    lineHeight: 22,
    opacity: 0.72,
  },
});