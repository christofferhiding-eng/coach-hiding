import AsyncStorage from "@react-native-async-storage/async-storage";

import { CoachNote } from "./types";

const NOTES_STORAGE_KEY = "coach-notes";

export async function getNotes(): Promise<CoachNote[]> {
  const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);

  if (!storedNotes) {
    return [];
  }

  return JSON.parse(storedNotes);
}

export async function getNote(
  athleteId: string
): Promise<CoachNote | undefined> {
  const notes = await getNotes();

  return notes.find((note) => note.athleteId === athleteId);
}

export async function saveNote(
  athleteId: string,
  text: string
): Promise<void> {
  const notes = await getNotes();

  const existingNoteIndex = notes.findIndex(
    (note) => note.athleteId === athleteId
  );

  const newNote: CoachNote = {
    athleteId,
    text,
  };

  if (existingNoteIndex >= 0) {
    notes[existingNoteIndex] = newNote;
  } else {
    notes.push(newNote);
  }

  await AsyncStorage.setItem(
    NOTES_STORAGE_KEY,
    JSON.stringify(notes)
  );
}