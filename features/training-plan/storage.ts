import AsyncStorage from "@react-native-async-storage/async-storage";

import { trainingWeeks } from "./data";

import {
  TrainingSession,
  TrainingWeek,
} from "./types";

const STORAGE_KEY =
  "hiding-coach-training-weeks";

/**
 * Alla testveckor som ska finnas.
 *
 * trainingWeeks innehåller redan både
 * Anna och Eric.
 */
function getSeedWeeks(): TrainingWeek[] {
  return trainingWeeks;
}

/**
 * Skapar en fristående kopia av
 * träningsplanen.
 */
function cloneTrainingWeeks(
  weeks: TrainingWeek[]
): TrainingWeek[] {
  return weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map(
      (session) => ({
        ...session,
      })
    ),
  }));
}

/**
 * Tar bort eventuella dubbletter av veckor.
 *
 * En vecka identifieras av sitt id.
 */
function dedupeWeeks(
  weeks: TrainingWeek[]
): TrainingWeek[] {
  const seen = new Set<string>();

  return weeks.filter((week) => {
    if (seen.has(week.id)) {
      return false;
    }

    seen.add(week.id);
    return true;
  });
}

/**
 * Hämtar träningsplanen.
 *
 * Befintlig data behålls.
 * Nya veckor och nya pass läggs till
 * automatiskt.
 */
export async function getStoredTrainingWeeks(): Promise<
  TrainingWeek[]
> {
  try {
    const stored =
      await AsyncStorage.getItem(
        STORAGE_KEY
      );

    const seedWeeks =
      getSeedWeeks();

    /**
     * Ingen sparad data ännu.
     */
    if (!stored) {
      const initialWeeks =
        cloneTrainingWeeks(
          seedWeeks
        );

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          initialWeeks
        )
      );

      return initialWeeks;
    }

    const parsed =
      JSON.parse(stored);

    const storedWeeks: TrainingWeek[] =
      Array.isArray(parsed)
        ? parsed
        : [];

    /**
     * Börja med befintlig data
     * och ta bort eventuella dubbletter.
     */
    const mergedWeeks =
      dedupeWeeks(
        cloneTrainingWeeks(
          storedWeeks
        )
      );

    /**
     * Lägg till nya veckor och
     * nya träningspass.
     */
    for (
      const seedWeek of seedWeeks
    ) {
      const existingWeekIndex =
        mergedWeeks.findIndex(
          (week) =>
            week.id ===
            seedWeek.id
        );

      /**
       * Veckan finns inte.
       */
      if (
        existingWeekIndex === -1
      ) {
        mergedWeeks.push({
          ...seedWeek,
          sessions:
            seedWeek.sessions.map(
              (session) => ({
                ...session,
              })
            ),
        });

        continue;
      }

      /**
       * Veckan finns redan.
       *
       * Kontrollera passen separat.
       */
      const existingWeek =
        mergedWeeks[
          existingWeekIndex
        ];

      const existingSessionIds =
        new Set(
          existingWeek.sessions.map(
            (session) =>
              session.id
          )
        );

      const missingSessions =
        seedWeek.sessions.filter(
          (session) =>
            !existingSessionIds.has(
              session.id
            )
        );

      /**
       * Lägg till de pass som saknas.
       */
      if (
        missingSessions.length > 0
      ) {
        mergedWeeks[
          existingWeekIndex
        ] = {
          ...existingWeek,
          sessions: [
            ...existingWeek.sessions,
            ...missingSessions.map(
              (session) => ({
                ...session,
              })
            ),
          ],
        };
      }
    }

    /**
     * Säkerställ att vi aldrig
     * sparar dubbletter.
     */
    const finalWeeks =
      dedupeWeeks(
        mergedWeeks
      );

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        finalWeeks
      )
    );

    return finalWeeks;
  } catch (error) {
    console.error(
      "Kunde inte läsa träningsplanen:",
      error
    );

    return cloneTrainingWeeks(
      getSeedWeeks()
    );
  }
}

/**
 * Sparar hela träningsplanen.
 */
async function saveTrainingWeeks(
  weeks: TrainingWeek[]
) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      dedupeWeeks(weeks)
    )
  );
}

/**
 * Lägger till ett nytt träningspass.
 */
export async function addTrainingSession(
  session: TrainingSession
): Promise<TrainingSession> {
  const weeks =
    await getStoredTrainingWeeks();

  const weekIndex =
    weeks.findIndex(
      (week) =>
        session.date >=
          week.startDate &&
        session.date <=
          addDays(
            week.startDate,
            6
          )
    );

  if (
    weekIndex === -1
  ) {
    throw new Error(
      "Kunde inte hitta veckan för träningspasset."
    );
  }

  const updatedWeeks =
    [...weeks];

  updatedWeeks[
    weekIndex
  ] = {
    ...updatedWeeks[
      weekIndex
    ],
    sessions: [
      ...updatedWeeks[
        weekIndex
      ].sessions,
      session,
    ],
  };

  await saveTrainingWeeks(
    updatedWeeks
  );

  return session;
}

/**
 * Uppdaterar ett befintligt träningspass.
 */
export async function updateTrainingSession(
  updatedSession: TrainingSession
): Promise<TrainingSession> {
  const weeks =
    await getStoredTrainingWeeks();

  const updatedWeeks =
    weeks.map((week) => ({
      ...week,
      sessions:
        week.sessions.filter(
          (session) =>
            session.id !==
            updatedSession.id
        ),
    }));

  const targetWeekIndex =
    updatedWeeks.findIndex(
      (week) =>
        updatedSession.date >=
          week.startDate &&
        updatedSession.date <=
          addDays(
            week.startDate,
            6
          )
    );

  if (
    targetWeekIndex === -1
  ) {
    throw new Error(
      "Kunde inte hitta veckan för det uppdaterade träningspasset."
    );
  }

  updatedWeeks[
    targetWeekIndex
  ] = {
    ...updatedWeeks[
      targetWeekIndex
    ],
    sessions: [
      ...updatedWeeks[
        targetWeekIndex
      ].sessions,
      updatedSession,
    ],
  };

  await saveTrainingWeeks(
    updatedWeeks
  );

  return updatedSession;
}

/**
 * Tar bort ett träningspass.
 */
export async function deleteTrainingSession(
  sessionId: string
): Promise<void> {
  const weeks =
    await getStoredTrainingWeeks();

  const updatedWeeks =
    weeks.map((week) => ({
      ...week,
      sessions:
        week.sessions.filter(
          (session) =>
            session.id !==
            sessionId
        ),
    }));

  await saveTrainingWeeks(
    updatedWeeks
  );
}

/**
 * Kopierar ett träningspass
 * till ett nytt datum.
 */
export async function copyTrainingSession(
  sourceSession: TrainingSession,
  targetDate: string,
  targetSlot:
    | "morning"
    | "afternoon"
    | "evening"
): Promise<TrainingSession> {
  const newSession: TrainingSession =
    {
      ...sourceSession,
      id: `${sourceSession.athleteId}-${targetDate}-${targetSlot}-${Date.now()}`,
      date: targetDate,
      day: getDayName(
        targetDate
      ),
      slot: targetSlot,
    };

  await addTrainingSession(
    newSession
  );

  return newSession;
}

/**
 * Skapar en ny tom träningsvecka.
 */
export async function addTrainingWeek(
  startDate: string
): Promise<TrainingWeek> {
  const weeks =
    await getStoredTrainingWeeks();

  const highestWeekNumber =
    weeks.reduce(
      (
        highest,
        week
      ) =>
        Math.max(
          highest,
          week.weekNumber
        ),
      0
    );

  const weekNumber =
    highestWeekNumber + 1;

  const newWeek: TrainingWeek =
    {
      id: `week-${weekNumber}-${Date.now()}`,
      weekNumber,
      title: `Vecka ${weekNumber}`,
      startDate,
      sessions: [],
    };

  const updatedWeeks = [
    ...weeks,
    newWeek,
  ];

  await saveTrainingWeeks(
    updatedWeeks
  );

  return newWeek;
}

/**
 * Hjälpfunktioner.
 */
function addDays(
  date: string,
  amount: number
): string {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
      amount
  );

  const year =
    result.getFullYear();

  const month =
    String(
      result.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      result.getDate()
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