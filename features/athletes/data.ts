import { Athlete } from "./types";

export const athletes: Athlete[] = [
  {
    id: "anna",
    name: "Anna Andersson",

    status: "green",
    statusText: "Redo för kvalitet",
    score: 8.9,

    training: "10 × 1 km",
    message:
      "Återhämtningen ser bra ut. Anna är redo för dagens kvalitetspass.",

    weeklyDistance: 42,
    weeklyGoal: 90,

    lastRun: "14 km lugnt – igår",
    nextKeySession: "10 × 1 km – idag",

    greeting: {
      title: "God morgon, Anna!",
      message: "Du ser redo ut för dagens kvalitetspass.",
    },

    coachMessage: {
      title: "Från din coach",
      message:
        "Känn dig fram på första intervallen. Håll igen lite om kroppen inte svarar som förväntat.",
    },
  },

  {
    id: "erik",
    name: "Erik Svensson",

    status: "yellow",
    statusText: "Bygg lugnt idag",
    score: 6.8,

    training: "12 km lugnt",
    message:
      "Erik har haft en något högre belastning de senaste dagarna. Håll dagens pass kontrollerat.",

    weeklyDistance: 31,
    weeklyGoal: 70,

    lastRun: "8 km tröskel – igår",
    nextKeySession: "16 km långpass – lördag",

    greeting: {
      title: "God morgon, Erik!",
      message: "Idag är en dag för lugn och kontrollerad träning.",
    },

    coachMessage: {
      title: "Från din coach",
      message:
        "Håll dig till lugn fart idag. Det viktigaste är att du känner dig fräsch inför helgens långpass.",
    },
  },

  {
    id: "maria",
    name: "Maria Nilsson",

    status: "red",
    statusText: "Prioritera återhämtning",
    score: 4.7,

    training: "Vila eller mycket lugnt",
    message:
      "Maria visar tecken på otillräcklig återhämtning. Undvik hård träning idag.",

    weeklyDistance: 18,
    weeklyGoal: 60,

    lastRun: "10 km distans – igår",
    nextKeySession: "Intervaller – när återhämtningen tillåter",

    greeting: {
      title: "Hej Maria",
      message: "Idag är återhämtning viktigare än att följa planen exakt.",
    },

    coachMessage: {
      title: "Från din coach",
      message:
        "Ta vilodag om kroppen känns sliten. Vi flyttar kvalitetspasset tills du är redo.",
    },
  },
];

export function getAthlete(id: string) {
  return athletes.find((athlete) => athlete.id === id);
}