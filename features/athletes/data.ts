import { Athlete } from "./types";

export const athletes: Athlete[] = [
  {
    id: "eric",
    name: "Eric Lindh",

    status: "green",
    statusText: "Redo för dagens pass",
    score: 8.2,

    training: "10 km lugnt",
    message:
      "Eric följer planen bra. Dagens pass ska genomföras kontrollerat.",

    weeklyDistance: 48,
    weeklyGoal: 90,

    lastRun: "12 km lugnt – igår",
    nextKeySession: "10 × 1 km – tisdag",

    greeting: {
      title: "God morgon, Eric!",
      message:
        "Dagens fokus är ett lugnt och kontrollerat pass.",
    },

    coachMessage: {
      title: "Från din coach",
      message:
        "Följ planen och håll igen om benen känns slitna. Målet är att bygga kontinuitet över tid.",
    },
  },
];

export function getAthlete(id: string) {
  return athletes.find((athlete) => athlete.id === id);
}