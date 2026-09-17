import React, {
  forwardRef,
} from "react";

import {
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  Colors,
  Spacing,
} from "@/constants/design";

type ScreenProps = ScrollViewProps & {
  children: React.ReactNode;
};

const Screen = forwardRef<
  ScrollView,
  ScreenProps
>(
  function Screen(
    {
      children,
      contentContainerStyle,
      ...props
    },
    ref
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <ScrollView
          ref={ref}
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
);

export default Screen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      Colors.background,
  },

  content: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
});