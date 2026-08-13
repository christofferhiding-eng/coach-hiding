import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

import { Colors } from "@/constants/design";

type SectionLabelProps = TextProps & {
  children: React.ReactNode;
};

export default function SectionLabel({
  children,
  style,
  ...props
}: SectionLabelProps) {
  return (
    <Text style={[styles.label, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.primaryLight,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
});