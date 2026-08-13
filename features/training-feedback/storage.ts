import AsyncStorage from "@react-native-async-storage/async-storage";

import { TrainingFeedback } from "./types";

const FEEDBACK_STORAGE_KEY = "training-feedback";

export async function getFeedbacks(): Promise<TrainingFeedback[]> {
  const storedFeedback = await AsyncStorage.getItem(
    FEEDBACK_STORAGE_KEY
  );

  if (!storedFeedback) {
    return [];
  }

  return JSON.parse(storedFeedback);
}

export async function getFeedback(
  sessionId: string
): Promise<TrainingFeedback | undefined> {
  const feedbacks = await getFeedbacks();

  return feedbacks.find(
    (feedback) => feedback.sessionId === sessionId
  );
}

export async function saveFeedback(
  sessionId: string,
  rpe: number,
  comment: string
): Promise<void> {
  const feedbacks = await getFeedbacks();

  const existingIndex = feedbacks.findIndex(
    (feedback) => feedback.sessionId === sessionId
  );

  const feedback: TrainingFeedback = {
    sessionId,
    rpe,
    comment,
  };

  if (existingIndex >= 0) {
    feedbacks[existingIndex] = feedback;
  } else {
    feedbacks.push(feedback);
  }

  await AsyncStorage.setItem(
    FEEDBACK_STORAGE_KEY,
    JSON.stringify(feedbacks)
  );
}