import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";

import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import { athletes } from "@/features/athletes";
import { supabase } from "@/lib/supabase";

export default function CoachHomeScreen() {
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <SectionLabel>
            COACH
          </SectionLabel>

          <Pressable
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <BodyText
              style={styles.logoutText}
            >
              Logga ut
            </BodyText>
          </Pressable>
        </View>

        <Metric>
          Träningsöversikt
        </Metric>

        <BodyText
          style={styles.subtitle}
        >
          Välj en adept för att planera
          och följa träningen.
        </BodyText>
      </View>

      <SectionLabel>
        ADEPTER
      </SectionLabel>

      {athletes.map((athlete) => (
        <Pressable
          key={athlete.id}
          onPress={() =>
            router.push(
              `/coach/athlete/${athlete.id}`
            )
          }
        >
          <Card>
            <View style={styles.topRow}>
              <BodyText
                style={styles.name}
              >
                {athlete.name}
              </BodyText>

              <BodyText
                style={styles.score}
              >
                {athlete.score.toFixed(1)}
              </BodyText>
            </View>

            <BodyText
              style={styles.status}
            >
              {getStatusIcon(
                athlete.status
              )}{" "}
              {athlete.statusText}
            </BodyText>

            <BodyText
              style={styles.training}
            >
              Nästa:{" "}
              {athlete.nextKeySession}
            </BodyText>

            <BodyText
              style={styles.link}
            >
              Planera träning →
            </BodyText>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

function getStatusIcon(
  status:
    | "green"
    | "yellow"
    | "red"
) {
  if (status === "red") {
    return "🔴";
  }

  if (status === "yellow") {
    return "🟡";
  }

  return "🟢";
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 4,
  },

  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor:
      "rgba(255,255,255,0.06)",
  },

  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.65,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.7,
  },

  topRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
  },

  score: {
    fontSize: 20,
    fontWeight: "700",
  },

  status: {
    marginTop: 8,
    fontSize: 15,
    opacity: 0.8,
  },

  training: {
    marginTop: 10,
    fontSize: 15,
    opacity: 0.7,
  },

  link: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "600",
  },
});