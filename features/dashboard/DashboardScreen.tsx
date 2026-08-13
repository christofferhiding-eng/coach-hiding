import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";

import Screen from "@/components/ui/Screen";
import BodyText from "@/components/ui/BodyText";

import {
  WelcomeCard,
  DailyStatusCard,
  TodayRunCard,
  CoachInsightCard,
  WeeklyGoalCard,
  getDashboard,
} from "@/features/dashboard";

import { supabase } from "@/lib/supabase";

export default function DashboardScreen() {
  const dashboard = getDashboard();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <BodyText style={styles.logoutText}>
            Logga ut
          </BodyText>
        </Pressable>
      </View>

      <WelcomeCard
        greeting={dashboard.user.greeting}
        firstName={dashboard.user.firstName}
        goalName={dashboard.user.goalName}
        goalDate={dashboard.user.goalDate}
      />

      <DailyStatusCard
        title={dashboard.dailyStatus.title}
        score={dashboard.dailyStatus.score}
        message={dashboard.dailyStatus.message}
      />

      <TodayRunCard
        title={dashboard.todayRun.title}
        time={dashboard.todayRun.time}
        description={dashboard.todayRun.description}
      />

      <CoachInsightCard
        title={dashboard.coachInsight.title}
        message={dashboard.coachInsight.message}
      />

      <WeeklyGoalCard
        completed={dashboard.weeklyGoal.completed}
        goal={dashboard.weeklyGoal.goal}
        plannedByToday={
          dashboard.weeklyGoal.plannedByToday
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    width: "100%",
    alignItems: "flex-end",
    marginBottom: 8,
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
});