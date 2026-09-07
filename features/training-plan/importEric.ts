import { supabase } from "@/lib/supabase";
import { ericTrainingWeeks } from "./data";

export async function importEricTrainingPlan() {
  const sessions = ericTrainingWeeks.flatMap(
    (week) => week.sessions
  );

  const rows = sessions.map(
    (session) => ({
      id: session.id,
      athlete_id: session.athleteId,
      date: session.date,
      day: session.day,
      slot: session.slot,
      title: session.title,
      description: session.description,
      type: session.type,
    })
  );

  const { data, error } =
    await supabase
      .from("training_sessions")
      .upsert(rows, {
        onConflict: "id",
      })
      .select();

  if (error) {
    console.error(
      "Kunde inte importera Erics träningsplan:",
      error
    );

    throw error;
  }

  console.log(
    `Importerade ${data?.length ?? 0} träningspass för Eric.`
  );

  return data;
}