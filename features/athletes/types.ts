export type AthleteStatus = "green" | "yellow" | "red";

export type Athlete = {
  id: string;
  name: string;

  status: AthleteStatus;
  statusText: string;
  score: number;

  training: string;
  message: string;

  weeklyDistance: number;
  weeklyGoal: number;

  lastRun: string;
  nextKeySession: string;

  greeting: {
    title: string;
    message: string;
  };

  coachMessage: {
    title: string;
    message: string;
  };
};