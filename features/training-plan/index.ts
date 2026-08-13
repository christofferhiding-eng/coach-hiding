export {
    getStoredTrainingWeeks,
    saveTrainingWeeks,
    addTrainingSession,
    copyTrainingSession,
    updateTrainingSession,
    deleteTrainingSession,
    addTrainingWeek,
    moveTrainingSession,
  } from "./storage";
  
  export {
    trainingWeeks,
  } from "./data";
  
  export type {
    TrainingSession,
    TrainingWeek,
    TrainingSlot,
    TrainingType,
  } from "./types";