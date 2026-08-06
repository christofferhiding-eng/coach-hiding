import React from "react";
import { StyleSheet } from "react-native";

import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

type TodayRunCardProps = {
  title: string;
  time: string;
};

export default function TodayRunCard({
  title,
  time,
}: TodayRunCardProps) {
  return (
    <Card>
      <SectionLabel>
        🏃 Dagens pass
      </SectionLabel>

      <Metric>
        {title}
      </Metric>

      <BodyText style={styles.time}>
        Start: {time}
      </BodyText>
    </Card>
  );
}

const styles = StyleSheet.create({
  time: {
    marginTop: 8,
  },
});