import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { supabase } from "@/lib/supabase";
import { importEricTrainingPlan } from "@/features/training-plan/importEric";

type CoachAthlete = {
  id: string;
  name: string;
  status: "green" | "yellow" | "red";
  statusText: string;
  score: number;
  nextKeySession: string;
};

export default function CoachHomeScreen() {
  const [athletes, setAthletes] = useState<CoachAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadAthletes() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("name, athlete_id")
          .eq("role", "athlete")
          .order("name");

        if (error) {
          console.error(
            "Kunde inte läsa adepter:",
            error
          );
          return;
        }

        const mappedAthletes: CoachAthlete[] = (data ?? [])
          .filter((profile) => profile.athlete_id)
          .map((profile) => ({
            id: profile.athlete_id as string,
            name: profile.name,
            status: "green",
            statusText: "Redo för dagens pass",
            score: 0,
            nextKeySession: "Ingen träning planerad ännu",
          }));

        setAthletes(mappedAthletes);
      } catch (error) {
        console.error(
          "Kunde inte läsa adepter:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadAthletes();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleImportEric() {
    setImportMessage(null);
    setImporting(true);

    try {
      const sessions =
        await importEricTrainingPlan();

      setImportMessage(
        `Klart! ${sessions?.length ?? 0} träningspass importerades för Eric.`
      );
    } catch (error) {
      console.error(
        "Importfel:",
        error
      );

      setImportMessage(
        "Importen misslyckades. Kontrollera konsolen."
      );
    } finally {
      setImporting(false);
    }
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

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <BodyText style={styles.loadingText}>
            Hämtar adepter...
          </BodyText>
        </View>
      ) : (
        athletes.map((athlete) => (
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
                  {athlete.score > 0
                    ? athlete.score.toFixed(1)
                    : "–"}
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
        ))
      )}

      <View style={styles.importSection}>
        <SectionLabel>
          TESTVERKTYG
        </SectionLabel>

        <Pressable
          onPress={handleImportEric}
          disabled={importing}
          style={[
            styles.importButton,
            importing &&
              styles.disabledButton,
          ]}
        >
          {importing ? (
            <ActivityIndicator />
          ) : (
            <BodyText
              style={
                styles.importButtonText
              }
            >
              Importera Erics testschema
            </BodyText>
          )}
        </Pressable>

        {importMessage && (
          <BodyText
            style={styles.importMessage}
          >
            {importMessage}
          </BodyText>
        )}
      </View>
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

  loading: {
    marginTop: 20,
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
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

  importSection: {
    marginTop: 30,
    paddingBottom: 30,
  },

  importButton: {
    marginTop: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor:
      "rgba(80,200,140,0.9)",
  },

  disabledButton: {
    opacity: 0.5,
  },

  importButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },

  importMessage: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.75,
  },
});