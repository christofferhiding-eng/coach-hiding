import { DashboardData } from "./types";

export const dashboardData: DashboardData = {
  user: {
    firstName: "Christoffer",
    greeting: "God morgon",
    goalName: "Budapest Marathon",
    goalDate: "2026-10-11",
  },

  dailyStatus: {
    title: "Redo för kvalitet",
    score: 8.7,
    message:
      "Du återhämtade dig bättre än väntat efter gårdagens kvalitetspass.",
  },

  todayRun: {
    title: "16 km lugnt",
    time: "08:00",
    description:
      "Lugn distans i zon 2. Håll igen första halvan och fokusera på avslappnad löpning.",
  },

  coachInsight: {
    title: "Dagens coachning",
    message:
      "Idag tränar vi tålamod. Spring första halvan lugnare än det känns naturligt och låt kroppen arbeta sig in i passet.",
  },

  weeklyGoal: {
    completed: 42,
    goal: 90,
    plannedByToday: 35,
  },
};