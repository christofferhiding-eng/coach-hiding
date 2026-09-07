import React from "react";
import {
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import {
  Colors,
  Radius,
} from "@/constants/design";

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function Card({
  children,
  style,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 16,
  },
});