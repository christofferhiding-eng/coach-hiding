import React from "react";
import {
    ScrollView,
    ScrollViewProps,
    StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/design";

type ScreenProps = ScrollViewProps & {
  children: React.ReactNode;
};

export default function Screen({
  children,
  contentContainerStyle,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          contentContainerStyle,
        ]}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
});