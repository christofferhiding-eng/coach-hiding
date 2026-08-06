import React from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/design";

type ProgressBarProps = {
  value: number; // 0–100
};

export default function ProgressBar({ value }: ProgressBarProps) {
  return (
    <View style={styles.background}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(Math.max(value, 0), 100)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#243247",
    marginVertical: 16,
  },

  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
});