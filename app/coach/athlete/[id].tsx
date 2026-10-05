import React, {
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import TrainingSessionForm from "@/components/training/TrainingSessionForm";

import { supabase } from "@/lib/supabase";

import type {
  TrainingSession,
  TrainingSlot,
  TrainingType,
} from "@/features/training-plan";

const TYPE_ICONS = {
  easy: "🟢",
  quality: "🔥",
  long: "🏃",
  rest: "⚪",
};

const SLOT_LABELS = {
  morning: "Förmiddag",
  afternoon: "Eftermiddag",
  evening: "Kväll",
};

const SLOT_ICONS = {
  morning: "☀️",
  afternoon: "🌤️",
  evening: "🌙",
};

const WEEK_DAYS = [
  { day: "Mån", offset: 0 },
  { day: "Tis", offset: 1 },
  { day: "Ons", offset: 2 },
  { day: "Tor", offset: 3 },
  { day: "Fre", offset: 4 },
  { day: "Lör", offset: 5 },
  { day: "Sön", offset: 6 },
];

type TrainingComment = {
  id: string;
  training_session_id: string;
  athlete_id: string;
  author_id: string;
  author_role: "athlete" | "coach";
  message: string;
  created_at: string;
  read_at: string | null;
};

type CoachAthlete = {
  id: string;
  name: string;
  status: "green" | "yellow" | "red";
  statusText: string;
};

type SupabaseSession = {
  id: string;
  athlete_id: string;
  date: string;
  day: string;
  slot: TrainingSlot;
  title: string;
  description: string;
  type: TrainingType;
};

type TrainingCycleType =
  | "grundträning"
  | "tävlingsförberedande"
  | "specifik period"
  | "tävlingsperiod";

type TrainingCycle = {
  id: string;
  athlete_id: string;
  type: TrainingCycleType;
  name: string;
  start_date: string;
  end_date: string;
  description: string | null;
};

type CycleForm = {
  type: TrainingCycleType;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
};

const CYCLE_TYPES: {
  value: TrainingCycleType;
  label: string;
}[] = [
  { value: "grundträning", label: "Grundträning" },
  { value: "tävlingsförberedande", label: "Tävlingsförberedande" },
  { value: "specifik period", label: "Specifik period" },
  { value: "tävlingsperiod", label: "Tävlingsperiod" },
];

export default function CoachAthleteScreen() {
  const { id, session } =
  useLocalSearchParams<{
    id: string;
    session?: string;
  }>();

  const router = useRouter();

  const { width } =
    useWindowDimensions();

  const isDesktop = width >= 900;

  const [athlete, setAthlete] =
    useState<CoachAthlete | null>(null);

  const [loadingAthlete, setLoadingAthlete] =
    useState(true);

  const [sessions, setSessions] =
    useState<TrainingSession[]>([]);

  const [weekStart, setWeekStart] =
    useState<string>(() =>
      getMonday(
        new Date()
      )
    );

  const [viewMode, setViewMode] =
    useState<"week" | "month" | "profile">("week");

  const [monthStart, setMonthStart] =
    useState<string>(() =>
      getMonthStart(
        formatISODate(new Date())
      )
    );

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const [editingSession, setEditingSession] =
    useState<TrainingSession | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [completedSessions, setCompletedSessions] =
    useState<Record<string, boolean>>({});

  const [sessionRpe, setSessionRpe] =
    useState<Record<string, number>>({});

  const [error, setError] =
    useState<string | null>(null);

  const [cycles, setCycles] =
    useState<TrainingCycle[]>([]);

  const [showCycleForm, setShowCycleForm] =
    useState(false);

  const [editingCycleId, setEditingCycleId] =
    useState<string | null>(null);

  const [cycleForm, setCycleForm] =
    useState<CycleForm>(createEmptyCycleForm());

  const [savingCycle, setSavingCycle] =
    useState(false);

  const [trainingComments, setTrainingComments] =
    useState<Record<string, TrainingComment[]>>({});

  const [commentText, setCommentText] =
    useState("");

  const [savingComment, setSavingComment] =
    useState(false);

  const [commentMessage, setCommentMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    loadAthlete();
    loadSessions();
    loadCycles();
    loadCompletedSessions();
    loadSessionRpe();
    loadTrainingComments();
  }, [id]);

  async function loadAthlete() {
    if (!id) {
      return;
    }

    try {
      setLoadingAthlete(true);

      const byAthleteId = await supabase
        .from("profiles")
        .select("id, name, role, athlete_id")
        .eq("athlete_id", id)
        .eq("role", "athlete")
        .maybeSingle();

      if (byAthleteId.error) {
        throw byAthleteId.error;
      }

      let profile = byAthleteId.data;

      if (!profile) {
        const byProfileId = await supabase
          .from("profiles")
          .select("id, name, role, athlete_id")
          .eq("id", id)
          .eq("role", "athlete")
          .maybeSingle();

        if (byProfileId.error) {
          throw byProfileId.error;
        }

        profile = byProfileId.data;
      }

      if (!profile) {
        setAthlete(null);
        return;
      }

      setAthlete({
        id: profile.athlete_id ?? id,
        name: profile.name,
        status: "green",
        statusText: "Aktiv",
      });
    } catch (loadError) {
      console.error("Kunde inte läsa adepten:", loadError);
      setError("Kunde inte läsa adepten.");
    } finally {
      setLoadingAthlete(false);
    }
  }

  async function loadCycles() {
    if (!id) {
      return;
    }

    const { data, error } = await supabase
      .from("training_cycles")
      .select(
        "id, athlete_id, type, name, start_date, end_date, description"
      )
      .eq("athlete_id", id)
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Kunde inte läsa träningsperioderna:", error);
      setError(
        `Kunde inte läsa träningsperioderna: ${error.message}`
      );
      return;
    }

    setCycles((data ?? []) as TrainingCycle[]);
  }

  function openNewCycleForm() {
    setEditingCycleId(null);
    setCycleForm(createEmptyCycleForm());
    setShowCycleForm(true);
  }

  function openEditCycleForm(cycle: TrainingCycle) {
    setEditingCycleId(cycle.id);
    setCycleForm({
      type: cycle.type,
      name: cycle.name,
      startDate: cycle.start_date,
      endDate: cycle.end_date,
      description: cycle.description ?? "",
    });
    setShowCycleForm(true);
  }

  function closeCycleForm() {
    setShowCycleForm(false);
    setEditingCycleId(null);
    setCycleForm(createEmptyCycleForm());
  }

  async function handleSaveCycle() {
    if (!id) {
      return;
    }

    if (
      !cycleForm.name.trim() ||
      !cycleForm.startDate ||
      !cycleForm.endDate
    ) {
      setError("Fyll i namn, startdatum och slutdatum för perioden.");
      return;
    }

    if (cycleForm.endDate < cycleForm.startDate) {
      setError("Slutdatum kan inte ligga före startdatum.");
      return;
    }

    try {
      setSavingCycle(true);
      setError(null);

      const payload = {
        athlete_id: id,
        type: cycleForm.type,
        name: cycleForm.name.trim(),
        start_date: cycleForm.startDate,
        end_date: cycleForm.endDate,
        description: cycleForm.description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const result = editingCycleId
        ? await supabase
            .from("training_cycles")
            .update(payload)
            .eq("id", editingCycleId)
        : await supabase
            .from("training_cycles")
            .insert(payload);

      if (result.error) {
        throw result.error;
      }

      await loadCycles();
      closeCycleForm();
    } catch (saveError) {
      console.error("Kunde inte spara träningsperioden:", saveError);
      setError("Kunde inte spara träningsperioden.");
    } finally {
      setSavingCycle(false);
    }
  }

  async function handleDeleteCycle() {
    if (!editingCycleId) {
      return;
    }

    try {
      setSavingCycle(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from("training_cycles")
        .delete()
        .eq("id", editingCycleId);

      if (deleteError) {
        throw deleteError;
      }

      await loadCycles();
      closeCycleForm();
    } catch (deleteError) {
      console.error("Kunde inte ta bort träningsperioden:", deleteError);
      setError("Kunde inte ta bort träningsperioden.");
    } finally {
      setSavingCycle(false);
    }
  }

  async function loadSessionRpe() {
    if (!id) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc(
        "get_athlete_training_rpe",
        {
          p_athlete_id: id,
        }
      );

      if (error) {
        throw error;
      }

      setSessionRpe(
        (data ?? {}) as Record<string, number>
      );
    } catch (rpeError) {
      console.error(
        "Kunde inte läsa Borg-skattningar:",
        rpeError
      );
    }
  }

  async function loadTrainingComments() {
    if (!id) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc(
        "get_coach_training_comments"
      );

      if (error) {
        throw error;
      }

      const groupedComments: Record<string, TrainingComment[]> = {};

      for (const comment of (data ?? []) as TrainingComment[]) {
        if (!groupedComments[comment.training_session_id]) {
          groupedComments[comment.training_session_id] = [];
        }

        groupedComments[comment.training_session_id].push(comment);
      }

      setTrainingComments(groupedComments);
    } catch (commentError) {
      console.error("Kunde inte läsa dialogen:", commentError);
    }
  }

  async function handleSaveComment() {
    if (!id || !editingSession || !commentText.trim()) {
      return;
    }

    try {
      setSavingComment(true);
      setCommentMessage(null);

      const { data, error } = await supabase.rpc(
        "create_training_comment",
        {
          p_training_session_id: editingSession.id,
          p_athlete_id: id,
          p_message: commentText.trim(),
        }
      );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Meddelandet kunde inte skickas.");
      }

      const newComment = data as TrainingComment;

      setTrainingComments((current) => ({
        ...current,
        [editingSession.id]: [
          ...(current[editingSession.id] ?? []),
          newComment,
        ],
      }));

      setCommentText("");
      setCommentMessage("Meddelandet är skickat ✓");
    } catch (saveError) {
      console.error("Kunde inte skicka meddelande:", saveError);
      setCommentMessage(
        saveError instanceof Error
          ? saveError.message
          : "Kunde inte skicka meddelandet."
      );
    } finally {
      setSavingComment(false);
    }
  }

  async function loadCompletedSessions() {
    if (!id) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc(
        "get_coach_training_completion"
      );

      if (error) {
        throw error;
      }

      const completionMap: Record<string, boolean> = {};

      for (const completion of data ?? []) {
        if (
          completion.athlete_id === id
        ) {
          completionMap[
            completion.training_session_id
          ] = true;
        }
      }

      setCompletedSessions(completionMap);
    } catch (completionError) {
      console.error(
        "Kunde inte läsa genomförda pass:",
        completionError
      );
    }
  }

  async function loadSessions() {
    try {
      setLoading(true);
      setError(null);

      const {
        data,
        error,
      } = await supabase
        .from("training_sessions")
        .select(
          "id, athlete_id, date, day, slot, title, description, type"
        )
        .eq("athlete_id", id)
        .order("date", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      const mapped: TrainingSession[] =
        ((data ?? []) as SupabaseSession[]).map(
          (session) => ({
            id: session.id,
            athleteId:
              session.athlete_id,
            date: session.date,
            day: session.day,
            slot: session.slot,
            title: session.title,
            description:
              session.description ?? "",
            type: session.type,
          })
        );

        setSessions(mapped);

        if (session) {
          const sessionToOpen =
            mapped.find(
              (item) =>
                item.id === session
            );
        
          if (sessionToOpen) {
            setWeekStart(
              getMonday(
                parseDate(
                  sessionToOpen.date
                )
              )
            );
        
            setSelectedDate(
              sessionToOpen.date
            );
        
            setEditingSession(
              sessionToOpen
            );
          }
        }
    } catch (error) {
      console.error(
        "Kunde inte läsa träningsplanen:",
        error
      );

      setError(
        "Kunde inte läsa träningsplanen."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingAthlete) {
    return (
      <Screen>
        <BodyText>Laddar adept...</BodyText>
      </Screen>
    );
  }

  if (!athlete) {
    return (
      <Screen>
        <BodyText>Adepten kunde inte hittas.</BodyText>
      </Screen>
    );
  }

  const weekEnd =
    addDays(
      weekStart,
      6
    );

  const weekSessions =
    sessions.filter(
      (session) =>
        session.date >=
          weekStart &&
        session.date <=
          weekEnd
    );

  const days =
    createWeekDays(
      weekStart,
      weekSessions
    );

  const weekNumber =
    getISOWeek(
      parseDate(
        weekStart
      )
    );

  const selectedSession =
    editingSession;

  async function handleSaveSession(
    data: {
      date: string;
      slot: TrainingSlot;
      type: TrainingType;
      title: string;
      description: string;
    }
  ) {
    try {
      setSaving(true);
      setError(null);

      const isCreatingSession = !editingSession;

      if (editingSession) {
        const updatedSession: TrainingSession =
          {
            ...editingSession,
            date: data.date,
            day: getDayName(
              data.date
            ),
            slot: data.slot,
            type: data.type,
            title: data.title,
            description:
              data.description,
          };

        const {
          error,
        } = await supabase
          .from("training_sessions")
          .update({
            date: updatedSession.date,
            day: updatedSession.day,
            slot: updatedSession.slot,
            type: updatedSession.type,
            title: updatedSession.title,
            description:
              updatedSession.description,
          })
          .eq(
            "id",
            updatedSession.id
          );

        if (error) {
          throw error;
        }
      } else {
        const newSession: TrainingSession =
          {
            id: `${athlete.id}-${Date.now()}`,
            athleteId: athlete.id,
            date: data.date,
            day: getDayName(
              data.date
            ),
            slot: data.slot,
            type: data.type,
            title: data.title,
            description:
              data.description,
          };

        const {
          error,
        } = await supabase
          .from("training_sessions")
          .insert({
            id: newSession.id,
            athlete_id:
              newSession.athleteId,
            date: newSession.date,
            day: newSession.day,
            slot: newSession.slot,
            type: newSession.type,
            title: newSession.title,
            description:
              newSession.description,
          });

        if (error) {
          throw error;
        }
      }

      await loadSessions();

      // När ett nytt pass skapas visar vi automatiskt veckan
      // som det nya passet tillhör. Vid redigering behåller vi
      // den vecka som coachen redan befinner sig i.
      if (isCreatingSession) {
        setWeekStart(
          getMonday(
            parseDate(data.date)
          )
        );
      }

      closePanel();
    } catch (error) {
      console.error(
        "Kunde inte spara träningspasset:",
        error
      );

      setError(
        "Kunde inte spara träningspasset."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSession() {
    if (!editingSession) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase.rpc(
        "delete_training_session",
        {
          p_session_id: editingSession.id,
        }
      );

      if (error) {
        throw error;
      }

      await loadSessions();

      closePanel();
    } catch (error) {
      console.error(
        "Kunde inte ta bort träningspasset:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Kunde inte ta bort träningspasset."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleAddSession(
    date: string
  ) {
    setEditingSession(null);
    setSelectedDate(date);
    setCommentText("");
    setCommentMessage(null);
  }

  function handleEditSession(
    session: TrainingSession
  ) {
    setSelectedDate(
      session.date
    );

    setEditingSession(
      session
    );
    setCommentText("");
    setCommentMessage(null);
  }

  function closePanel() {
    setSelectedDate(null);
    setEditingSession(null);
    setCommentText("");
    setCommentMessage(null);
  }

  function changeWeek(
    amount: number
  ) {
    setWeekStart(
      addDays(
        weekStart,
        amount * 7
      )
    );

    closePanel();
  }

  function changeMonth(
    amount: number
  ) {
    setMonthStart(
      addMonths(
        monthStart,
        amount
      )
    );

    closePanel();
  }

  function switchView(
    nextView: "week" | "month" | "profile"
  ) {
    if (nextView === "month") {
      setMonthStart(
        getMonthStart(weekStart)
      );
    } else if (nextView === "week") {
      setWeekStart(
        getMonday(
          parseDate(monthStart)
        )
      );
    }

    closePanel();
    setViewMode(nextView);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: athlete.name,
        }}
      />

      <Screen>
        <View style={styles.header}>
          <SectionLabel>
            ADEPT
          </SectionLabel>

          <Metric>
            {athlete.name}
          </Metric>

          <BodyText
            style={styles.status}
          >
            {getStatusIcon(
              athlete.status
            )}{" "}
            {athlete.statusText}
          </BodyText>

          <View
            style={
              styles.headerActions
            }
          >
            <Pressable
              onPress={() =>
                router.push(
                  `/athlete/${athlete.id}`
                )
              }
              style={
                styles.previewButton
              }
            >
              <BodyText
                style={
                  styles.previewButtonText
                }
              >
                👤 Visa som adept
              </BodyText>
            </Pressable>
          </View>
        </View>

        <Card>
          <View style={styles.cycleHeader}>
            <View style={styles.cycleHeaderText}>
              <SectionLabel>TRÄNINGSPERIODER</SectionLabel>
              <BodyText style={styles.cycleIntro}>
                Lägg till manuella perioder med egna start- och slutdatum.
              </BodyText>
            </View>
            <Pressable
              onPress={openNewCycleForm}
              style={styles.cycleAddButton}
            >
              <BodyText style={styles.cycleAddButtonText}>+ Ny</BodyText>
            </Pressable>
          </View>

          {cycles.length === 0 ? (
            <BodyText style={styles.cycleEmpty}>
              Inga träningsperioder har lagts till ännu.
            </BodyText>
          ) : (
            <View style={styles.cycleList}>
              {cycles.map((cycle) => (
                <Pressable
                  key={cycle.id}
                  onPress={() => openEditCycleForm(cycle)}
                  style={styles.cycleItem}
                >
                  <View style={styles.cycleItemText}>
                    <BodyText style={styles.cycleType}>
                      {getCycleTypeLabel(cycle.type)}
                    </BodyText>
                    <BodyText style={styles.cycleName}>
                      {cycle.name}
                    </BodyText>
                    <BodyText style={styles.cycleDates}>
                      {formatCycleDate(cycle.start_date)}–{formatCycleDate(cycle.end_date)}
                    </BodyText>
                    {cycle.description ? (
                      <BodyText style={styles.cycleDescription}>
                        {cycle.description}
                      </BodyText>
                    ) : null}
                  </View>
                  <BodyText style={styles.cycleEditIcon}>›</BodyText>
                </Pressable>
              ))}
            </View>
          )}

          {showCycleForm && (
            <View style={styles.cycleForm}>
              <View style={styles.cycleFormTitleRow}>
                <BodyText style={styles.cycleFormTitle}>
                  {editingCycleId ? "Redigera träningsperiod" : "Ny träningsperiod"}
                </BodyText>
                <Pressable onPress={closeCycleForm}>
                  <BodyText style={styles.cycleCloseText}>×</BodyText>
                </Pressable>
              </View>

              <BodyText style={styles.inputLabel}>Typ</BodyText>
              <View style={styles.cycleTypeOptions}>
                {CYCLE_TYPES.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setCycleForm((current) => ({
                        ...current,
                        type: option.value,
                      }))
                    }
                    style={[
                      styles.cycleTypeOption,
                      cycleForm.type === option.value &&
                        styles.cycleTypeOptionSelected,
                    ]}
                  >
                    <BodyText
                      style={[
                        styles.cycleTypeOptionText,
                        cycleForm.type === option.value &&
                          styles.cycleTypeOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </BodyText>
                  </Pressable>
                ))}
              </View>

              <BodyText style={styles.inputLabel}>Namn</BodyText>
              <TextInput
                value={cycleForm.name}
                onChangeText={(name) =>
                  setCycleForm((current) => ({ ...current, name }))
                }
                placeholder="Exempelvis Grundträning 1"
                placeholderTextColor="#8A94A6"
                style={styles.cycleInput}
              />

              <BodyText style={styles.inputLabel}>Startdatum (ÅÅÅÅ-MM-DD)</BodyText>
              <TextInput
                value={cycleForm.startDate}
                onChangeText={(startDate) =>
                  setCycleForm((current) => ({ ...current, startDate }))
                }
                placeholder="2026-10-01"
                placeholderTextColor="#8A94A6"
                style={styles.cycleInput}
                autoCapitalize="none"
              />

              <BodyText style={styles.inputLabel}>Slutdatum (ÅÅÅÅ-MM-DD)</BodyText>
              <TextInput
                value={cycleForm.endDate}
                onChangeText={(endDate) =>
                  setCycleForm((current) => ({ ...current, endDate }))
                }
                placeholder="2026-11-15"
                placeholderTextColor="#8A94A6"
                style={styles.cycleInput}
                autoCapitalize="none"
              />

              <BodyText style={styles.inputLabel}>Beskrivning (valfritt)</BodyText>
              <TextInput
                value={cycleForm.description}
                onChangeText={(description) =>
                  setCycleForm((current) => ({ ...current, description }))
                }
                placeholder="Periodens fokus och syfte"
                placeholderTextColor="#8A94A6"
                style={[styles.cycleInput, styles.cycleDescriptionInput]}
                multiline
              />

              <View style={styles.cycleFormActions}>
                <Pressable
                  onPress={handleSaveCycle}
                  disabled={savingCycle}
                  style={styles.cycleSaveButton}
                >
                  <BodyText style={styles.cycleSaveButtonText}>
                    {savingCycle ? "Sparar..." : "Spara period"}
                  </BodyText>
                </Pressable>
                {editingCycleId && (
                  <Pressable
                    onPress={handleDeleteCycle}
                    disabled={savingCycle}
                    style={styles.cycleDeleteButton}
                  >
                    <BodyText style={styles.cycleDeleteButtonText}>Ta bort</BodyText>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </Card>

        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => switchView("week")}
            style={[
              styles.viewToggleButton,
              viewMode === "week" &&
                styles.viewToggleButtonActive,
            ]}
          >
            <BodyText
              style={[
                styles.viewToggleText,
                viewMode === "week" &&
                  styles.viewToggleTextActive,
              ]}
            >
              Vecka
            </BodyText>
          </Pressable>

          <Pressable
            onPress={() => switchView("month")}
            style={[
              styles.viewToggleButton,
              viewMode === "month" &&
                styles.viewToggleButtonActive,
            ]}
          >
            <BodyText
              style={[
                styles.viewToggleText,
                viewMode === "month" &&
                  styles.viewToggleTextActive,
              ]}
            >
              Månad
            </BodyText>
          </Pressable>

          <Pressable
            onPress={() => switchView("profile")}
            style={[
              styles.viewToggleButton,
              styles.profileToggleButton,
              viewMode === "profile" &&
                styles.viewToggleButtonActive,
            ]}
          >
            <BodyText
              style={[
                styles.viewToggleText,
                viewMode === "profile" &&
                  styles.viewToggleTextActive,
              ]}
            >
              Profil & prestation
            </BodyText>
          </Pressable>
        </View>

        {viewMode !== "profile" && (
          <>
        <View
          style={[
            styles.weekNavigation,
            isDesktop &&
              styles.weekNavigationDesktop,
          ]}
        >
          <Pressable
            onPress={() =>
              viewMode === "week"
                ? changeWeek(-1)
                : changeMonth(-1)
            }
            style={
              styles.navigationButton
            }
          >
            <BodyText
              style={
                styles.navigationText
              }
            >
              ←
            </BodyText>
          </Pressable>

          <View
            style={styles.weekTitle}
          >
            <SectionLabel>
              TRÄNINGSPLAN
            </SectionLabel>

            <BodyText
              style={styles.weekNumber}
            >
              {viewMode === "week"
                ? `Vecka ${weekNumber}`
                : formatMonthTitle(monthStart)}
            </BodyText>

            <BodyText
              style={styles.weekDate}
            >
              {viewMode === "week"
                ? formatWeekRange(weekStart)
                : "Mån–sön"}
            </BodyText>
          </View>

          <Pressable
            onPress={() =>
              viewMode === "week"
                ? changeWeek(1)
                : changeMonth(1)
            }
            style={
              styles.navigationButton
            }
          >
            <BodyText
              style={
                styles.navigationText
              }
            >
              →
            </BodyText>
          </Pressable>
        </View>

        {error && (
          <BodyText
            style={styles.error}
          >
            {error}
          </BodyText>
        )}

        <CycleOverview
          cycles={cycles}
          startDate={
            viewMode === "week"
              ? weekStart
              : monthStart
          }
          endDate={
            viewMode === "week"
              ? addDays(weekStart, 6)
              : getMonthEnd(monthStart)
          }
        />

        {loading ? (
          <View
            style={styles.loading}
          >
            <BodyText>
              Laddar träningsplan...
            </BodyText>
          </View>
        ) : (
          <View
            style={[
              styles.workspace,
              isDesktop &&
                styles.workspaceDesktop,
            ]}
          >
            <View
              style={[
                styles.calendarColumn,
                isDesktop &&
                  styles.calendarColumnDesktop,
              ]}
            >
              {viewMode === "week" ? (
                days.map((day) => (
                  <DayRow
                    key={day.date}
                    day={day}
                    onAddSession={() =>
                      handleAddSession(
                        day.date
                      )
                    }
                    onEditSession={
                      handleEditSession
                    }
                    completedSessions={
                      completedSessions
                    }
                  />
                ))
              ) : (
                <MonthCalendar
                  monthStart={monthStart}
                  sessions={sessions}
                  onAddSession={handleAddSession}
                  onEditSession={handleEditSession}
                  completedSessions={
                    completedSessions
                  }
                />
              )}
            </View>

            {isDesktop && (
              <View
                style={
                  styles.panelColumn
                }
              >
                {selectedDate ? (
                  <Card>
                    <View
                      style={
                        styles.panelHeader
                      }
                    >
                      <View
                        style={
                          styles.panelHeaderText
                        }
                      >
                        <SectionLabel>
                          {editingSession
                            ? "REDIGERA PASS"
                            : "NYTT PASS"}
                        </SectionLabel>

                        <BodyText
                          style={
                            styles.panelTitle
                          }
                        >
                          {editingSession
                            ? editingSession.title
                            : "Nytt träningspass"}
                        </BodyText>
                      </View>

                      <Pressable
                        onPress={
                          closePanel
                        }
                        style={
                          styles.closeButton
                        }
                      >
                        <BodyText
                          style={
                            styles.closeButtonText
                          }
                        >
                          ×
                        </BodyText>
                      </Pressable>
                    </View>

                    <TrainingSessionForm
                      date={
                        selectedDate
                      }
                      initialSession={
                        editingSession ??
                        undefined
                      }
                      onSave={
                        handleSaveSession
                      }
                      onDelete={
                        editingSession
                          ? handleDeleteSession
                          : undefined
                      }
                    />

                    {editingSession && (
                      <TrainingFeedbackSummary
                        completed={
                          completedSessions[editingSession.id] === true
                        }
                        rpe={sessionRpe[editingSession.id] ?? null}
                      />
                    )}

                    {editingSession && (
                      <TrainingCommentThread
                        session={editingSession}
                        comments={
                          trainingComments[editingSession.id] ?? []
                        }
                        commentText={commentText}
                        onChangeComment={setCommentText}
                        onSave={handleSaveComment}
                        saving={savingComment}
                        message={commentMessage}
                      />
                    )}

                    {saving && (
                      <BodyText
                        style={
                          styles.saving
                        }
                      >
                        Sparar...
                      </BodyText>
                    )}
                  </Card>
                ) : (
                  <Card>
                    <View
                      style={
                        styles.emptyPanel
                      }
                    >
                      <SectionLabel>
                        TRÄNINGSPLANERING
                      </SectionLabel>

                      <BodyText
                        style={
                          styles.emptyPanelTitle
                        }
                      >
                        Välj en dag
                      </BodyText>

                      <BodyText
                        style={
                          styles.emptyPanelText
                        }
                      >
                        Klicka på + för att
                        lägga till ett pass,
                        eller klicka på ett
                        befintligt pass för
                        att redigera det.
                      </BodyText>
                    </View>
                  </Card>
                )}
              </View>
            )}
          </View>
        )}

        {!isDesktop &&
          selectedDate && (
            <Card>
              <View
                style={
                  styles.panelHeader
                }
              >
                <View
                  style={
                    styles.panelHeaderText
                  }
                >
                  <SectionLabel>
                    {editingSession
                      ? "REDIGERA PASS"
                      : "NYTT PASS"}
                  </SectionLabel>

                  <BodyText
                    style={
                      styles.panelTitle
                    }
                  >
                    {editingSession
                      ? editingSession.title
                      : "Nytt träningspass"}
                  </BodyText>
                </View>

                <Pressable
                  onPress={
                    closePanel
                  }
                  style={
                    styles.closeButton
                  }
                >
                  <BodyText
                    style={
                      styles.closeButtonText
                    }
                  >
                    ×
                  </BodyText>
                </Pressable>
              </View>

              <TrainingSessionForm
                date={
                  selectedDate
                }
                initialSession={
                  editingSession ??
                  undefined
                }
                onSave={
                  handleSaveSession
                }
                onDelete={
                  editingSession
                    ? handleDeleteSession
                    : undefined
                }
              />

              {editingSession && (
                <TrainingCommentThread
                  session={editingSession}
                  comments={
                    trainingComments[editingSession.id] ?? []
                  }
                  commentText={commentText}
                  onChangeComment={setCommentText}
                  onSave={handleSaveComment}
                  saving={savingComment}
                  message={commentMessage}
                />
              )}

              {saving && (
                <BodyText
                  style={
                    styles.saving
                  }
                >
                  Sparar...
                </BodyText>
              )}
            </Card>
          )}
          </>
        )}

        {viewMode === "profile" && (
          <AthletePerformanceView
            athleteId={athlete.id}
            athleteName={athlete.name}
          />
        )}
      </Screen>
    </>
  );
}


function TrainingFeedbackSummary({
  completed,
  rpe,
}: {
  completed: boolean;
  rpe: number | null;
}) {
  return (
    <View style={styles.feedbackSection}>
      <View style={styles.feedbackHeader}>
        <View>
          <SectionLabel>ADEPTENS FEEDBACK</SectionLabel>
          <BodyText style={styles.feedbackTitle}>
            Hur passet upplevdes
          </BodyText>
        </View>

        <View
          style={[
            styles.feedbackStatus,
            completed
              ? styles.feedbackStatusCompleted
              : styles.feedbackStatusPending,
          ]}
        >
          <BodyText style={styles.feedbackStatusText}>
            {completed ? "Genomfört" : "Ej markerat"}
          </BodyText>
        </View>
      </View>

      <View style={styles.feedbackMetrics}>
        <View style={styles.feedbackMetric}>
          <BodyText style={styles.feedbackMetricLabel}>
            BORG
          </BodyText>
          <BodyText style={styles.feedbackMetricValue}>
            {rpe == null ? "–" : `${rpe}/20`}
          </BodyText>
        </View>

        <View style={styles.feedbackMetric}>
          <BodyText style={styles.feedbackMetricLabel}>
            STATUS
          </BodyText>
          <BodyText style={styles.feedbackMetricValue}>
            {completed ? "✓" : "–"}
          </BodyText>
        </View>
      </View>
    </View>
  );
}

function TrainingCommentThread({
  session,
  comments,
  commentText,
  onChangeComment,
  onSave,
  saving,
  message,
}: {
  session: TrainingSession;
  comments: TrainingComment[];
  commentText: string;
  onChangeComment: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  message: string | null;
}) {
  return (
    <View style={styles.commentSection}>
      <View style={styles.commentHeader}>
        <View style={styles.commentHeaderText}>
          <SectionLabel>DIALOG MED ADEPT</SectionLabel>
          <BodyText style={styles.commentSessionTitle}>
            {session.title}
          </BodyText>
        </View>
        {comments.length > 0 && (
          <BodyText style={styles.commentCount}>
            {comments.length} {comments.length === 1 ? "meddelande" : "meddelanden"}
          </BodyText>
        )}
      </View>

      {comments.length > 0 ? (
        <View style={styles.commentList}>
          {comments.map((comment) => (
            <View
              key={comment.id}
              style={[
                styles.commentBubble,
                comment.author_role === "coach"
                  ? styles.coachCommentBubble
                  : styles.athleteCommentBubble,
              ]}
            >
              <View style={styles.commentBubbleHeader}>
                <BodyText style={styles.commentAuthor}>
                  {comment.author_role === "coach" ? "Du" : "Adepten"}
                </BodyText>
                <BodyText style={styles.commentDate}>
                  {formatCommentDate(comment.created_at)}
                </BodyText>
              </View>

              <BodyText style={styles.commentBubbleText}>
                {comment.message}
              </BodyText>
            </View>
          ))}
        </View>
      ) : (
        <BodyText style={styles.noCommentsText}>
          Ingen meddelanden ännu.
        </BodyText>
      )}

      <TextInput
        value={commentText}
        onChangeText={onChangeComment}
        placeholder="Skriv ett svar till adepten..."
        placeholderTextColor="#8A94A6"
        multiline
        textAlignVertical="top"
        style={styles.commentInput}
      />

      <Pressable
        onPress={onSave}
        disabled={saving || !commentText.trim()}
        style={[
          styles.saveCommentButton,
          (saving || !commentText.trim()) &&
            styles.saveCommentButtonDisabled,
        ]}
      >
        {saving ? (
          <ActivityIndicator />
        ) : (
          <BodyText style={styles.saveCommentText}>
            Svara
          </BodyText>
        )}
      </Pressable>

      {message && (
        <BodyText style={styles.commentMessage}>
          {message}
        </BodyText>
      )}
    </View>
  );
}

function formatCommentDate(date: string) {
  return new Date(date).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AthleteTestValue = {
  id: string;
  athlete_id: string;
  test_date: string;
  lt_pulse: number | null;
  lt_pace_seconds: number | null;
  at_pulse: number | null;
  at_pace_seconds: number | null;
  lt_lactate: number | null;
  at_lactate: number | null;
  weight_kg: number | null;
  notes: string | null;
};

type AthletePersonalBest = {
  id: string;
  athlete_id: string;
  distance: string;
  time_seconds: number;
  achieved_date: string | null;
  notes: string | null;
};

type TestForm = {
  testDate: string;
  ltPulse: string;
  ltPace: string;
  atPulse: string;
  atPace: string;
  ltLactate: string;
  atLactate: string;
  weight: string;
  notes: string;
};

type PbForm = {
  distance: string;
  time: string;
  date: string;
  notes: string;
};

const STANDARD_DISTANCES = [
  "1500 m",
  "3 km",
  "5 km",
  "10 km",
  "Halvmaraton",
  "Maraton",
];

function AthletePerformanceView({
  athleteId,
  athleteName,
}: {
  athleteId: string;
  athleteName: string;
}) {
  const [tests, setTests] = useState<AthleteTestValue[]>([]);
  const [personalBests, setPersonalBests] = useState<AthletePersonalBest[]>([]);
  const [coachNotes, setCoachNotes] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingPbId, setEditingPbId] = useState<string | null>(null);
  const [testForm, setTestForm] = useState<TestForm>(createEmptyTestForm());
  const [pbForm, setPbForm] = useState<PbForm>(createEmptyPbForm());

  useEffect(() => {
    loadProfile();
  }, [athleteId]);

  async function loadProfile() {
    try {
      setLoadingProfile(true);
      setError(null);

      const [testsResult, pbsResult, notesResult] = await Promise.all([
        supabase
          .from("athlete_test_values")
          .select("id, athlete_id, test_date, lt_pulse, lt_pace_seconds, at_pulse, at_pace_seconds, lt_lactate, at_lactate, weight_kg, notes")
          .eq("athlete_id", athleteId)
          .order("test_date", { ascending: false }),
        supabase
          .from("athlete_personal_bests")
          .select("id, athlete_id, distance, time_seconds, achieved_date, notes")
          .eq("athlete_id", athleteId)
          .order("achieved_date", { ascending: false, nullsFirst: false }),
        supabase
          .from("athlete_coach_notes")
          .select("notes")
          .eq("athlete_id", athleteId)
          .maybeSingle(),
      ]);

      if (testsResult.error) throw testsResult.error;
      if (pbsResult.error) throw pbsResult.error;
      if (notesResult.error) throw notesResult.error;

      const loadedTests = (testsResult.data ?? []) as AthleteTestValue[];
      setTests(loadedTests);
      setPersonalBests((pbsResult.data ?? []) as AthletePersonalBest[]);
      setCoachNotes(notesResult.data?.notes ?? "");

      if (loadedTests[0]) {
        setTestForm(testValueToForm(loadedTests[0]));
      } else {
        setTestForm(createEmptyTestForm());
      }
    } catch (loadError) {
      console.error("Kunde inte läsa prestationsprofilen:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Kunde inte läsa prestationsprofilen."
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  async function saveTest() {
    try {
      setSaving(true);
      setError(null);

      if (!testForm.testDate) {
        throw new Error("Ange datum för testet.");
      }

      const payload = {
        athlete_id: athleteId,
        test_date: testForm.testDate,
        lt_pulse: parseOptionalInteger(testForm.ltPulse),
        lt_pace_seconds: parsePace(testForm.ltPace),
        at_pulse: parseOptionalInteger(testForm.atPulse),
        at_pace_seconds: parsePace(testForm.atPace),
        lt_lactate: parseOptionalNumber(testForm.ltLactate),
        at_lactate: parseOptionalNumber(testForm.atLactate),
        weight_kg: parseOptionalNumber(testForm.weight),
        notes: testForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const result = latestTest
        ? await supabase
            .from("athlete_test_values")
            .update(payload)
            .eq("id", latestTest.id)
        : await supabase
            .from("athlete_test_values")
            .insert(payload);

      if (result.error) throw result.error;

      await loadProfile();
      setEditingTest(false);
    } catch (saveError) {
      console.error("Kunde inte spara testvärden:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Kunde inte spara testvärden."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteTest(testId: string) {
    try {
      setSaving(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from("athlete_test_values")
        .delete()
        .eq("id", testId);

      if (deleteError) throw deleteError;

      await loadProfile();
    } catch (deleteError) {
      console.error("Kunde inte ta bort testet:", deleteError);
      setError("Kunde inte ta bort testet.");
    } finally {
      setSaving(false);
    }
  }

  async function savePersonalBest() {
    try {
      setSaving(true);
      setError(null);

      const timeSeconds = parseTimeToSeconds(pbForm.time);

      if (!pbForm.distance.trim()) {
        throw new Error("Ange distans.");
      }

      if (!timeSeconds) {
        throw new Error("Ange en giltig tid, exempelvis 35:12.");
      }

      const payload = {
        athlete_id: athleteId,
        distance: pbForm.distance.trim(),
        time_seconds: timeSeconds,
        achieved_date: pbForm.date || null,
        notes: pbForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingPbId) {
        const { error: updateError } = await supabase
          .from("athlete_personal_bests")
          .update(payload)
          .eq("id", editingPbId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("athlete_personal_bests")
          .insert(payload);

        if (insertError) throw insertError;
      }

      await loadProfile();
      closePbForm();
    } catch (saveError) {
      console.error("Kunde inte spara personbästat:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Kunde inte spara personbästat."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deletePersonalBest(id: string) {
    try {
      setSaving(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from("athlete_personal_bests")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await loadProfile();
    } catch (deleteError) {
      console.error("Kunde inte ta bort personbästat:", deleteError);
      setError("Kunde inte ta bort personbästat.");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    try {
      setSaving(true);
      setError(null);

      const { error: saveError } = await supabase
        .from("athlete_coach_notes")
        .upsert(
          {
            athlete_id: athleteId,
            notes: coachNotes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "athlete_id" }
        );

      if (saveError) throw saveError;

      setEditingNotes(false);
    } catch (saveError) {
      console.error("Kunde inte spara coachanteckningarna:", saveError);
      setError("Kunde inte spara coachanteckningarna.");
    } finally {
      setSaving(false);
    }
  }

  function openNewPbForm() {
    setEditingPbId(null);
    setPbForm(createEmptyPbForm());
  }

  function openEditPbForm(pb: AthletePersonalBest) {
    setEditingPbId(pb.id);
    setPbForm({
      distance: pb.distance,
      time: formatTime(pb.time_seconds),
      date: pb.achieved_date ?? "",
      notes: pb.notes ?? "",
    });
  }

  function closePbForm() {
    setEditingPbId(null);
    setPbForm(createEmptyPbForm());
  }

  const latestTest = tests[0] ?? null;

  if (loadingProfile) {
    return (
      <Card>
        <BodyText>Laddar profil och prestation...</BodyText>
      </Card>
    );
  }

  return (
    <View style={styles.performanceView}>
      <View style={styles.performanceIntro}>
        <View style={styles.performanceIntroText}>
          <SectionLabel>PROFIL & PRESTATION</SectionLabel>
          <BodyText style={styles.performanceTitle}>{athleteName}</BodyText>
          <BodyText style={styles.performanceSubtitle}>
            Fysiologi, personbästa och coachanteckningar samlade på ett ställe.
          </BodyText>
        </View>
      </View>

      {error && <BodyText style={styles.error}>{error}</BodyText>}

      <Card>
        <View style={styles.performanceSectionHeader}>
          <View>
            <SectionLabel>FYSIOLOGI</SectionLabel>
            <BodyText style={styles.performanceSectionTitle}>
              Senaste testet
            </BodyText>
          </View>
          <Pressable
            onPress={() => {
              if (!editingTest && latestTest) {
                setTestForm(testValueToForm(latestTest));
              }
              setEditingTest((current) => !current);
            }}
            style={styles.smallActionButton}
          >
            <BodyText style={styles.smallActionButtonText}>
              {editingTest ? "Stäng" : "Redigera"}
            </BodyText>
          </Pressable>
        </View>

        {latestTest ? (
          <>
            <View style={styles.metricGrid}>
              <PerformanceMetric label="LT-puls" value={formatPulse(latestTest.lt_pulse)} />
              <PerformanceMetric label="LT-fart" value={formatPace(latestTest.lt_pace_seconds)} />
              <PerformanceMetric label="AT-puls" value={formatPulse(latestTest.at_pulse)} />
              <PerformanceMetric label="AT-fart" value={formatPace(latestTest.at_pace_seconds)} />
            </View>
            <View style={styles.testMetaRow}>
              <BodyText style={styles.testMeta}>Test: {formatLongDate(latestTest.test_date)}</BodyText>
              {latestTest.weight_kg != null && (
                <BodyText style={styles.testMeta}>{latestTest.weight_kg} kg</BodyText>
              )}
            </View>
          </>
        ) : (
          <BodyText style={styles.emptyPerformanceText}>
            Inga testvärden är registrerade ännu.
          </BodyText>
        )}

        {latestTest?.notes ? (
          <BodyText style={styles.testNotes}>{latestTest.notes}</BodyText>
        ) : null}

        {editingTest && (
          <View style={styles.performanceForm}>
            <BodyText style={styles.inputLabel}>Datum</BodyText>
            <TextInput
              value={testForm.testDate}
              onChangeText={(testDate) => setTestForm((current) => ({ ...current, testDate }))}
              placeholder="2026-10-01"
              placeholderTextColor="#8A94A6"
              style={styles.performanceInput}
            />

            <View style={styles.formTwoColumns}>
              <PerformanceInput label="LT-puls" value={testForm.ltPulse} onChange={(value) => setTestForm((current) => ({ ...current, ltPulse: value }))} placeholder="160" />
              <PerformanceInput label="LT-fart" value={testForm.ltPace} onChange={(value) => setTestForm((current) => ({ ...current, ltPace: value }))} placeholder="3:50" />
              <PerformanceInput label="AT-puls" value={testForm.atPulse} onChange={(value) => setTestForm((current) => ({ ...current, atPulse: value }))} placeholder="178" />
              <PerformanceInput label="AT-fart" value={testForm.atPace} onChange={(value) => setTestForm((current) => ({ ...current, atPace: value }))} placeholder="3:25" />
              <PerformanceInput label="LT-laktat" value={testForm.ltLactate} onChange={(value) => setTestForm((current) => ({ ...current, ltLactate: value }))} placeholder="3.0" />
              <PerformanceInput label="AT-laktat" value={testForm.atLactate} onChange={(value) => setTestForm((current) => ({ ...current, atLactate: value }))} placeholder="4.0" />
              <PerformanceInput label="Vikt" value={testForm.weight} onChange={(value) => setTestForm((current) => ({ ...current, weight: value }))} placeholder="72.5" />
            </View>

            <BodyText style={styles.inputLabel}>Testanteckning</BodyText>
            <TextInput
              value={testForm.notes}
              onChangeText={(notes) => setTestForm((current) => ({ ...current, notes }))}
              placeholder="Exempelvis testförhållanden, känsla eller kommentar"
              placeholderTextColor="#8A94A6"
              style={[styles.performanceInput, styles.multilineInput]}
              multiline
            />

            <View style={styles.formActions}>
              <Pressable onPress={saveTest} disabled={saving} style={styles.primaryActionButton}>
                <BodyText style={styles.primaryActionText}>{saving ? "Sparar..." : "Spara test"}</BodyText>
              </Pressable>
              {latestTest && (
                <Pressable onPress={() => deleteTest(latestTest.id)} disabled={saving} style={styles.dangerActionButton}>
                  <BodyText style={styles.dangerActionText}>Ta bort senaste</BodyText>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.performanceSectionHeader}>
          <View>
            <SectionLabel>PERSONBÄSTA</SectionLabel>
            <BodyText style={styles.performanceSectionTitle}>Tävlingsresultat</BodyText>
          </View>
          <Pressable onPress={openNewPbForm} style={styles.smallActionButton}>
            <BodyText style={styles.smallActionButtonText}>+ Lägg till</BodyText>
          </Pressable>
        </View>

        {personalBests.length ? (
          <View style={styles.pbList}>
            {sortPersonalBests(personalBests).map((pb) => (
              <Pressable key={pb.id} onPress={() => openEditPbForm(pb)} style={styles.pbRow}>
                <View style={styles.pbDistanceBlock}>
                  <BodyText style={styles.pbDistance}>{pb.distance}</BodyText>
                  {pb.achieved_date ? <BodyText style={styles.pbDate}>{formatLongDate(pb.achieved_date)}</BodyText> : null}
                </View>
                <BodyText style={styles.pbTime}>{formatTime(pb.time_seconds)}</BodyText>
                <BodyText style={styles.pbPace}>{formatPbPace(pb.distance, pb.time_seconds)}</BodyText>
                <BodyText style={styles.pbEditIcon}>›</BodyText>
              </Pressable>
            ))}
          </View>
        ) : (
          <BodyText style={styles.emptyPerformanceText}>Inga personbästa är registrerade ännu.</BodyText>
        )}

        <View style={styles.standardDistanceList}>
          {STANDARD_DISTANCES.map((distance) => {
            const exists = personalBests.some((pb) => pb.distance.toLowerCase() === distance.toLowerCase());
            return (
              <Pressable
                key={distance}
                onPress={() => {
                  const existing = personalBests.find((pb) => pb.distance.toLowerCase() === distance.toLowerCase());
                  if (existing) {
                    openEditPbForm(existing);
                  } else {
                    setEditingPbId(null);
                    setPbForm({ ...createEmptyPbForm(), distance });
                  }
                }}
                style={[styles.distanceChip, exists && styles.distanceChipFilled]}
              >
                <BodyText style={[styles.distanceChipText, exists && styles.distanceChipTextFilled]}>
                  {distance} {exists ? "✓" : "+"}
                </BodyText>
              </Pressable>
            );
          })}
        </View>

        {(editingPbId || pbForm.distance) && (
          <View style={styles.performanceForm}>
            <BodyText style={styles.inputLabel}>Distans</BodyText>
            <TextInput
              value={pbForm.distance}
              onChangeText={(distance) => setPbForm((current) => ({ ...current, distance }))}
              placeholder="Exempelvis 8 km"
              placeholderTextColor="#8A94A6"
              style={styles.performanceInput}
            />

            <View style={styles.formTwoColumns}>
              <PerformanceInput label="Tid" value={pbForm.time} onChange={(value) => setPbForm((current) => ({ ...current, time: value }))} placeholder="35:12" />
              <PerformanceInput label="Datum" value={pbForm.date} onChange={(value) => setPbForm((current) => ({ ...current, date: value }))} placeholder="2026-09-20" />
            </View>

            <BodyText style={styles.inputLabel}>Anteckning (valfritt)</BodyText>
            <TextInput
              value={pbForm.notes}
              onChangeText={(notes) => setPbForm((current) => ({ ...current, notes }))}
              placeholder="Exempelvis tävling eller bana"
              placeholderTextColor="#8A94A6"
              style={styles.performanceInput}
            />

            <View style={styles.formActions}>
              <Pressable onPress={savePersonalBest} disabled={saving} style={styles.primaryActionButton}>
                <BodyText style={styles.primaryActionText}>{saving ? "Sparar..." : "Spara PB"}</BodyText>
              </Pressable>
              {editingPbId && (
                <Pressable onPress={() => deletePersonalBest(editingPbId)} disabled={saving} style={styles.dangerActionButton}>
                  <BodyText style={styles.dangerActionText}>Ta bort</BodyText>
                </Pressable>
              )}
              <Pressable onPress={closePbForm} disabled={saving} style={styles.secondaryActionButton}>
                <BodyText style={styles.secondaryActionText}>Avbryt</BodyText>
              </Pressable>
            </View>
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.performanceSectionHeader}>
          <View>
            <SectionLabel>TESTHISTORIK</SectionLabel>
            <BodyText style={styles.performanceSectionTitle}>Tidigare mätningar</BodyText>
          </View>
        </View>

        {tests.length > 1 ? (
          <View style={styles.testHistoryList}>
            {tests.slice(1).map((test) => (
              <View key={test.id} style={styles.testHistoryRow}>
                <View style={styles.testHistoryDateBlock}>
                  <BodyText style={styles.testHistoryDate}>{formatLongDate(test.test_date)}</BodyText>
                  {test.weight_kg != null && <BodyText style={styles.testHistoryMeta}>{test.weight_kg} kg</BodyText>}
                </View>
                <View style={styles.testHistoryValues}>
                  <BodyText style={styles.testHistoryValue}>LT {formatPulse(test.lt_pulse)} · {formatPace(test.lt_pace_seconds)}</BodyText>
                  <BodyText style={styles.testHistoryValue}>AT {formatPulse(test.at_pulse)} · {formatPace(test.at_pace_seconds)}</BodyText>
                </View>
                <Pressable onPress={() => deleteTest(test.id)} disabled={saving}>
                  <BodyText style={styles.historyDelete}>×</BodyText>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <BodyText style={styles.emptyPerformanceText}>När du sparar fler tester visas de här.</BodyText>
        )}
      </Card>

      <Card>
        <View style={styles.performanceSectionHeader}>
          <View>
            <SectionLabel>COACHANTECKNINGAR</SectionLabel>
            <BodyText style={styles.performanceSectionTitle}>Om {athleteName}</BodyText>
          </View>
          <Pressable onPress={() => setEditingNotes((current) => !current)} style={styles.smallActionButton}>
            <BodyText style={styles.smallActionButtonText}>{editingNotes ? "Stäng" : "Redigera"}</BodyText>
          </Pressable>
        </View>

        {editingNotes ? (
          <>
            <TextInput
              value={coachNotes}
              onChangeText={setCoachNotes}
              placeholder="Skriv egna coachanteckningar om adepten..."
              placeholderTextColor="#8A94A6"
              style={[styles.performanceInput, styles.notesInput]}
              multiline
            />
            <Pressable onPress={saveNotes} disabled={saving} style={[styles.primaryActionButton, styles.notesSaveButton]}>
              <BodyText style={styles.primaryActionText}>{saving ? "Sparar..." : "Spara anteckningar"}</BodyText>
            </Pressable>
          </>
        ) : (
          <BodyText style={styles.coachNotesText}>
            {coachNotes.trim() || "Inga coachanteckningar har lagts till ännu."}
          </BodyText>
        )}
      </Card>
    </View>
  );
}

function PerformanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.performanceMetric}>
      <BodyText style={styles.performanceMetricLabel}>{label}</BodyText>
      <BodyText style={styles.performanceMetricValue}>{value}</BodyText>
    </View>
  );
}

function PerformanceInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.formField}>
      <BodyText style={styles.inputLabel}>{label}</BodyText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#8A94A6"
        style={styles.performanceInput}
      />
    </View>
  );
}

function createEmptyTestForm(): TestForm {
  return {
    testDate: formatISODate(new Date()),
    ltPulse: "",
    ltPace: "",
    atPulse: "",
    atPace: "",
    ltLactate: "",
    atLactate: "",
    weight: "",
    notes: "",
  };
}

function createEmptyPbForm(): PbForm {
  return {
    distance: "",
    time: "",
    date: formatISODate(new Date()),
    notes: "",
  };
}

function testValueToForm(test: AthleteTestValue): TestForm {
  return {
    testDate: test.test_date,
    ltPulse: test.lt_pulse?.toString() ?? "",
    ltPace: formatPaceInput(test.lt_pace_seconds),
    atPulse: test.at_pulse?.toString() ?? "",
    atPace: formatPaceInput(test.at_pace_seconds),
    ltLactate: test.lt_lactate?.toString() ?? "",
    atLactate: test.at_lactate?.toString() ?? "",
    weight: test.weight_kg?.toString() ?? "",
    notes: test.notes ?? "",
  };
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) throw new Error(`Ogiltigt heltal: ${value}`);
  return parsed;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) throw new Error(`Ogiltigt tal: ${value}`);
  return parsed;
}

function parsePace(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map(Number);
  if (parts.length === 1 && Number.isFinite(parts[0])) return Math.round(parts[0] * 60);
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  throw new Error(`Ogiltigt tempo: ${value}`);
}

function parseTimeToSeconds(value: string) {
  const parts = value.trim().split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatPulse(value: number | null) {
  return value == null ? "–" : `${value} bpm`;
}

function formatPace(seconds: number | null) {
  if (seconds == null) return "–";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}/km`;
}

function formatPaceInput(seconds: number | null) {
  if (seconds == null) return "";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatLongDate(date: string) {
  return parseDate(date).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function sortPersonalBests(items: AthletePersonalBest[]) {
  const order = [
    "1500 m",
    "3 km",
    "5 km",
    "10 km",
    "Halvmaraton",
    "Maraton",
  ];

  return [...items].sort((a, b) => {
    const ai = order.findIndex((distance) => distance.toLowerCase() === a.distance.toLowerCase());
    const bi = order.findIndex((distance) => distance.toLowerCase() === b.distance.toLowerCase());
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.distance.localeCompare(b.distance, "sv");
  });
}

function formatPbPace(distance: string, timeSeconds: number) {
  const normalized = distance.toLowerCase();
  let meters: number | null = null;

  if (normalized.includes("1500")) meters = 1500;
  else if (normalized.includes("3 km")) meters = 3000;
  else if (normalized.includes("5 km")) meters = 5000;
  else if (normalized.includes("10 km")) meters = 10000;
  else if (normalized.includes("halv")) meters = 21097.5;
  else if (normalized.includes("maraton")) meters = 42195;

  if (!meters) return "";
  const paceSeconds = timeSeconds / (meters / 1000);
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

function CycleOverview({
  cycles,
  startDate,
  endDate,
}: {
  cycles: TrainingCycle[];
  startDate: string;
  endDate: string;
}) {
  const visibleCycles = cycles.filter(
    (cycle) =>
      cycle.start_date <= endDate &&
      cycle.end_date >= startDate
  );

  if (!visibleCycles.length) {
    return null;
  }

  return (
    <Card>
      <SectionLabel>AKTUELL TRÄNINGSPERIOD</SectionLabel>
      <View style={styles.cycleOverviewList}>
        {visibleCycles.map((cycle) => (
          <View key={cycle.id} style={styles.cycleOverviewItem}>
            <BodyText style={styles.cycleOverviewType}>
              {getCycleTypeLabel(cycle.type)}
            </BodyText>
            <BodyText style={styles.cycleOverviewName}>
              {cycle.name}
            </BodyText>
            <BodyText style={styles.cycleOverviewDates}>
              {formatCycleDate(cycle.start_date)}–{formatCycleDate(cycle.end_date)}
            </BodyText>
            {cycle.description ? (
              <BodyText style={styles.cycleOverviewDescription}>
                {cycle.description}
              </BodyText>
            ) : null}
          </View>
        ))}
      </View>
    </Card>
  );
}

function MonthCalendar({
  monthStart,
  sessions,
  onAddSession,
  onEditSession,
  completedSessions,
}: {
  monthStart: string;
  sessions: TrainingSession[];
  onAddSession: (date: string) => void;
  onEditSession: (session: TrainingSession) => void;
  completedSessions: Record<string, boolean>;
}) {
  const days = createMonthDays(monthStart, sessions);

  return (
    <View style={styles.monthCalendar}>
      <View style={styles.monthWeekdayRow}>
        {WEEK_DAYS.map((day) => (
          <View key={day.day} style={styles.monthWeekdayCell}>
            <BodyText style={styles.monthWeekdayText}>
              {day.day}
            </BodyText>
          </View>
        ))}
      </View>

      <View style={styles.monthGrid}>
        {days.map((day) => (
          <Pressable
            key={day.date}
            onPress={() => onAddSession(day.date)}
            style={[
              styles.monthCell,
              !day.inMonth && styles.monthCellOutside,
              day.isToday && styles.monthCellToday,
            ]}
          >
            <BodyText style={styles.monthDayNumber}>
              {parseDate(day.date).getUTCDate()}
            </BodyText>

            {day.sessions.slice(0, 3).map((session) => (
              <Pressable
                key={session.id}
                onPress={() => onEditSession(session)}
                style={styles.monthSession}
              >
                <View style={styles.monthSessionRow}>
                  <BodyText
                    style={styles.monthSessionText}
                    numberOfLines={1}
                  >
                    {TYPE_ICONS[session.type]} {session.title}
                  </BodyText>

                  {completedSessions[session.id] && (
                    <BodyText
                      style={styles.monthCompletedMark}
                    >
                      ✓
                    </BodyText>
                  )}
                </View>
              </Pressable>
            ))}

            {day.sessions.length > 3 && (
              <BodyText style={styles.monthMoreText}>
                +{day.sessions.length - 3} fler
              </BodyText>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function DayRow({
  day,
  onAddSession,
  onEditSession,
  completedSessions,
}: {
  day: {
    date: string;
    day: string;
    sessions: TrainingSession[];
  };

  onAddSession: () => void;

  onEditSession: (
    session: TrainingSession
  ) => void;

  completedSessions: Record<string, boolean>;
}) {
  return (
    <View
      style={styles.desktopDayRow}
    >
      <View
        style={
          styles.desktopDayInfo
        }
      >
        <BodyText
          style={
            styles.desktopDayName
          }
        >
          {day.day}
        </BodyText>

        <BodyText
          style={
            styles.desktopDate
          }
        >
          {formatDate(
            day.date
          )}
        </BodyText>
      </View>

      <View
        style={
          styles.desktopSessions
        }
      >
        {day.sessions.length ===
        0 ? (
          <BodyText
            style={
              styles.desktopEmpty
            }
          >
            Ingen träning
          </BodyText>
        ) : (
          day.sessions.map(
            (session) => (
              <Pressable
                key={
                  session.id
                }
                onPress={() =>
                  onEditSession(
                    session
                  )
                }
                style={
                  styles.desktopSession
                }
              >
                <BodyText
                  style={
                    styles.desktopSlot
                  }
                >
                  {
                    SLOT_ICONS[
                      session.slot
                    ]
                  }{" "}
                  {
                    SLOT_LABELS[
                      session.slot
                    ]
                  }
                </BodyText>

                <View style={styles.desktopTitleRow}>
                  <BodyText
                    style={
                      styles.desktopTitle
                    }
                    numberOfLines={1}
                  >
                    {
                      TYPE_ICONS[
                        session.type
                      ]
                    }{" "}
                    {session.title}
                  </BodyText>

                  {completedSessions[session.id] && (
                    <View
                      style={
                        styles.completedBadge
                      }
                    >
                      <BodyText
                        style={
                          styles.completedBadgeText
                        }
                      >
                        ✓
                      </BodyText>
                    </View>
                  )}
                </View>

                {session.description ? (
                  <BodyText
                    style={
                      styles.desktopDescription
                    }
                    numberOfLines={1}
                  >
                    {
                      session.description
                    }
                  </BodyText>
                ) : null}
              </Pressable>
            )
          )
        )}
      </View>

      <Pressable
        onPress={onAddSession}
        style={
          styles.desktopAddButton
        }
      >
        <BodyText
          style={
            styles.desktopAddText
          }
        >
          +
        </BodyText>
      </Pressable>
    </View>
  );
}

function createMonthDays(
  monthStart: string,
  sessions: TrainingSession[]
) {
  const firstDay = parseDate(monthStart);
  const firstWeekStart = getMonday(firstDay);
  const today = formatISODate(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstWeekStart, index);
    const dateObject = parseDate(date);

    return {
      date,
      inMonth: dateObject.getUTCMonth() === firstDay.getUTCMonth(),
      isToday: date === today,
      sessions: sessions
        .filter((session) => session.date === date)
        .sort(
          (a, b) => getSlotOrder(a.slot) - getSlotOrder(b.slot)
        ),
    };
  });
}

function createWeekDays(
  weekStart: string,
  sessions: TrainingSession[]
) {
  return WEEK_DAYS.map(
    ({ day, offset }) => {
      const date =
        addDays(
          weekStart,
          offset
        );

      return {
        date,
        day,
        sessions:
          sessions
            .filter(
              (session) =>
                session.date ===
                date
            )
            .sort(
              (a, b) =>
                getSlotOrder(
                  a.slot
                ) -
                getSlotOrder(
                  b.slot
                )
            ),
      };
    }
  );
}

function getSlotOrder(
  slot:
    | "morning"
    | "afternoon"
    | "evening"
) {
  if (
    slot === "morning"
  ) {
    return 1;
  }

  if (
    slot === "afternoon"
  ) {
    return 2;
  }

  return 3;
}

function addDays(
  date: string,
  amount: number
) {
  const result =
    parseDate(date);

  result.setUTCDate(
    result.getUTCDate() +
      amount
  );

  return formatISODate(
    result
  );
}

function parseDate(
  date: string
) {
  return new Date(
    `${date}T00:00:00Z`
  );
}

function formatISODate(
  date: Date
) {
  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthEnd(date: string) {
  const start = parseDate(date);
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      0
    )
  );

  return formatISODate(end);
}

function getMonthStart(date: string) {
  const parsed = parseDate(date);
  return formatISODate(
    new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1))
  );
}

function addMonths(date: string, amount: number) {
  const parsed = parseDate(date);
  return formatISODate(
    new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + amount, 1))
  );
}

function formatMonthTitle(date: string) {
  return parseDate(date).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getMonday(
  date: Date
) {
  const result =
    new Date(date);

  const day =
    result.getUTCDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  result.setUTCDate(
    result.getUTCDate() +
      difference
  );

  return formatISODate(
    result
  );
}

function getISOWeek(
  date: Date
) {
  const target =
    new Date(date);

  const day =
    target.getUTCDay();

  const diff =
    day === 0
      ? -3
      : 4 - day;

  target.setUTCDate(
    target.getUTCDate() +
      diff
  );

  const yearStart =
    new Date(
      Date.UTC(
        target.getUTCFullYear(),
        0,
        1
      )
    );

  return Math.ceil(
    (
      (
        target.getTime() -
        yearStart.getTime()
      ) /
        86400000 +
      1
    ) / 7
  );
}

function formatDate(
  date: string
) {
  return parseDate(
    date
  ).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }
  );
}

function formatWeekRange(
  startDate: string
) {
  const start =
    parseDate(startDate);

  const end =
    addDays(
      startDate,
      6
    );

  return `${start.toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }
  )}–${formatDate(end)}`;
}

function getDayName(
  date: string
) {
  return parseDate(
    date
  ).toLocaleDateString(
    "sv-SE",
    {
      weekday: "short",
      timeZone: "UTC",
    }
  );
}

function getStatusIcon(
  status:
    | "green"
    | "yellow"
    | "red"
) {
  if (
    status === "red"
  ) {
    return "🔴";
  }

  if (
    status === "yellow"
  ) {
    return "🟡";
  }

  return "🟢";
}

function createEmptyCycleForm(): CycleForm {
  return {
    type: "grundträning",
    name: "",
    startDate: formatISODate(new Date()),
    endDate: formatISODate(new Date()),
    description: "",
  };
}

function getCycleTypeLabel(type: TrainingCycleType) {
  return CYCLE_TYPES.find((option) => option.value === type)?.label ?? type;
}

function formatCycleDate(date: string) {
  return parseDate(date).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const styles =
  StyleSheet.create({
    header: {
      marginBottom: 18,
    },

    status: {
      marginTop: 5,
      fontSize: 14,
      opacity: 0.7,
    },

    headerActions: {
      marginTop: 12,
    },

    previewButton: {
      alignSelf: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    previewButtonText: {
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.75,
    },

    cycleOverviewList: {
      marginTop: 10,
      gap: 10,
    },

    cycleOverviewItem: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: "#F0F8F3",
      borderWidth: 1,
      borderColor: "#C7E5D1",
    },

    cycleOverviewType: {
      fontSize: 11,
      fontWeight: "700",
      color: "#278653",
      textTransform: "uppercase",
    },

    cycleOverviewName: {
      marginTop: 3,
      fontSize: 16,
      fontWeight: "700",
      color: "#172033",
    },

    cycleOverviewDates: {
      marginTop: 3,
      fontSize: 12,
      color: "#536174",
    },

    cycleOverviewDescription: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      color: "#536174",
    },

    cycleHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },

    cycleHeaderText: {
      flex: 1,
    },

    cycleIntro: {
      marginTop: 5,
      fontSize: 13,
      opacity: 0.55,
    },

    cycleAddButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.09)",
    },

    cycleAddButtonText: {
      fontSize: 12,
      fontWeight: "700",
    },

    cycleEmpty: {
      marginTop: 12,
      fontSize: 13,
      opacity: 0.45,
    },

    cycleList: {
      marginTop: 12,
      gap: 8,
    },

    cycleItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: 9,
      backgroundColor: "rgba(255,255,255,0.045)",
    },

    cycleItemText: {
      flex: 1,
    },

    cycleType: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      opacity: 0.5,
    },

    cycleName: {
      marginTop: 2,
      fontSize: 15,
      fontWeight: "700",
    },

    cycleDates: {
      marginTop: 3,
      fontSize: 12,
      opacity: 0.6,
    },

    cycleDescription: {
      marginTop: 5,
      fontSize: 12,
      opacity: 0.55,
    },

    cycleEditIcon: {
      marginLeft: 10,
      fontSize: 24,
      opacity: 0.5,
    },

    cycleForm: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.1)",
    },

    cycleFormTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },

    cycleFormTitle: {
      fontSize: 16,
      fontWeight: "700",
    },

    cycleCloseText: {
      fontSize: 24,
      opacity: 0.65,
    },

    inputLabel: {
      marginTop: 10,
      marginBottom: 5,
      fontSize: 12,
      fontWeight: "700",
      opacity: 0.65,
    },

    cycleTypeOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },

    cycleTypeOption: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.06)",
    },

    cycleTypeOptionSelected: {
      backgroundColor: "rgba(255,255,255,0.18)",
    },

    cycleTypeOptionText: {
      fontSize: 12,
      opacity: 0.65,
    },

    cycleTypeOptionTextSelected: {
      fontWeight: "700",
      opacity: 1,
    },

    cycleInput: {
      minHeight: 42,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#D7DEE8",
      color: "#172033",
      fontSize: 14,
    },

    cycleDescriptionInput: {
      minHeight: 80,
      textAlignVertical: "top",
    },

    cycleFormActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 16,
    },

    cycleSaveButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.16)",
    },

    cycleSaveButtonText: {
      fontSize: 13,
      fontWeight: "700",
    },

    cycleDeleteButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: "rgba(255,80,80,0.12)",
    },

    cycleDeleteButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#ff8f8f",
    },

    viewToggle: {
      flexDirection: "row",
      alignSelf: "center",
      marginBottom: 12,
      padding: 3,
      borderRadius: 10,
      backgroundColor: "rgba(0,0,0,0.06)",
    },

    viewToggleButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },

    viewToggleButtonActive: {
      backgroundColor: "#FFFFFF",
      shadowColor: "#000000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },

    viewToggleText: {
      fontSize: 13,
      fontWeight: "600",
      opacity: 0.55,
    },

    viewToggleTextActive: {
      opacity: 1,
      color: "#1F2937",
    },


    profileToggleButton: {
      paddingHorizontal: 14,
    },

    performanceView: {
      width: "100%",
      maxWidth: 1200,
      alignSelf: "center",
      gap: 14,
    },

    performanceIntro: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 2,
    },

    performanceIntroText: {
      flex: 1,
    },

    performanceTitle: {
      marginTop: 4,
      fontSize: 22,
      fontWeight: "700",
      color: "#172033",
    },

    performanceSubtitle: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 19,
      color: "#667085",
    },

    performanceSectionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },

    performanceSectionTitle: {
      marginTop: 3,
      fontSize: 17,
      fontWeight: "700",
      color: "#172033",
    },

    smallActionButton: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: "#F1F5F9",
      borderWidth: 1,
      borderColor: "#D7DEE8",
    },

    smallActionButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#334155",
    },

    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14,
    },

    performanceMetric: {
      flexGrow: 1,
      flexBasis: 145,
      minWidth: 135,
      padding: 12,
      borderRadius: 10,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },

    performanceMetricLabel: {
      fontSize: 11,
      color: "#64748B",
      fontWeight: "700",
    },

    performanceMetricValue: {
      marginTop: 4,
      fontSize: 18,
      fontWeight: "700",
      color: "#172033",
    },

    testMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 14,
      marginTop: 9,
    },

    testMeta: {
      fontSize: 12,
      color: "#64748B",
    },

    testNotes: {
      marginTop: 10,
      fontSize: 13,
      lineHeight: 19,
      color: "#536174",
    },

    emptyPerformanceText: {
      marginTop: 12,
      fontSize: 13,
      color: "#64748B",
    },

    performanceForm: {
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: "#E2E8F0",
    },

    formTwoColumns: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 10,
    },

    formField: {
      flexGrow: 1,
      flexBasis: 170,
      minWidth: 145,
    },

    performanceInput: {
      minHeight: 42,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#D7DEE8",
      color: "#172033",
      fontSize: 14,
    },

    multilineInput: {
      minHeight: 76,
      textAlignVertical: "top",
    },

    notesInput: {
      minHeight: 120,
      marginTop: 12,
      textAlignVertical: "top",
    },

    formActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14,
    },

    primaryActionButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: "#172033",
    },

    primaryActionText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    secondaryActionButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: "#F1F5F9",
    },

    secondaryActionText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#475569",
    },

    dangerActionButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: "#FEF2F2",
    },

    dangerActionText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#B42318",
    },

    pbList: {
      marginTop: 12,
    },

    pbRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 56,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#E2E8F0",
      gap: 10,
    },

    pbDistanceBlock: {
      flex: 1,
      minWidth: 100,
    },

    pbDistance: {
      fontSize: 14,
      fontWeight: "700",
      color: "#172033",
    },

    pbDate: {
      marginTop: 2,
      fontSize: 11,
      color: "#64748B",
    },

    pbTime: {
      width: 72,
      fontSize: 16,
      fontWeight: "700",
      color: "#172033",
      textAlign: "right",
    },

    pbPace: {
      width: 68,
      fontSize: 11,
      color: "#64748B",
      textAlign: "right",
    },

    pbEditIcon: {
      width: 18,
      fontSize: 22,
      color: "#94A3B8",
      textAlign: "right",
    },

    standardDistanceList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 14,
    },

    distanceChip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#D7DEE8",
    },

    distanceChipFilled: {
      backgroundColor: "#F0F8F3",
      borderColor: "#C7E5D1",
    },

    distanceChipText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#64748B",
    },

    distanceChipTextFilled: {
      color: "#278653",
      fontWeight: "700",
    },

    testHistoryList: {
      marginTop: 10,
    },

    testHistoryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: "#E2E8F0",
    },

    testHistoryDateBlock: {
      width: 110,
    },

    testHistoryDate: {
      fontSize: 12,
      fontWeight: "700",
      color: "#172033",
    },

    testHistoryMeta: {
      marginTop: 2,
      fontSize: 11,
      color: "#64748B",
    },

    testHistoryValues: {
      flex: 1,
      gap: 3,
    },

    testHistoryValue: {
      fontSize: 12,
      color: "#475569",
    },

    historyDelete: {
      fontSize: 21,
      color: "#94A3B8",
      paddingHorizontal: 4,
    },

    coachNotesText: {
      marginTop: 12,
      minHeight: 60,
      fontSize: 14,
      lineHeight: 21,
      color: "#475569",
    },

    notesSaveButton: {
      alignSelf: "flex-start",
      marginTop: 10,
    },

    feedbackSection: {
      marginTop: 16,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: "#E2E8F0",
    },

    feedbackHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    },

    feedbackTitle: {
      marginTop: 3,
      fontSize: 15,
      fontWeight: "700",
      color: "#172033",
    },

    feedbackStatus: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },

    feedbackStatusCompleted: {
      backgroundColor: "#F0F8F3",
      borderColor: "#C7E5D1",
    },

    feedbackStatusPending: {
      backgroundColor: "#F8FAFC",
      borderColor: "#E2E8F0",
    },

    feedbackStatusText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#475569",
    },

    feedbackMetrics: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },

    feedbackMetric: {
      flex: 1,
      padding: 10,
      borderRadius: 9,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },

    feedbackMetricLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: "#64748B",
    },

    feedbackMetricValue: {
      marginTop: 3,
      fontSize: 18,
      fontWeight: "700",
      color: "#172033",
    },

    commentSection: {
      marginTop: 18,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: "#E2E8F0",
    },

    commentHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    },

    commentHeaderText: {
      flex: 1,
    },

    commentSessionTitle: {
      marginTop: 3,
      fontSize: 15,
      fontWeight: "700",
      color: "#172033",
    },

    commentCount: {
      fontSize: 11,
      color: "#64748B",
      marginTop: 2,
    },

    commentList: {
      marginTop: 10,
      gap: 8,
    },

    commentBubble: {
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
    },

    athleteCommentBubble: {
      backgroundColor: "#F8FAFC",
      borderColor: "#E2E8F0",
    },

    coachCommentBubble: {
      backgroundColor: "#F0F8F3",
      borderColor: "#C7E5D1",
    },

    commentBubbleHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },

    commentAuthor: {
      fontSize: 11,
      fontWeight: "700",
      color: "#334155",
    },

    commentDate: {
      fontSize: 10,
      color: "#94A3B8",
    },

    commentBubbleText: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: "#334155",
    },

    noCommentsText: {
      marginTop: 10,
      fontSize: 12,
      color: "#64748B",
    },

    commentInput: {
      minHeight: 78,
      marginTop: 10,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#D7DEE8",
      color: "#172033",
      fontSize: 13,
      textAlignVertical: "top",
    },

    saveCommentButton: {
      alignSelf: "flex-start",
      marginTop: 8,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: "#172033",
      minWidth: 76,
      alignItems: "center",
      justifyContent: "center",
    },

    saveCommentButtonDisabled: {
      opacity: 0.45,
    },

    saveCommentText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    commentMessage: {
      marginTop: 7,
      fontSize: 11,
      color: "#278653",
    },

    monthCalendar: {
      width: "100%",
    },

    monthWeekdayRow: {
      flexDirection: "row",
      marginBottom: 4,
    },

    monthWeekdayCell: {
      width: "14.2857%",
      alignItems: "center",
      paddingVertical: 8,
    },

    monthWeekdayText: {
      fontSize: 11,
      fontWeight: "700",
      opacity: 0.5,
    },

    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderColor: "rgba(0,0,0,0.09)",
    },

    monthCell: {
      width: "14.2857%",
      minHeight: 105,
      padding: 6,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: "rgba(0,0,0,0.09)",
      backgroundColor: "rgba(255,255,255,0.45)",
    },

    monthCellOutside: {
      opacity: 0.35,
      backgroundColor: "rgba(0,0,0,0.025)",
    },

    monthCellToday: {
      backgroundColor: "rgba(42, 139, 86, 0.09)",
    },

    monthDayNumber: {
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 4,
    },

    monthSession: {
      paddingHorizontal: 4,
      paddingVertical: 3,
      marginBottom: 3,
      borderRadius: 4,
      backgroundColor: "rgba(42, 139, 86, 0.10)",
    },

    monthSessionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },

    monthSessionText: {
      flex: 1,
      fontSize: 10,
      fontWeight: "600",
    },

    monthCompletedMark: {
      color: "#166534",
      fontSize: 11,
      fontWeight: "800",
    },

    monthMoreText: {
      fontSize: 10,
      opacity: 0.55,
    },

    weekNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 16,
    },

    weekNavigationDesktop: {
      maxWidth: 1200,
      alignSelf: "center",
      width: "100%",
    },

    weekTitle: {
      alignItems: "center",
    },

    weekNumber: {
      marginTop: 3,
      fontSize: 17,
      fontWeight: "700",
    },

    weekDate: {
      marginTop: 2,
      fontSize: 11,
      opacity: 0.45,
    },

    navigationButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    navigationText: {
      fontSize: 21,
      fontWeight: "600",
    },

    workspace: {
      width: "100%",
    },

    workspaceDesktop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 18,
      maxWidth: 1200,
      alignSelf: "center",
    },

    calendarColumn: {
      width: "100%",
    },

    calendarColumnDesktop: {
      flex: 1,
      minWidth: 0,
    },

    panelColumn: {
      width: 370,
      maxWidth: 370,
    },

    desktopDayRow: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor:
        "rgba(255,255,255,0.08)",
      paddingVertical: 8,
      paddingHorizontal: 10,
    },

    desktopDayInfo: {
      width: 78,
    },

    desktopDayName: {
      fontSize: 14,
      fontWeight: "700",
    },

    desktopDate: {
      marginTop: 1,
      fontSize: 11,
      opacity: 0.45,
    },

    desktopSessions: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },

    desktopSession: {
      minWidth: 150,
      maxWidth: 260,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#FFFFFF",
    },

    desktopSlot: {
      fontSize: 10,
      fontWeight: "600",
      opacity: 0.5,
    },

    desktopTitle: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "700",
      flex: 1,
    },

    desktopTitleRow: {
      marginTop: 2,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    completedBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#8EE3B0",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    completedBadgeText: {
      color: "#14532D",
      fontSize: 13,
      fontWeight: "800",
    },

    desktopDescription: {
      marginTop: 2,
      fontSize: 11,
      opacity: 0.45,
    },

    desktopEmpty: {
      fontSize: 12,
      opacity: 0.3,
    },

    desktopAddButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 8,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    desktopAddText: {
      fontSize: 19,
      opacity: 0.55,
    },

    panelHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
      marginBottom: 8,
    },

    panelHeaderText: {
      flex: 1,
    },

    panelTitle: {
      marginTop: 3,
      fontSize: 18,
      fontWeight: "700",
    },

    closeButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    closeButtonText: {
      fontSize: 20,
      lineHeight: 22,
      opacity: 0.7,
    },

    emptyPanel: {
      paddingVertical: 20,
    },

    emptyPanelTitle: {
      marginTop: 5,
      fontSize: 18,
      fontWeight: "700",
    },

    emptyPanelText: {
      marginTop: 6,
      lineHeight: 19,
      fontSize: 14,
      opacity: 0.55,
    },

    saving: {
      marginTop: 10,
      fontSize: 12,
      opacity: 0.5,
    },

    error: {
      marginBottom: 12,
      color: "#ff7b7b",
      fontSize: 13,
    },

    loading: {
      paddingVertical: 40,
      alignItems: "center",
    },
  });