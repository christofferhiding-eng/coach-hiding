import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  TrainingSession,
  TrainingWeek,
} from "./types";

import { trainingWeeks } from "./data";

const TRAINING_PLAN_STORAGE_KEY =
  "training-plan";

export async function getStoredTrainingWeeks(): Promise<
  TrainingWeek[]
> {
  const storedPlan =
    await AsyncStorage.getItem(
      TRAINING_PLAN_STORAGE_KEY
    );

  if (!storedPlan) {
    const initialWeeks =
      normalizeWeeks(trainingWeeks);

    await saveTrainingWeeks(
      initialWeeks
    );

    return initialWeeks;
  }

  const weeks: TrainingWeek[] =
    JSON.parse(storedPlan);

  return normalizeWeeks(weeks);
}

export async function saveTrainingWeeks(
  weeks: TrainingWeek[]
): Promise<void> {
  await AsyncStorage.setItem(
    TRAINING_PLAN_STORAGE_KEY,
    JSON.stringify(weeks)
  );
}

export async function addTrainingSession(
  session: TrainingSession
): Promise<void> {
  const weeks =
    await getStoredTrainingWeeks();

  const weekStart =
    getMonday(session.date);

  let week = weeks.find(
    (item) =>
      item.startDate === weekStart
  );

  if (!week) {
    week = createWeek(
      weekStart
    );

    weeks.push(week);

    sortWeeks(weeks);
  }

  week.sessions.push(session);

  await saveTrainingWeeks(weeks);
}

export async function copyTrainingSession(
  session: TrainingSession,
  newDate: string,
  newSlot: TrainingSession["slot"]
): Promise<void> {
  const weeks =
    await getStoredTrainingWeeks();

  const newSession: TrainingSession = {
    ...session,

    id: `${session.athleteId}-${newDate}-${newSlot}-${Date.now()}`,

    date: newDate,

    day: getDayName(newDate),

    slot: newSlot,
  };

  const targetWeekStart =
    getMonday(newDate);

  let targetWeek = weeks.find(
    (week) =>
      week.startDate ===
      targetWeekStart
  );

  if (!targetWeek) {
    targetWeek =
      createWeek(
        targetWeekStart
      );

    weeks.push(targetWeek);

    sortWeeks(weeks);
  }

  targetWeek.sessions.push(
    newSession
  );

  await saveTrainingWeeks(
    weeks
  );
}

export async function updateTrainingSession(
  session: TrainingSession
): Promise<void> {
  const weeks =
    await getStoredTrainingWeeks();

  const oldWeekIndex =
    weeks.findIndex((week) =>
      week.sessions.some(
        (existingSession) =>
          existingSession.id ===
          session.id
      )
    );

  if (oldWeekIndex === -1) {
    throw new Error(
      "Kunde inte hitta passet som skulle uppdateras."
    );
  }

  const oldWeek =
    weeks[oldWeekIndex];

  const sessionIndex =
    oldWeek.sessions.findIndex(
      (existingSession) =>
        existingSession.id ===
        session.id
    );

  const newWeekStart =
    getMonday(session.date);

  const oldWeekStart =
    oldWeek.startDate;

  if (
    oldWeekStart ===
    newWeekStart
  ) {
    oldWeek.sessions[
      sessionIndex
    ] = session;

    await saveTrainingWeeks(
      weeks
    );

    return;
  }

  oldWeek.sessions.splice(
    sessionIndex,
    1
  );

  let newWeek = weeks.find(
    (week) =>
      week.startDate ===
      newWeekStart
  );

  if (!newWeek) {
    newWeek =
      createWeek(
        newWeekStart
      );

    weeks.push(newWeek);

    sortWeeks(weeks);
  }

  newWeek.sessions.push(
    session
  );

  await saveTrainingWeeks(
    weeks
  );
}

/*
 * Flyttar ett befintligt pass
 * till ett nytt datum och/eller
 * en ny tid på dagen.
 *
 * Den här funktionen kommer
 * användas av drag-and-drop
 * på desktop.
 */
export async function moveTrainingSession(
  sessionId: string,
  newDate: string,
  newSlot?: TrainingSession["slot"]
): Promise<void> {
  const weeks =
    await getStoredTrainingWeeks();

  let sourceWeek: TrainingWeek | null =
    null;

  let sessionIndex = -1;

  for (const week of weeks) {
    const index =
      week.sessions.findIndex(
        (session) =>
          session.id ===
          sessionId
      );

    if (index !== -1) {
      sourceWeek = week;
      sessionIndex = index;
      break;
    }
  }

  if (
    !sourceWeek ||
    sessionIndex === -1
  ) {
    throw new Error(
      "Kunde inte hitta passet som skulle flyttas."
    );
  }

  const session =
    sourceWeek.sessions[
      sessionIndex
    ];

  const targetWeekStart =
    getMonday(newDate);

  /*
   * Om passet flyttas inom
   * samma vecka behöver vi bara
   * uppdatera passet.
   */
  if (
    sourceWeek.startDate ===
    targetWeekStart
  ) {
    sourceWeek.sessions[
      sessionIndex
    ] = {
      ...session,
      date: newDate,
      day: getDayName(newDate),
      slot:
        newSlot ??
        session.slot,
    };

    await saveTrainingWeeks(
      weeks
    );

    return;
  }

  /*
   * Om passet flyttas till en
   * annan vecka tar vi bort det
   * från den gamla veckan.
   */
  sourceWeek.sessions.splice(
    sessionIndex,
    1
  );

  let targetWeek = weeks.find(
    (week) =>
      week.startDate ===
      targetWeekStart
  );

  /*
   * Om målveckan inte finns
   * skapas den automatiskt.
   */
  if (!targetWeek) {
    targetWeek =
      createWeek(
        targetWeekStart
      );

    weeks.push(targetWeek);
  }

  targetWeek.sessions.push({
    ...session,
    date: newDate,
    day: getDayName(newDate),
    slot:
      newSlot ??
      session.slot,
  });

  sortWeeks(weeks);

  await saveTrainingWeeks(
    weeks
  );
}

export async function deleteTrainingSession(
  sessionId: string
): Promise<void> {
  const weeks =
    await getStoredTrainingWeeks();

  for (const week of weeks) {
    const sessionIndex =
      week.sessions.findIndex(
        (session) =>
          session.id ===
          sessionId
      );

    if (sessionIndex !== -1) {
      week.sessions.splice(
        sessionIndex,
        1
      );

      /*
       * Veckan tas inte bort när
       * det sista passet tas bort.
       */

      await saveTrainingWeeks(
        weeks
      );

      return;
    }
  }

  throw new Error(
    "Kunde inte hitta passet som skulle tas bort."
  );
}

export async function addTrainingWeek(
  startDate: string
): Promise<TrainingWeek> {
  const weeks =
    await getStoredTrainingWeeks();

  const normalizedStartDate =
    getMonday(startDate);

  const existingWeek =
    weeks.find(
      (week) =>
        week.startDate ===
        normalizedStartDate
    );

  if (existingWeek) {
    return existingWeek;
  }

  const newWeek =
    createWeek(
      normalizedStartDate
    );

  weeks.push(newWeek);

  sortWeeks(weeks);

  await saveTrainingWeeks(
    weeks
  );

  return newWeek;
}

function createWeek(
  startDate: string
): TrainingWeek {
  return {
    id: `week-${startDate}`,

    weekNumber:
      getISOWeekNumber(
        new Date(startDate)
      ),

    title: formatWeekTitle(
      startDate
    ),

    startDate,

    sessions: [],
  };
}

function normalizeWeeks(
  weeks: TrainingWeek[]
): TrainingWeek[] {
  const normalized =
    weeks.map((week) => {
      const sessions =
        week.sessions ?? [];

      let startDate =
        week.startDate;

      if (!startDate) {
        const firstSession =
          sessions[0];

        if (firstSession) {
          startDate =
            getMonday(
              firstSession.date
            );
        }
      }

      if (!startDate) {
        startDate =
          getMonday(
            new Date()
              .toISOString()
              .slice(0, 10)
          );
      }

      return {
        ...week,

        id:
          week.id ??
          `week-${startDate}`,

        weekNumber:
          week.weekNumber ??
          getISOWeekNumber(
            new Date(startDate)
          ),

        title:
          week.title ??
          formatWeekTitle(
            startDate
          ),

        startDate,

        sessions,
      };
    });

  sortWeeks(normalized);

  return normalized;
}

function sortWeeks(
  weeks: TrainingWeek[]
) {
  weeks.sort((a, b) =>
    a.startDate.localeCompare(
      b.startDate
    )
  );
}

function getMonday(
  date: string
): string {
  const result =
    new Date(date);

  const day =
    result.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      difference
  );

  return formatISODate(
    result
  );
}

function formatISODate(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDayName(
  date: string
): string {
  return new Date(
    date
  ).toLocaleDateString(
    "sv-SE",
    {
      weekday: "short",
    }
  );
}

function formatWeekTitle(
  monday: string
): string {
  const date =
    new Date(monday);

  return `Vecka ${getISOWeekNumber(
    date
  )}`;
}

function getISOWeekNumber(
  date: Date
): number {
  const target =
    new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )
    );

  const dayNumber =
    target.getUTCDay() || 7;

  target.setUTCDate(
    target.getUTCDate() +
      4 -
      dayNumber
  );

  const yearStart =
    new Date(
      Date.UTC(
        target.getUTCFullYear(),
        0,
        1
      )
    );

  return Math.ceil(
    (
      (
        target.getTime() -
        yearStart.getTime()
      ) /
        86400000 +
      1
    ) / 7
  );
}