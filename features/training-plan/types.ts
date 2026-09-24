export type TrainingSlot =
  | "none"
  | "morning"
  | "lunch"
  | "afternoon"
  | "evening";

export type TrainingType =
  | "easy"
  | "quality"
  | "long"
  | "rest";

export type TrainingSession = {
  id: string;

  athleteId: string;

  date: string;

  day: string;

  slot: TrainingSlot;

  title: string;

  description: string;

  type: TrainingType;
};

export type TrainingWeek = {
  id: string;

  weekNumber: number;

  title: string;

  startDate: string;

  sessions: TrainingSession[];
};
