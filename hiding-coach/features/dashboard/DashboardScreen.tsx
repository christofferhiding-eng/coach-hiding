import React from "react";

import Screen from "@/components/ui/Screen";

import {
    CoachInsightCard,
    DailyStatusCard,
    getDashboard,
    TodayRunCard,
    WelcomeCard,
} from "@/features/dashboard";

export default function DashboardScreen() {
  const dashboard = getDashboard();

  return (
    <Screen>
      <WelcomeCard
        greeting={dashboard.user.greeting}
        firstName={dashboard.user.firstName}
      />

      <DailyStatusCard
        title={dashboard.dailyStatus.title}
        score={dashboard.dailyStatus.score}
        message={dashboard.dailyStatus.message}
      />

      <TodayRunCard
        title={dashboard.todayRun.title}
        time={dashboard.todayRun.time}
      />

      <CoachInsightCard
        title={dashboard.coachInsight.title}
        message={dashboard.coachInsight.message}
      />
    </Screen>
  );
}