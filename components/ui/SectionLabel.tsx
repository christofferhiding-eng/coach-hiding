import React from "react";
import {
  StyleSheet,
  Text,
  TextProps,
} from "react-native";

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
    <Text
      style={[styles.label, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
});