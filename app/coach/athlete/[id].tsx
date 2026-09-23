import React, {
  useEffect,
  useState,
} from "react";
import {
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
  const { id } =
    useLocalSearchParams<{ id: string }>();

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
    useState<"week" | "month">("week");

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

  useEffect(() => {
    if (!id) {
      return;
    }

    loadAthlete();
    loadSessions();
    loadCycles();
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

      const {
        error,
      } = await supabase
        .from("training_sessions")
        .delete()
        .eq(
          "id",
          editingSession.id
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
        "Kunde inte ta bort träningspasset."
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
  }

  function closePanel() {
    setSelectedDate(null);
    setEditingSession(null);
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
    nextView: "week" | "month"
  ) {
    if (nextView === "month") {
      setMonthStart(
        getMonthStart(weekStart)
      );
    } else {
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
              Veckovy
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
              Månadsvy
            </BodyText>
          </Pressable>
        </View>

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
                  />
                ))
              ) : (
                <MonthCalendar
                  monthStart={monthStart}
                  sessions={sessions}
                  onAddSession={handleAddSession}
                  onEditSession={handleEditSession}
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
      </Screen>
    </>
  );
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
}: {
  monthStart: string;
  sessions: TrainingSession[];
  onAddSession: (date: string) => void;
  onEditSession: (session: TrainingSession) => void;
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
                <BodyText
                  style={styles.monthSessionText}
                  numberOfLines={1}
                >
                  {TYPE_ICONS[session.type]} {session.title}
                </BodyText>
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

    monthSessionText: {
      fontSize: 10,
      fontWeight: "600",
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
      borderRadius: 8,
      backgroundColor:
        "rgba(255,255,255,0.055)",
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