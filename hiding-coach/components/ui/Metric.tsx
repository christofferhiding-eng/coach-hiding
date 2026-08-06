import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

import { Colors } from "@/constants/design";

type MetricProps = TextProps & {
  children: React.ReactNode;
};

export default function Metric({
  children,
  style,
  ...props
}: MetricProps) {
  return (
    <Text style={[styles.metric, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  metric: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
  },
});