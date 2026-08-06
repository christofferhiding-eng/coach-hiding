import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import WelcomeCard from "../../components/dashboard/WelcomeCard";

export default function HomeScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <WelcomeCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
});