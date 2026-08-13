import { supabase } from "./supabase";

export type UserRole =
  | "coach"
  | "athlete";

export type UserProfile = {
  id: string;
  name: string;
  role: UserRole;
  athlete_id: string | null;
};

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, name, role, athlete_id"
    )
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  return profile as UserProfile;
}