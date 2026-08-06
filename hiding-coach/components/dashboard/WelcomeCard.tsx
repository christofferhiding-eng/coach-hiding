import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function WelcomeCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.greeting}>👋 God morgon</Text>

      <Text style={styles.title}>
        Välkommen till Hiding Coach
      </Text>

      <Text style={styles.subtitle}>
        Din personliga AI-löpcoach.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#14532D",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  greeting: {
    color: "#DCFCE7",
    fontSize: 18,
    marginBottom: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#BBF7D0",
    fontSize: 16,
    marginTop: 8,
  },
});