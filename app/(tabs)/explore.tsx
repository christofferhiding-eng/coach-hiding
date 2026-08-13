import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import {
  trainingWeeks,
  TrainingSession,
} from "@/features/training-plan";

const TYPE_ICONS = {
  easy: "🟢",
  quality: "🔥",
  long: "🏃",
  rest: "⚪",
};

const SLOT_LABELS = {
  morning: "Förmiddag",
  afternoon: "Eftermiddag",
  evening: "Kväll",
};

const SLOT_ICONS = {
  morning: "☀️",
  afternoon: "🌤️",
  evening: "🌙",
};

export default function PlanScreen() {
  const [weekIndex, setWeekIndex] = useState(0);

  const week = trainingWeeks[weekIndex];

  if (!week) {
    return (
      <Screen>
        <BodyText>Ingen träningsplan hittades.</BodyText>
      </Screen>
    );
  }

  const canGoBack = weekIndex > 0;
  const canGoForward =
    weekIndex < trainingWeeks.length - 1;

  const groupedDays = groupSessionsByDay(week.sessions);

  return (
    <Screen>
      <View style={styles.header}>
        <SectionLabel>DIN PLAN</SectionLabel>

        <Metric>{week.title}</Metric>

        <BodyText style={styles.subtitle}>
          Här ser du din kommande träning.
        </BodyText>
      </View>

      <View style={styles.weekNavigation}>
        <Pressable
          onPress={() =>
            canGoBack &&
            setWeekIndex((current) => current - 1)
          }
          disabled={!canGoBack}
          style={[
            styles.navigationButton,
            !canGoBack && styles.navigationButtonDisabled,
          ]}
        >
          <BodyText style={styles.navigationText}>
            ←
          </BodyText>
        </Pressable>

        <BodyText style={styles.weekNumber}>
          Vecka {week.weekNumber}
        </BodyText>

        <Pressable
          onPress={() =>
            canGoForward &&
            setWeekIndex((current) => current + 1)
          }
          disabled={!canGoForward}
          style={[
            styles.navigationButton,
            !canGoForward &&
              styles.navigationButtonDisabled,
          ]}
        >
          <BodyText style={styles.navigationText}>
            →
          </BodyText>
        </Pressable>
      </View>

      {groupedDays.map((day) => (
        <DayCard
          key={day.date}
          day={day}
        />
      ))}
    </Screen>
  );
}

function DayCard({
  day,
}: {
  day: {
    date: string;
    day: string;
    sessions: TrainingSession[];
  };
}) {
  return (
    <Card>
      <View style={styles.dayHeader}>
        <BodyText style={styles.day}>
          {day.day}
        </BodyText>

        <BodyText style={styles.date}>
          {formatDate(day.date)}
        </BodyText>
      </View>

      <View style={styles.sessions}>
        {day.sessions.map((session) => (
          <Pressable
            key={session.id}
            onPress={() =>
              router.push(`/training/${session.id}`)
            }
            style={styles.session}
          >
            <View style={styles.slotRow}>
              <BodyText style={styles.slot}>
                {SLOT_ICONS[session.slot]}{" "}
                {SLOT_LABELS[session.slot]}
              </BodyText>
            </View>

            <BodyText style={styles.title}>
              {TYPE_ICONS[session.type]} {session.title}
            </BodyText>

            <BodyText style={styles.description}>
              {session.description}
            </BodyText>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

function groupSessionsByDay(
  sessions: TrainingSession[]
) {
  const groups: {
    date: string;
    day: string;
    sessions: TrainingSession[];
  }[] = [];

  sessions.forEach((session) => {
    const existingDay = groups.find(
      (group) => group.date === session.date
    );

    if (existingDay) {
      existingDay.sessions.push(session);
    } else {
      groups.push({
        date: session.date,
        day: session.day,
        sessions: [session],
      });
    }
  });

  return groups;
}

function formatDate(date: string) {
  const formattedDate = new Date(date);

  return formattedDate.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.7,
  },

  weekNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
  },

  navigationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  navigationButtonDisabled: {
    opacity: 0.25,
  },

  navigationText: {
    fontSize: 24,
    fontWeight: "600",
  },

  weekNumber: {
    fontSize: 17,
    fontWeight: "700",
  },

  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  day: {
    fontSize: 18,
    fontWeight: "700",
  },

  date: {
    fontSize: 14,
    opacity: 0.5,
  },

  sessions: {
    marginTop: 14,
  },

  session: {
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  slotRow: {
    marginBottom: 4,
  },

  slot: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.55,
  },

  title: {
    fontSize: 19,
    fontWeight: "700",
  },

  description: {
    marginTop: 6,
    lineHeight: 21,
    opacity: 0.7,
  },
});