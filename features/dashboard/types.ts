export type DashboardUser = {
    firstName: string;
    greeting: string;
    goalName: string;
    goalDate: string;
  };
  
  export type DailyStatus = {
    title: string;
    score: number;
    message: string;
  };
  
  export type TodayRun = {
    title: string;
    time: string;
    description: string;
  };
  
  export type CoachInsight = {
    title: string;
    message: string;
  };
  
  export type WeeklyGoal = {
    completed: number;
    goal: number;
    plannedByToday: number;

  };
  
  export type DashboardData = {
    user: DashboardUser;
    dailyStatus: DailyStatus;
    todayRun: TodayRun;
    coachInsight: CoachInsight;
    weeklyGoal: WeeklyGoal;
  };