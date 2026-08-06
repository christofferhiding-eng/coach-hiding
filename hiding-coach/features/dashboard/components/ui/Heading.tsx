import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

import { Colors } from "@/constants/design";

type HeadingProps = TextProps & {
  children: React.ReactNode;
};

export default function Heading({
  children,
  style,
  ...props
}: HeadingProps) {
  return (
    <Text style={[styles.heading, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 36,
  },
});