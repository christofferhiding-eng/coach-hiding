import AsyncStorage from "@react-native-async-storage/async-storage";

import { TrainingCompletion } from "./types";

const COMPLETION_STORAGE_KEY = "training-completions";

export async function getCompletions(): Promise<TrainingCompletion[]> {
  const storedCompletions = await AsyncStorage.getItem(
    COMPLETION_STORAGE_KEY
  );

  if (!storedCompletions) {
    return [];
  }

  return JSON.parse(storedCompletions);
}

export async function isSessionCompleted(
  sessionId: string
): Promise<boolean> {
  const completions = await getCompletions();

  return completions.some(
    (completion) =>
      completion.sessionId === sessionId &&
      completion.completed
  );
}

export async function setSessionCompleted(
  sessionId: string,
  completed: boolean
): Promise<void> {
  const completions = await getCompletions();

  const existingIndex = completions.findIndex(
    (completion) => completion.sessionId === sessionId
  );

  const completion: TrainingCompletion = {
    sessionId,
    completed,
  };

  if (existingIndex >= 0) {
    completions[existingIndex] = completion;
  } else {
    completions.push(completion);
  }

  await AsyncStorage.setItem(
    COMPLETION_STORAGE_KEY,
    JSON.stringify(completions)
  );
}