import React from "react";
import {
  StyleSheet,
  Text,
  TextProps,
} from "react-native";

import { Colors } from "@/constants/design";

type BodyTextProps = TextProps & {
  children: React.ReactNode;
};

export default function BodyText({
  children,
  style,
  ...props
}: BodyTextProps) {
  return (
    <Text
      style={[styles.text, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});