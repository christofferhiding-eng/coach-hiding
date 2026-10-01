import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import {
  Stack,
  router,
  useLocalSearchParams,
} from "expo-router";

import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import { supabase } from "@/lib/supabase";

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

type SessionType =
  | "easy"
  | "quality"
  | "long"
  | "rest";

type SessionSlot =
  | "morning"
  | "afternoon"
  | "evening";

type AthleteTrainingSession = {
  id: string;
  athleteId: string;
  date: string;
  day: string;
  slot: SessionSlot;
  title: string;
  description: string;
  type: SessionType;
};

type TrainingWeek = {
  startDate: string;
  title: string;
  sessions: AthleteTrainingSession[];
};

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

type AthleteProfile = {
  id: string;
  name: string;
  role: string;
  athlete_id: string | null;
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

type AthleteTestValue = {
  id: string; athlete_id: string; test_date: string;
  lt_pulse: number | null; lt_pace_seconds: number | null;
  at_pulse: number | null; at_pace_seconds: number | null;
  lt_lactate: number | null; at_lactate: number | null;
  weight_kg: number | null; notes: string | null;
  created_at: string; updated_at: string;
};

type AthletePersonalBest = {
  id: string; athlete_id: string; distance: string; time_seconds: number;
  achieved_date: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

const CYCLE_TYPE_LABELS: Record<TrainingCycleType, string> = {
  "grundträning": "Grundträning",
  "tävlingsförberedande": "Tävlingsförberedande",
  "specifik period": "Specifik period",
  "tävlingsperiod": "Tävlingsperiod",
};

const BORG_VALUES = Array.from(
  { length: 15 },
  (_, index) => index + 6
);

const BORG_LABELS: Record<number, string> = {
  6: "Ingen ansträngning",
  7: "Extremt lätt",
  8: "Mycket lätt",
  9: "Mycket lätt",
  10: "Lätt",
  11: "Lätt",
  12: "Något ansträngande",
  13: "Något ansträngande",
  14: "Något ansträngande",
  15: "Ansträngande",
  16: "Ansträngande",
  17: "Mycket ansträngande",
  18: "Mycket ansträngande",
  19: "Extremt ansträngande",
  20: "Maximalt",
};

export default function AthleteHomeScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const { width } =
    useWindowDimensions();

  const isDesktop = width >= 900;
  const screenRef =
  useRef<ScrollView>(null);

  const [athlete, setAthlete] =
    useState<AthleteProfile | null>(null);

  const [weeks, setWeeks] =
    useState<TrainingWeek[]>([]);

  const [cycles, setCycles] =
    useState<TrainingCycle[]>([]);

  const [weekIndex, setWeekIndex] =
    useState(0);

  const [viewMode, setViewMode] =
    useState<"week" | "month" | "performance">("week");

  const [monthStart, setMonthStart] =
    useState(() => getMonthStart(formatISODate(new Date())));

  const [selectedSessionId, setSelectedSessionId] =
    useState<string | null>(null);

  const [comments, setComments] =
    useState<Record<string, string>>({});

  const [trainingComments, setTrainingComments] =
    useState<Record<string, TrainingComment[]>>({});

  const [sessionRpe, setSessionRpe] =
    useState<Record<string, number>>({});

  const [completedSessions, setCompletedSessions] =
    useState<Record<string, boolean>>({});

  const [savingCompletion, setSavingCompletion] =
    useState(false);

  const [completionMessage, setCompletionMessage] =
    useState<string | null>(null);

  const [selectedRpe, setSelectedRpe] =
    useState<number | null>(null);

  const [savingRpe, setSavingRpe] =
    useState(false);

  const [rpeMessage, setRpeMessage] =
    useState<string | null>(null);

  const [commentText, setCommentText] =
    useState("");

  const [savingComment, setSavingComment] =
    useState(false);

  const [commentMessage, setCommentMessage] =
    useState<string | null>(null);

  const [loggingOut, setLoggingOut] =
    useState(false);

  useEffect(() => {
    async function loadPlan() {
      try {
        if (!id) {
          return;
        }

        /*
         * 1. Hämta den inloggade adeptens profil.
         */

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, name, role, athlete_id"
          )
          .eq(
            "athlete_id",
            id
          )
          .eq(
            "role",
            "athlete"
          )
          .single();

        if (profileError) {
          console.error(
            "Kunde inte läsa adeptprofil:",
            profileError
          );

          setAthlete(null);
        } else {
          setAthlete(profile);
        }

        /*
         * 2. Hämta träningspassen direkt från Supabase.
         *
         * Detta är samma tabell som coachvyn använder.
         */

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase
          .from("training_sessions")
          .select(
            "id, athlete_id, date, day, slot, title, description, type"
          )
          .eq(
            "athlete_id",
            id
          )
          .order(
            "date",
            {
              ascending: true,
            }
          );

        if (sessionError) {
          console.error(
            "Kunde inte läsa träningspassen:",
            sessionError
          );

          setWeeks([]);
          return;
        }

        const mappedSessions: AthleteTrainingSession[] =
          (sessionData ?? []).map(
            (session) => ({
              id: session.id,
              athleteId:
                session.athlete_id,
              date: session.date,
              day: session.day,
              slot: session.slot,
              title: session.title,
              description:
                session.description,
              type: session.type,
            })
          );

        /*
         * 3. Gruppera passen per träningsvecka.
         */

        const weeksByStartDate =
          new Map<
            string,
            TrainingWeek
          >();

        for (const session of mappedSessions) {
          const startDate =
            getMonday(session.date);

          const existingWeek =
            weeksByStartDate.get(
              startDate
            );

          if (existingWeek) {
            existingWeek.sessions.push(
              session
            );
          } else {
            weeksByStartDate.set(
              startDate,
              {
                startDate,
                title: `Vecka ${getWeekNumber(
                  startDate
                )}`,
                sessions: [session],
              }
            );
          }
        }

        const sortedWeeks =
          Array.from(
            weeksByStartDate.values()
          ).sort((a, b) =>
            a.startDate.localeCompare(
              b.startDate
            )
          );

        // Lägg alltid till innevarande vecka, även om
        // det ännu inte finns några träningspass den veckan.
        const today = formatISODate(new Date());
        const currentWeekStart = getMonday(today);
        const hasCurrentWeek = sortedWeeks.some(
          (week) => week.startDate === currentWeekStart
        );

        if (!hasCurrentWeek) {
          sortedWeeks.push({
            startDate: currentWeekStart,
            title: `Vecka ${getWeekNumber(currentWeekStart)}`,
            sessions: [],
          });

          sortedWeeks.sort((a, b) =>
            a.startDate.localeCompare(b.startDate)
          );
        }

        for (const week of sortedWeeks) {
          week.sessions.sort(
            (a, b) => {
              const dateCompare =
                a.date.localeCompare(
                  b.date
                );

              if (dateCompare !== 0) {
                return dateCompare;
              }

              return (
                getSlotOrder(a.slot) -
                getSlotOrder(b.slot)
              );
            }
          );
        }

        setWeeks(sortedWeeks);

        const {
          data: cycleData,
          error: cycleError,
        } = await supabase
          .from("training_cycles")
          .select(
            "id, athlete_id, type, name, start_date, end_date, description"
          )
          .eq("athlete_id", id)
          .order("start_date", { ascending: true });

        if (cycleError) {
          console.error(
            "Kunde inte läsa träningsperioderna:",
            cycleError
          );
        } else {
          setCycles((cycleData ?? []) as TrainingCycle[]);
        }

        /*
         * 4. Ladda kommentarer.
         */

        const {
          data: commentData,
          error: commentError,
        } = await supabase
          .from("training_sessions")
          .select(
            "id, athlete_comment"
          )
          .eq(
            "athlete_id",
            id
          );

        if (commentError) {
          console.error(
            "Kunde inte läsa äldre kommentarer:",
            commentError
          );
        } else {
          const loadedComments:
            Record<string, string> = {};

          for (
            const session of
              commentData ?? []
          ) {
            if (
              session.athlete_comment
            ) {
              loadedComments[
                session.id
              ] =
                session.athlete_comment;
            }
          }

          setComments(
            loadedComments
          );
        }

        /*
         * 4b. Ladda den riktiga dialogen mellan adept och coach.
         */

        const {
          data: rawTrainingCommentData,
          error: trainingCommentError,
        } = await supabase.rpc(
          "get_athlete_training_comments",
          {
            p_athlete_id: id,
          }
        );

        if (trainingCommentError) {
          console.error(
            "Kunde inte läsa dialogen:",
            trainingCommentError
          );
        } else {
          const trainingCommentData =
            (rawTrainingCommentData ?? []) as TrainingComment[];

          const groupedComments:
            Record<string, TrainingComment[]> = {};

          for (const comment of trainingCommentData) {
            if (!groupedComments[comment.training_session_id]) {
              groupedComments[comment.training_session_id] = [];
            }

            groupedComments[comment.training_session_id].push(comment);
          }

          setTrainingComments(groupedComments);
        }

        /*
         * 4c. Ladda Borg-skattningar.
         */
        const {
          data: rawRpeData,
          error: rpeError,
        } = await supabase.rpc(
          "get_athlete_training_rpe",
          {
            p_athlete_id: id,
          }
        );

        if (rpeError) {
          console.error(
            "Kunde inte läsa Borg-skattningar:",
            rpeError
          );
        } else {
          setSessionRpe(
            (rawRpeData ?? {}) as Record<string, number>
          );
        }

        /*
         * 4d. Ladda genomförda pass.
         */
        const {
          data: rawCompletionData,
          error: completionError,
        } = await supabase.rpc(
          "get_athlete_training_completion",
          {
            p_athlete_id: id,
          }
        );

        if (completionError) {
          console.error(
            "Kunde inte läsa genomförda pass:",
            completionError
          );
        } else {
          setCompletedSessions(
            (rawCompletionData ?? {}) as Record<string, boolean>
          );
        }

        /*
         * 5. Välj aktuell vecka.
         */

        if (!sortedWeeks.length) {
          return;
        }

        const currentWeekIndex =
          sortedWeeks.findIndex(
            (week) => {
              const weekEnd =
                addDays(
                  week.startDate,
                  6
                );

              return (
                today >=
                  week.startDate &&
                today <= weekEnd
              );
            }
          );

        if (currentWeekIndex >= 0) {
          setWeekIndex(
            currentWeekIndex
          );
          return;
        }

        const nextWeekIndex =
          sortedWeeks.findIndex(
            (week) =>
              week.startDate >
              today
          );

        if (nextWeekIndex >= 0) {
          setWeekIndex(
            nextWeekIndex
          );
          return;
        }

        setWeekIndex(
          sortedWeeks.length - 1
        );
      } catch (error) {
        console.error(
          "Kunde inte läsa träningsplanen:",
          error
        );
      }
    }

    loadPlan();
  }, [id]);

  useEffect(() => {
    if (!selectedSessionId) {
      setCommentText("");
      setCommentMessage(null);
      setSelectedRpe(null);
      setRpeMessage(null);
      setCompletionMessage(null);
      return;
    }

    setCommentText("");
    setCommentMessage(null);
    setCompletionMessage(null);
    setSelectedRpe(
      sessionRpe[selectedSessionId] ?? null
    );
    setRpeMessage(null);
  }, [
    selectedSessionId,
    sessionRpe,
  ]);

  async function handleToggleCompletion() {
    if (!selectedSessionId) {
      return;
    }

    const nextCompleted =
      !Boolean(completedSessions[selectedSessionId]);

    try {
      setSavingCompletion(true);
      setCompletionMessage(null);

      const { error } = await supabase.rpc(
        "set_athlete_training_completion",
        {
          p_training_session_id: selectedSessionId,
          p_athlete_id: id,
          p_completed: nextCompleted,
        }
      );

      if (error) {
        console.error(
          "Kunde inte spara genomförd-status:",
          error
        );

        setCompletionMessage(
          `Kunde inte spara: ${error.message}`
        );

        return;
      }

      setCompletedSessions((current) => {
        const next = {
          ...current,
        };

        if (nextCompleted) {
          next[selectedSessionId] = true;
        } else {
          delete next[selectedSessionId];
        }

        return next;
      });

      setCompletionMessage(
        nextCompleted
          ? "Passet är markerat som genomfört ✓"
          : "Markeringen är borttagen."
      );
    } catch (error) {
      console.error(
        "Kunde inte spara genomförd-status:",
        error
      );

      setCompletionMessage(
        error instanceof Error
          ? error.message
          : "Något gick fel när passet skulle markeras."
      );
    } finally {
      setSavingCompletion(false);
    }
  }

  async function handleSaveRpe() {
    if (!selectedSessionId || selectedRpe === null) {
      return;
    }

    try {
      setSavingRpe(true);
      setRpeMessage(null);

      const { error } = await supabase.rpc(
        "save_athlete_training_rpe",
        {
          p_training_session_id: selectedSessionId,
          p_athlete_id: id,
          p_rpe: selectedRpe,
        }
      );

      if (error) {
        console.error(
          "Kunde inte spara Borg-skattning:",
          error
        );

        setRpeMessage(
          `Kunde inte spara: ${error.message}`
        );

        return;
      }

      setSessionRpe((current) => ({
        ...current,
        [selectedSessionId]: selectedRpe,
      }));

      setRpeMessage("Skattningen är sparad ✓");
    } catch (error) {
      console.error(
        "Kunde inte spara Borg-skattning:",
        error
      );

      setRpeMessage(
        error instanceof Error
          ? error.message
          : "Något gick fel när skattningen skulle sparas."
      );
    } finally {
      setSavingRpe(false);
    }
  }

  async function handleSaveComment() {
    if (!selectedSessionId || !commentText.trim()) {
      return;
    }

    try {
      setSavingComment(true);
      setCommentMessage(null);

      const { data, error } = await supabase.rpc(
        "create_training_comment",
        {
          p_training_session_id: selectedSessionId,
          p_athlete_id: id,
          p_message: commentText.trim(),
        }
      );

      if (error) {
        console.error(
          "Kunde inte skicka meddelande:",
          error
        );

        setCommentMessage(
          `Kunde inte skicka: ${error.message}`
        );

        return;
      }

      if (!data) {
        setCommentMessage(
          "Meddelandet kunde inte skickas."
        );

        return;
      }

      const newComment = data as TrainingComment;

      setTrainingComments((current) => ({
        ...current,
        [selectedSessionId]: [
          ...(current[selectedSessionId] ?? []),
          newComment,
        ],
      }));

      setCommentText("");
      setCommentMessage("Meddelandet är skickat ✓");
    } catch (error) {
      console.error(
        "Kunde inte skicka meddelande:",
        error
      );

      setCommentMessage(
        error instanceof Error
          ? error.message
          : "Något gick fel när meddelandet skulle skickas."
      );
    } finally {
      setSavingComment(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Kunde inte logga ut:",
          error
        );

        return;
      }

      router.replace("/login");
    } catch (error) {
      console.error(
        "Utloggningsfel:",
        error
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (!athlete) {
    return (
      <Screen>
        <BodyText>
          Adepten kunde inte hittas.
        </BodyText>
      </Screen>
    );
  }

  if (!weeks.length) {
    return (
      <Screen>
        <View
          style={
            styles.emptyState
          }
        >
          <SectionLabel>
            TRÄNING
          </SectionLabel>

          <Metric>
            {athlete.name}
          </Metric>

          <BodyText
            style={
              styles.emptyText
            }
          >
            Din träningsplan är inte
            klar ännu.
          </BodyText>

          <Pressable
            onPress={handleLogout}
            disabled={loggingOut}
            style={
              styles.logoutButton
            }
          >
            <BodyText
              style={
                styles.logoutText
              }
            >
              {loggingOut
                ? "Loggar ut..."
                : "Logga ut"}
            </BodyText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const week =
    weeks[weekIndex];

  if (!week) {
    return null;
  }

  const days =
    createWeekDays(
      week,
      id
    );

  const selectedSession =
    findSession(
      days,
      selectedSessionId
    );

  const canGoBack =
    weekIndex > 0;

  const canGoForward =
    weekIndex <
    weeks.length - 1;

  const nextSession =
    findNextSession(
      weeks,
      id
    );

  const allSessions = weeks.flatMap(
    (trainingWeek) => trainingWeek.sessions
  );

  const plannedSessions = allSessions.filter(
    (session) => session.type !== "rest"
  );

  const completedCount = plannedSessions.filter(
    (session) => Boolean(completedSessions[session.id])
  ).length;

  const completionPercent =
    plannedSessions.length > 0
      ? Math.round(
          (completedCount / plannedSessions.length) * 100
        )
      : 0;

  const currentWeekPlanned = week.sessions.filter(
    (session) => session.type !== "rest"
  );

  const currentWeekCompleted = currentWeekPlanned.filter(
    (session) => Boolean(completedSessions[session.id])
  ).length;

  const monthDays = createMonthDays(
    monthStart,
    allSessions
  );

  const selectedMonthSession = allSessions.find(
    (session) => session.id === selectedSessionId
  ) ?? null;

  const activeSelectedSession =
    viewMode === "month"
      ? selectedMonthSession
      : selectedSession;

  return (
    <>
      <Stack.Screen
        options={{
          title: athlete.name,
        }}
      />

<Screen ref={screenRef}>
        <View
          style={[
            styles.header,
            isDesktop &&
              styles.headerDesktop,
          ]}
        >
          <View>
            <SectionLabel>
              MIN TRÄNING
            </SectionLabel>

            <Metric>
              Hej {athlete.name} 👋
            </Metric>
          </View>

          <View
            style={
              styles.headerRight
            }
          >
            <Pressable
              onPress={handleLogout}
              disabled={loggingOut}
              style={
                styles.logoutButton
              }
            >
              <BodyText
                style={
                  styles.logoutText
                }
              >
                {loggingOut
                  ? "Loggar ut..."
                  : "Logga ut"}
              </BodyText>
            </Pressable>
          </View>
        </View>

        {nextSession && (
          <Card>
            <SectionLabel>
              NÄSTA PASS
            </SectionLabel>

            <BodyText
              style={
                styles.nextDate
              }
            >
              {formatLongDate(
                nextSession.date
              )}
            </BodyText>

            <BodyText
              style={
                styles.nextTitle
              }
            >
              {
                TYPE_ICONS[
                  nextSession.type
                ]
              }{" "}
              {nextSession.title}
            </BodyText>

            <BodyText
              style={
                styles.nextDescription
              }
            >
              {
                nextSession.description
              }
            </BodyText>
          </Card>
        )}

        <Card>
          <SectionLabel>
            TRÄNINGSSTATISTIK
          </SectionLabel>

          <View style={styles.completionStatsRow}>
            <View style={styles.completionStat}>
              <BodyText style={styles.completionStatValue}>
                {completedCount}
              </BodyText>
              <BodyText style={styles.completionStatLabel}>
                genomförda
              </BodyText>
            </View>

            <View style={styles.completionStat}>
              <BodyText style={styles.completionStatValue}>
                {plannedSessions.length}
              </BodyText>
              <BodyText style={styles.completionStatLabel}>
                planerade
              </BodyText>
            </View>

            <View style={styles.completionStat}>
              <BodyText style={styles.completionStatValue}>
                {completionPercent}%
              </BodyText>
              <BodyText style={styles.completionStatLabel}>
                genomförandegrad
              </BodyText>
            </View>
          </View>

          <BodyText style={styles.completionWeekText}>
            {week.title}: {currentWeekCompleted} av {currentWeekPlanned.length} pass genomförda
          </BodyText>
        </Card>

        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => setViewMode("week")}
            style={[
              styles.viewToggleButton,
              viewMode === "week" && styles.viewToggleButtonActive,
            ]}
          >
            <BodyText
              style={[
                styles.viewToggleText,
                viewMode === "week" && styles.viewToggleTextActive,
              ]}
            >
              Veckovy
            </BodyText>
          </Pressable>

          <Pressable
            onPress={() => setViewMode("month")}
            style={[
              styles.viewToggleButton,
              viewMode === "month" && styles.viewToggleButtonActive,
            ]}
          >
            <BodyText
              style={[
                styles.viewToggleText,
                viewMode === "month" && styles.viewToggleTextActive,
              ]}
            >
              Månadsvy
            </BodyText>
          </Pressable>

          <Pressable
            onPress={() => setViewMode("performance")}
            style={[styles.viewToggleButton, viewMode === "performance" && styles.viewToggleButtonActive]}
          >
            <BodyText style={[styles.viewToggleText, viewMode === "performance" && styles.viewToggleTextActive]}>
              Min prestation
            </BodyText>
          </Pressable>
        </View>

        {viewMode !== "performance" && (
          viewMode === "week" ? (
          <View
            style={[
              styles.weekNavigation,
              isDesktop &&
                styles.weekNavigationDesktop,
            ]}
          >
            <Pressable
              onPress={() =>
                canGoBack &&
                setWeekIndex(
                  (current) =>
                    current - 1
                )
              }
              disabled={!canGoBack}
              style={[
                styles.navigationButton,
                !canGoBack &&
                  styles.navigationButtonDisabled,
              ]}
            >
              <BodyText
                style={styles.navigationText}
              >
                ←
              </BodyText>
            </Pressable>

            <View style={styles.weekTitle}>
              <SectionLabel>
                TRÄNINGSVECKA
              </SectionLabel>

              <BodyText style={styles.weekNumber}>
                {week.title}
              </BodyText>

              <BodyText style={styles.weekDate}>
                {formatWeekRange(week.startDate)}
              </BodyText>
            </View>

            <Pressable
              onPress={() =>
                canGoForward &&
                setWeekIndex(
                  (current) =>
                    current + 1
                )
              }
              disabled={!canGoForward}
              style={[
                styles.navigationButton,
                !canGoForward &&
                  styles.navigationButtonDisabled,
              ]}
            >
              <BodyText style={styles.navigationText}>
                →
              </BodyText>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.weekNavigation,
              isDesktop &&
                styles.weekNavigationDesktop,
            ]}
          >
            <Pressable
              onPress={() =>
                setMonthStart(addMonths(monthStart, -1))
              }
              style={styles.navigationButton}
            >
              <BodyText style={styles.navigationText}>
                ←
              </BodyText>
            </Pressable>

            <View style={styles.weekTitle}>
              <SectionLabel>
                TRÄNINGSKALENDER
              </SectionLabel>

              <BodyText style={styles.weekNumber}>
                {formatMonthTitle(monthStart)}
              </BodyText>
            </View>

            <Pressable
              onPress={() =>
                setMonthStart(addMonths(monthStart, 1))
              }
              style={styles.navigationButton}
            >
              <BodyText style={styles.navigationText}>
                →
              </BodyText>
            </Pressable>
          </View>
          )
        )}

        {viewMode === "performance" ? (
          <AthletePerformanceView athleteId={id} athleteName={athlete.name} isDesktop={isDesktop} />
        ) : (
          <>
        <CycleOverview
          cycles={cycles}
          startDate={
            viewMode === "week"
              ? week.startDate
              : monthStart
          }
          endDate={
            viewMode === "week"
              ? addDays(week.startDate, 6)
              : getMonthEnd(monthStart)
          }
        />

        {viewMode === "week" ? (
          <View
            style={[
              styles.week,
              isDesktop &&
                styles.weekDesktop,
            ]}
          >
            {days.map((day) => (
              <DayCard
                key={day.date}
                day={day}
                selectedSessionId={selectedSessionId}
                onSelectSession={setSelectedSessionId}
                completedSessions={completedSessions}
              />
            ))}
          </View>
        ) : (
          <MonthCalendar
            days={monthDays}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
            completedSessions={completedSessions}
            isDesktop={isDesktop}
          />
        )}
          </>
        )}

{viewMode !== "performance" && activeSelectedSession && (
  <View
    onLayout={({ nativeEvent }) => {
      if (!isDesktop) {
        screenRef.current?.scrollTo({
          y: Math.max(
            nativeEvent.layout.y - 16,
            0
          ),
          animated: true,
        });
      }
    }}
  >
    <Card>
    
            <View
              style={
                styles.detailHeader
              }
            >
              <View
                style={
                  styles.detailHeaderText
                }
              >
                <SectionLabel>
                  PASSINSTRUKTION
                </SectionLabel>

                <BodyText
                  style={
                    styles.detailTitle
                  }
                >
                  {
                    TYPE_ICONS[
                      activeSelectedSession.type
                    ]
                  }{" "}
                  {
                    activeSelectedSession.title
                  }
                </BodyText>
              </View>

              <Pressable
                onPress={() =>
                  setSelectedSessionId(
                    null
                  )
                }
                style={
                  styles.closeButton
                }
              >
                <BodyText
                  style={
                    styles.closeText
                  }
                >
                  ×
                </BodyText>
              </Pressable>
            </View>

            <BodyText
              style={
                styles.detailSlot
              }
            >
              {
                SLOT_ICONS[
                  activeSelectedSession.slot
                ]
              }{" "}
              {
                SLOT_LABELS[
                  activeSelectedSession.slot
                ]
              }
            </BodyText>

            <BodyText
              style={
                styles.detailDescription
              }
            >
              {
                activeSelectedSession.description
              }
            </BodyText>

            <View
              style={
                styles.completionSection
              }
            >
              <Pressable
                onPress={handleToggleCompletion}
                disabled={savingCompletion}
                style={styles.completionButton}
              >
                <View
                  style={[
                    styles.completionCheckbox,
                    completedSessions[activeSelectedSession.id] &&
                      styles.completionCheckboxDone,
                  ]}
                >
                  {completedSessions[activeSelectedSession.id] && (
                    <BodyText style={styles.completionCheck}>
                      ✓
                    </BodyText>
                  )}
                </View>

                <View style={styles.completionButtonText}>
                  <BodyText style={styles.completionTitle}>
                    {completedSessions[activeSelectedSession.id]
                      ? "Passet är genomfört"
                      : "Markera passet som genomfört"}
                  </BodyText>

                  <BodyText style={styles.completionSubtitle}>
                    {savingCompletion
                      ? "Sparar..."
                      : "Bocka av när du är klar."}
                  </BodyText>
                </View>
              </Pressable>

              {completionMessage && (
                <BodyText style={styles.completionMessage}>
                  {completionMessage}
                </BodyText>
              )}
            </View>

            <View
              style={
                styles.rpeSection
              }
            >
              <SectionLabel>
                HUR ANSTRÄNGANDE VAR PASSET?
              </SectionLabel>

              <BodyText
                style={
                  styles.rpeIntro
                }
              >
                Skatta passets totala ansträngning enligt Borg 6–20.
              </BodyText>

              <View
                style={
                  styles.rpeScale
                }
              >
                {BORG_VALUES.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setSelectedRpe(value);
                      setRpeMessage(null);
                    }}
                    style={[
                      styles.rpeButton,
                      selectedRpe === value &&
                        styles.rpeButtonSelected,
                    ]}
                  >
                    <BodyText
                      style={[
                        styles.rpeButtonText,
                        selectedRpe === value &&
                          styles.rpeButtonTextSelected,
                      ]}
                    >
                      {value}
                    </BodyText>
                  </Pressable>
                ))}
              </View>

              {selectedRpe !== null && (
                <BodyText
                  style={
                    styles.rpeSelectedLabel
                  }
                >
                  {selectedRpe} – {BORG_LABELS[selectedRpe]}
                </BodyText>
              )}

              <Pressable
                onPress={handleSaveRpe}
                disabled={
                  savingRpe || selectedRpe === null
                }
                style={[
                  styles.saveRpeButton,
                  (savingRpe || selectedRpe === null) &&
                    styles.saveRpeButtonDisabled,
                ]}
              >
                <BodyText
                  style={
                    styles.saveRpeText
                  }
                >
                  {savingRpe
                    ? "Sparar..."
                    : "Spara skattning"}
                </BodyText>
              </Pressable>

              {rpeMessage && (
                <BodyText
                  style={
                    styles.rpeMessage
                  }
                >
                  {rpeMessage}
                </BodyText>
              )}
            </View>

            <View
              style={
                styles.commentSection
              }
            >
              <SectionLabel>
                DIALOG MED COACH
              </SectionLabel>

              <BodyText
                style={
                  styles.commentIntro
                }
              >
                Skriv hur passet kändes eller ställ en fråga till din coach.
              </BodyText>

              {(trainingComments[activeSelectedSession.id] ?? []).length > 0 ? (
                <View style={styles.commentList}>
                  {(trainingComments[activeSelectedSession.id] ?? []).map(
                    (comment) => (
                      <View
                        key={comment.id}
                        style={[
                          styles.commentBubble,
                          comment.author_role === "athlete"
                            ? styles.athleteCommentBubble
                            : styles.coachCommentBubble,
                        ]}
                      >
                        <View style={styles.commentBubbleHeader}>
                          <BodyText style={styles.commentAuthor}>
                            {comment.author_role === "athlete"
                              ? "Du"
                              : "Coach"}
                          </BodyText>

                          <BodyText style={styles.commentDate}>
                            {formatCommentDate(comment.created_at)}
                          </BodyText>
                        </View>

                        <BodyText style={styles.commentBubbleText}>
                          {comment.message}
                        </BodyText>
                      </View>
                    )
                  )}
                </View>
              ) : (
                <BodyText style={styles.noCommentsText}>
                  Ingen meddelanden ännu. Starta dialogen här.
                </BodyText>
              )}

              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Skriv ett meddelande..."
                placeholderTextColor="#666"
                multiline
                textAlignVertical="top"
                style={styles.commentInput}
              />

              <Pressable
                onPress={handleSaveComment}
                disabled={savingComment || !commentText.trim()}
                style={[
                  styles.saveCommentButton,
                  (savingComment || !commentText.trim()) &&
                    styles.saveCommentButtonDisabled,
                ]}
              >
                {savingComment ? (
                  <ActivityIndicator />
                ) : (
                  <BodyText style={styles.saveCommentText}>
                    Skicka meddelande
                  </BodyText>
                )}
              </Pressable>

              {commentMessage && (
                <BodyText style={styles.commentMessage}>
                  {commentMessage}
                </BodyText>
              )}
            </View>
          </Card>
          </View>
        )}
      </Screen>
    </>
  );
}

function DayCard({
  day,
  selectedSessionId,
  onSelectSession,
  completedSessions,
}: {
  day: {
    date: string;
    day: string;
    sessions: AthleteTrainingSession[];
  };

  selectedSessionId: string | null;

  onSelectSession: (
    sessionId: string | null
  ) => void;

  completedSessions: Record<string, boolean>;
}) {
  const hasSessions =
    day.sessions.length > 0;

  return (
    <View
      style={
        styles.dayCard
      }
    >
      <View
        style={
          styles.dayHeader
        }
      >
        <View>
          <BodyText
            style={
              styles.dayName
            }
          >
            {day.day}
          </BodyText>

          <BodyText
            style={
              styles.dayDate
            }
          >
            {formatDate(
              day.date
            )}
          </BodyText>
        </View>

        {hasSessions && (
          <BodyText
            style={
              styles.sessionCount
            }
          >
            {day.sessions.length}{" "}
            pass
          </BodyText>
        )}
      </View>

      {!hasSessions ? (
        <View
          style={
            styles.restDay
          }
        >
          <BodyText
            style={
              styles.restText
            }
          >
            Ingen planerad träning
          </BodyText>
        </View>
      ) : (
        day.sessions.map(
          (session) => {
            const selected =
              selectedSessionId ===
              session.id;

            return (
              <Pressable
                key={session.id}
                onPress={() =>
                  onSelectSession(
                    selected
                      ? null
                      : session.id
                  )
                }
                style={[
                  styles.session,
                  getSessionStyle(
                    session.type
                  ),
                  selected &&
                    styles.sessionSelected,
                ]}
              >
                <View
                  style={
                    styles.sessionTop
                  }
                >
                  <BodyText
                    style={
                      styles.sessionSlot
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

                  <View style={styles.sessionTopRight}>
                    <BodyText
                      style={
                        styles.sessionType
                      }
                    >
                      {
                        TYPE_ICONS[
                          session.type
                        ]
                      }
                    </BodyText>

                    {completedSessions[session.id] && (
                      <View style={styles.completedBadge}>
                        <BodyText style={styles.completedBadgeText}>
                          ✓
                        </BodyText>
                      </View>
                    )}
                  </View>
                </View>

                <BodyText
                  style={
                    styles.sessionTitle
                  }
                >
                  {session.title}
                </BodyText>

                <BodyText
                  style={
                    styles.sessionDescription
                  }
                  numberOfLines={
                    selected
                      ? undefined
                      : 2
                  }
                >
                  {
                    session.description
                  }
                </BodyText>

                <BodyText
                  style={
                    styles.readMore
                  }
                >
                  {selected
                    ? "Dölj instruktion"
                    : "Visa instruktion →"}
                </BodyText>
              </Pressable>
            );
          }
        )
      )}
    </View>
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
      <SectionLabel>TRÄNINGSPERIOD</SectionLabel>
      <View style={styles.cycleOverviewList}>
        {visibleCycles.map((cycle) => (
          <View key={cycle.id} style={styles.cycleOverviewItem}>
            <BodyText style={styles.cycleOverviewType}>
              {CYCLE_TYPE_LABELS[cycle.type]}
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
  days,
  selectedSessionId,
  onSelectSession,
  completedSessions,
  isDesktop,
}: {
  days: Array<{
    date: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    sessions: AthleteTrainingSession[];
  }>;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
  completedSessions: Record<string, boolean>;
  isDesktop: boolean;
}) {
  return (
    <View style={[styles.monthGrid, isDesktop && styles.monthGridDesktop]}>
      {days.map((day) => (
        <View
          key={day.date}
          style={[
            styles.monthDay,
            !day.isCurrentMonth && styles.monthDayOutside,
          ]}
        >
          <BodyText style={styles.monthDayNumber}>
            {day.dayNumber}
          </BodyText>

          {day.sessions.slice(0, 4).map((session) => {
            const selected = selectedSessionId === session.id;

            return (
              <Pressable
                key={session.id}
                onPress={() =>
                  onSelectSession(selected ? null : session.id)
                }
                style={[
                  styles.monthSession,
                  getSessionStyle(session.type),
                  selected && styles.sessionSelected,
                ]}
              >
                <View style={styles.monthSessionRow}>
                  <BodyText
                    numberOfLines={2}
                    style={styles.monthSessionText}
                  >
                    {TYPE_ICONS[session.type]} {session.title}
                  </BodyText>

                  {completedSessions[session.id] && (
                    <BodyText style={styles.monthCompletedMark}>
                      ✓
                    </BodyText>
                  )}
                </View>
              </Pressable>
            );
          })}

          {day.sessions.length > 4 && (
            <BodyText style={styles.monthMoreText}>
              +{day.sessions.length - 4} till
            </BodyText>
          )}
        </View>
      ))}
    </View>
  );
}

function getSessionStyle(
  type: SessionType
) {
  if (type === "quality") {
    return styles.sessionQuality;
  }

  if (type === "long") {
    return styles.sessionLong;
  }

  if (type === "rest") {
    return styles.sessionRest;
  }

  return styles.sessionEasy;
}

function parseDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
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

function formatCycleDate(date: string) {
  return parseDate(date).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function getMonthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function addMonths(date: string, amount: number) {
  const current = new Date(`${date}T12:00:00`);
  current.setMonth(current.getMonth() + amount);
  current.setDate(1);
  return formatISODate(current);
}

function formatMonthTitle(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "sv-SE",
    { month: "long", year: "numeric" }
  );
}

function createMonthDays(
  monthStart: string,
  sessions: AthleteTrainingSession[]
) {
  const firstDay = new Date(`${monthStart}T12:00:00`);
  const weekday = firstDay.getDay() || 7;
  const gridStart = addDays(monthStart, -(weekday - 1));
  const currentMonth = monthStart.slice(0, 7);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      dayNumber: Number(date.slice(8, 10)),
      isCurrentMonth: date.startsWith(currentMonth),
      sessions: sessions
        .filter((session) => session.date === date)
        .sort((a, b) => getSlotOrder(a.slot) - getSlotOrder(b.slot)),
    };
  });
}

function createWeekDays(
  week: TrainingWeek,
  athleteId: string
) {
  const athleteSessions =
    week.sessions.filter(
      (session) =>
        session.athleteId ===
        athleteId
    );

  return WEEK_DAYS.map(
    ({ day, offset }) => {
      const date =
        addDays(
          week.startDate,
          offset
        );

      const sessions =
        athleteSessions
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
          );

      return {
        date,
        day,
        sessions,
      };
    }
  );
}

function findSession(
  days: ReturnType<
    typeof createWeekDays
  >,
  sessionId: string | null
) {
  if (!sessionId) {
    return null;
  }

  for (const day of days) {
    const session =
      day.sessions.find(
        (item) =>
          item.id === sessionId
      );

    if (session) {
      return session;
    }
  }

  return null;
}

function findNextSession(
  weeks: TrainingWeek[],
  athleteId: string
) {
  const sessions =
    weeks
      .flatMap(
        (week) =>
          week.sessions
      )
      .filter(
        (session) =>
          session.athleteId ===
            athleteId &&
          session.type !== "rest"
      )
      .sort((a, b) =>
        a.date.localeCompare(
          b.date
        )
      );

  const today =
    formatISODate(
      new Date()
    );

  return (
    sessions.find(
      (session) =>
        session.date >= today
    ) ?? null
  );
}

function addDays(
  date: string,
  amount: number
) {
  const result =
    new Date(
      `${date}T12:00:00`
    );

  result.setDate(
    result.getDate() +
      amount
  );

  return formatISODate(
    result
  );
}

function getMonday(
  date: string
) {
  const result =
    new Date(
      `${date}T12:00:00`
    );

  const day =
    result.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      difference
  );

  return formatISODate(
    result
  );
}

function getWeekNumber(
  date: string
) {
  const current =
    new Date(
      `${date}T12:00:00`
    );

  const target =
    new Date(
      Date.UTC(
        current.getFullYear(),
        current.getMonth(),
        current.getDate()
      )
    );

  const dayNumber =
    target.getUTCDay() || 7;

  target.setUTCDate(
    target.getUTCDate() +
      4 -
      dayNumber
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
    (((target.getTime() -
      yearStart.getTime()) /
      86400000) +
      1) /
      7
  );
}

function formatISODate(
  date: Date
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSlotOrder(
  slot: SessionSlot
) {
  if (slot === "morning") {
    return 1;
  }

  if (
    slot === "afternoon"
  ) {
    return 2;
  }

  return 3;
}

function formatDate(
  date: string
) {
  return new Date(
    `${date}T12:00:00`
  ).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
    }
  );
}

function formatLongDate(
  date: string
) {
  return new Date(
    `${date}T12:00:00`
  ).toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );
}

function formatCommentDate(value: string) {
  return new Date(value).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWeekRange(
  startDate: string
) {
  const end =
    addDays(
      startDate,
      6
    );

  return `${formatDate(
    startDate
  )}–${formatDate(end)}`;
}


function parseTimeToSeconds(value: string): number | null {
  const parts = value.trim().split(":").map(Number);
  if (!value.trim() || parts.some(Number.isNaN)) return null;
  if (parts.length === 2) {
    if (parts[1] < 0 || parts[1] >= 60) return null;
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    if (parts[1] < 0 || parts[1] >= 60 || parts[2] < 0 || parts[2] >= 60) return null;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}
function formatTimeValue(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "–";
  const s = Math.round(seconds), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
}
function formatPaceValue(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "–";
  const s = Math.round(seconds); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,"0")}/km`;
}
function paceInputValue(seconds: number | null): string { return seconds === null ? "" : formatPaceValue(seconds).replace("/km", ""); }

function AthletePerformanceView({ athleteId, athleteName, isDesktop }: { athleteId: string; athleteName: string; isDesktop: boolean }) {
  const [tests,setTests]=useState<AthleteTestValue[]>([]); const [pbs,setPbs]=useState<AthletePersonalBest[]>([]);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState<string|null>(null);
  const [editingTestId,setEditingTestId]=useState<string|null>(null); const [editingPbId,setEditingPbId]=useState<string|null>(null);
  const emptyTest=()=>({test_date:formatISODate(new Date()),lt_pulse:"",lt_pace:"",at_pulse:"",at_pace:"",lt_lactate:"",at_lactate:"",weight_kg:"",notes:""});
  const [testForm,setTestForm]=useState(emptyTest()); const [pbForm,setPbForm]=useState({distance:"",time:"",achieved_date:"",notes:""});

  async function loadPerformance() {
    try { setLoading(true); const [tr,pr]=await Promise.all([
      supabase.from("athlete_test_values").select("*").eq("athlete_id",athleteId).order("test_date",{ascending:false}),
      supabase.from("athlete_personal_bests").select("*").eq("athlete_id",athleteId).order("distance",{ascending:true}),
    ]); if(tr.error) throw tr.error; if(pr.error) throw pr.error;
      const loaded=(tr.data??[]) as AthleteTestValue[]; setTests(loaded); setPbs((pr.data??[]) as AthletePersonalBest[]);
      if(loaded[0] && !editingTestId){ const t=loaded[0]; setEditingTestId(t.id); setTestForm({test_date:t.test_date,lt_pulse:t.lt_pulse?.toString()??"",lt_pace:paceInputValue(t.lt_pace_seconds),at_pulse:t.at_pulse?.toString()??"",at_pace:paceInputValue(t.at_pace_seconds),lt_lactate:t.lt_lactate?.toString()??"",at_lactate:t.at_lactate?.toString()??"",weight_kg:t.weight_kg?.toString()??"",notes:t.notes??""}); }
    } catch(e){ console.error("Kunde inte läsa prestationsdata:",e); setMessage(e instanceof Error?e.message:"Kunde inte läsa prestationsdata."); } finally { setLoading(false); }
  }
  useEffect(()=>{loadPerformance();},[athleteId]);
  function editTest(t:AthleteTestValue){setEditingTestId(t.id);setTestForm({test_date:t.test_date,lt_pulse:t.lt_pulse?.toString()??"",lt_pace:paceInputValue(t.lt_pace_seconds),at_pulse:t.at_pulse?.toString()??"",at_pace:paceInputValue(t.at_pace_seconds),lt_lactate:t.lt_lactate?.toString()??"",at_lactate:t.at_lactate?.toString()??"",weight_kg:t.weight_kg?.toString()??"",notes:t.notes??""});}
  function newTest(){setEditingTestId(null);setTestForm(emptyTest());}
  async function saveTest(){try{setSaving(true);setMessage(null);const payload={athlete_id:athleteId,test_date:testForm.test_date||formatISODate(new Date()),lt_pulse:testForm.lt_pulse?Number(testForm.lt_pulse):null,lt_pace_seconds:parseTimeToSeconds(testForm.lt_pace),at_pulse:testForm.at_pulse?Number(testForm.at_pulse):null,at_pace_seconds:parseTimeToSeconds(testForm.at_pace),lt_lactate:testForm.lt_lactate?Number(testForm.lt_lactate.replace(",",".")):null,at_lactate:testForm.at_lactate?Number(testForm.at_lactate.replace(",",".")):null,weight_kg:testForm.weight_kg?Number(testForm.weight_kg.replace(",",".")):null,notes:testForm.notes.trim()||null,updated_at:new Date().toISOString()};const q=editingTestId?supabase.from("athlete_test_values").update(payload).eq("id",editingTestId).eq("athlete_id",athleteId):supabase.from("athlete_test_values").insert(payload);const {error}=await q;if(error)throw error;setMessage("Testvärdena är sparade ✓");await loadPerformance();}catch(e){setMessage(e instanceof Error?`Kunde inte spara: ${e.message}`:"Kunde inte spara testvärden.");}finally{setSaving(false);}}
  async function deleteTest(testId:string){try{setSaving(true);const {error}=await supabase.from("athlete_test_values").delete().eq("id",testId).eq("athlete_id",athleteId);if(error)throw error;newTest();await loadPerformance();setMessage("Testet är borttaget.");}catch(e){setMessage(e instanceof Error?e.message:"Kunde inte ta bort testet.");}finally{setSaving(false);}}
  function editPb(pb:AthletePersonalBest){setEditingPbId(pb.id);setPbForm({distance:pb.distance,time:formatTimeValue(pb.time_seconds),achieved_date:pb.achieved_date??"",notes:pb.notes??""});}
  function newPb(){setEditingPbId(null);setPbForm({distance:"",time:"",achieved_date:"",notes:""});}
  async function savePb(){try{setSaving(true);setMessage(null);const secs=parseTimeToSeconds(pbForm.time);if(!pbForm.distance.trim()||secs===null){setMessage("Fyll i distans och tid, till exempel 10 km och 35:20.");return;}const payload={athlete_id:athleteId,distance:pbForm.distance.trim(),time_seconds:secs,achieved_date:pbForm.achieved_date||null,notes:pbForm.notes.trim()||null,updated_at:new Date().toISOString()};const q=editingPbId?supabase.from("athlete_personal_bests").update(payload).eq("id",editingPbId).eq("athlete_id",athleteId):supabase.from("athlete_personal_bests").insert(payload);const {error}=await q;if(error)throw error;setMessage("Personbästat är sparat ✓");newPb();await loadPerformance();}catch(e){setMessage(e instanceof Error?`Kunde inte spara: ${e.message}`:"Kunde inte spara personbästa.");}finally{setSaving(false);}}
  async function deletePb(pbId:string){try{setSaving(true);const {error}=await supabase.from("athlete_personal_bests").delete().eq("id",pbId).eq("athlete_id",athleteId);if(error)throw error;newPb();await loadPerformance();setMessage("Personbästat är borttaget.");}catch(e){setMessage(e instanceof Error?e.message:"Kunde inte ta bort personbästat.");}finally{setSaving(false);}}
  const latest=tests[0]??null; const distances=["1500 m","3 km","5 km","10 km","Halvmaraton","Maraton"];
  return <View style={styles.performanceContainer}><SectionLabel>MIN PRESTATION</SectionLabel><BodyText style={styles.performanceTitle}>{athleteName}</BodyText><BodyText style={styles.performanceIntro}>Håll dina testvärden och personbästa uppdaterade här.</BodyText>{message?<BodyText style={styles.performanceMessage}>{message}</BodyText>:null}{loading?<View style={styles.performanceLoading}><ActivityIndicator/></View>:<>
    <Card style={styles.performanceCard}><SectionLabel>FYSIOLOGI</SectionLabel><BodyText style={styles.performanceSectionTitle}>Senaste test</BodyText><View style={[styles.performanceGrid,isDesktop&&styles.performanceGridDesktop]}><PerformanceMetric label="LT-puls" value={latest?.lt_pulse?`${latest.lt_pulse} bpm`:"–"}/><PerformanceMetric label="LT-fart" value={formatPaceValue(latest?.lt_pace_seconds??null)}/><PerformanceMetric label="AT-puls" value={latest?.at_pulse?`${latest.at_pulse} bpm`:"–"}/><PerformanceMetric label="AT-fart" value={formatPaceValue(latest?.at_pace_seconds??null)}/><PerformanceMetric label="Vikt" value={latest?.weight_kg?`${latest.weight_kg} kg`:"–"}/><PerformanceMetric label="Testdatum" value={latest?.test_date??"–"}/></View>
      <View style={styles.performanceForm}><BodyText style={styles.performanceFormTitle}>{editingTestId?"Redigera test":"Nytt test"}</BodyText><TextInput style={styles.performanceInput} placeholder="Datum (YYYY-MM-DD)" value={testForm.test_date} onChangeText={v=>setTestForm(f=>({...f,test_date:v}))}/><View style={styles.performanceTwoColumns}><TextInput style={styles.performanceInput} placeholder="LT-puls" keyboardType="numeric" value={testForm.lt_pulse} onChangeText={v=>setTestForm(f=>({...f,lt_pulse:v}))}/><TextInput style={styles.performanceInput} placeholder="LT-fart, t.ex. 3:50" value={testForm.lt_pace} onChangeText={v=>setTestForm(f=>({...f,lt_pace:v}))}/><TextInput style={styles.performanceInput} placeholder="AT-puls" keyboardType="numeric" value={testForm.at_pulse} onChangeText={v=>setTestForm(f=>({...f,at_pulse:v}))}/><TextInput style={styles.performanceInput} placeholder="AT-fart, t.ex. 3:25" value={testForm.at_pace} onChangeText={v=>setTestForm(f=>({...f,at_pace:v}))}/><TextInput style={styles.performanceInput} placeholder="LT-laktat" keyboardType="decimal-pad" value={testForm.lt_lactate} onChangeText={v=>setTestForm(f=>({...f,lt_lactate:v}))}/><TextInput style={styles.performanceInput} placeholder="AT-laktat" keyboardType="decimal-pad" value={testForm.at_lactate} onChangeText={v=>setTestForm(f=>({...f,at_lactate:v}))}/><TextInput style={styles.performanceInput} placeholder="Vikt, kg" keyboardType="decimal-pad" value={testForm.weight_kg} onChangeText={v=>setTestForm(f=>({...f,weight_kg:v}))}/></View><TextInput style={[styles.performanceInput,styles.performanceTextArea]} placeholder="Anteckning från testet" multiline value={testForm.notes} onChangeText={v=>setTestForm(f=>({...f,notes:v}))}/><View style={styles.performanceActions}><Pressable onPress={saveTest} disabled={saving} style={styles.performancePrimaryButton}><BodyText style={styles.performancePrimaryButtonText}>{saving?"Sparar...":"Spara test"}</BodyText></Pressable><Pressable onPress={newTest} style={styles.performanceSecondaryButton}><BodyText>Nytt test</BodyText></Pressable>{editingTestId?<Pressable onPress={()=>deleteTest(editingTestId)} disabled={saving} style={styles.performanceDangerButton}><BodyText style={styles.performanceDangerText}>Ta bort</BodyText></Pressable>:null}</View></View>
      {tests.length>0?<View style={styles.performanceHistory}><BodyText style={styles.performanceFormTitle}>Testhistorik</BodyText>{tests.map(t=><Pressable key={t.id} onPress={()=>editTest(t)} style={styles.performanceHistoryRow}><View style={styles.performanceHistoryMain}><BodyText style={styles.performanceHistoryDate}>{t.test_date}</BodyText><BodyText style={styles.performanceHistoryValues}>LT {t.lt_pulse??"–"} bpm · {formatPaceValue(t.lt_pace_seconds)} · AT {t.at_pulse??"–"} bpm · {formatPaceValue(t.at_pace_seconds)}</BodyText></View><BodyText style={styles.performanceEditText}>Redigera</BodyText></Pressable>)}</View>:null}</Card>
    <Card style={styles.performanceCard}><SectionLabel>PERSONBÄSTA</SectionLabel><BodyText style={styles.performanceSectionTitle}>Dina bästa tider</BodyText><View style={styles.pbQuickList}>{distances.map(d=>{const pb=pbs.find(x=>x.distance.toLowerCase()===d.toLowerCase());return <Pressable key={d} onPress={()=>pb?editPb(pb):setPbForm(f=>({...f,distance:d}))} style={styles.pbQuickItem}><BodyText style={styles.pbQuickDistance}>{d}</BodyText><BodyText style={styles.pbQuickTime}>{pb?formatTimeValue(pb.time_seconds):"Lägg till"}</BodyText></Pressable>})}</View>{pbs.map(pb=><Pressable key={pb.id} onPress={()=>editPb(pb)} style={styles.performanceHistoryRow}><View style={styles.performanceHistoryMain}><BodyText style={styles.performanceHistoryDate}>{pb.distance} · {formatTimeValue(pb.time_seconds)}</BodyText><BodyText style={styles.performanceHistoryValues}>{pb.achieved_date||"Datum saknas"}</BodyText></View><BodyText style={styles.performanceEditText}>Redigera</BodyText></Pressable>)}<View style={styles.performanceForm}><BodyText style={styles.performanceFormTitle}>{editingPbId?"Redigera personbästa":"Lägg till personbästa"}</BodyText><TextInput style={styles.performanceInput} placeholder="Distans, t.ex. 10 km" value={pbForm.distance} onChangeText={v=>setPbForm(f=>({...f,distance:v}))}/><TextInput style={styles.performanceInput} placeholder="Tid, t.ex. 35:20" value={pbForm.time} onChangeText={v=>setPbForm(f=>({...f,time:v}))}/><TextInput style={styles.performanceInput} placeholder="Datum (YYYY-MM-DD)" value={pbForm.achieved_date} onChangeText={v=>setPbForm(f=>({...f,achieved_date:v}))}/><TextInput style={[styles.performanceInput,styles.performanceTextArea]} placeholder="Anteckning" multiline value={pbForm.notes} onChangeText={v=>setPbForm(f=>({...f,notes:v}))}/><View style={styles.performanceActions}><Pressable onPress={savePb} disabled={saving} style={styles.performancePrimaryButton}><BodyText style={styles.performancePrimaryButtonText}>{saving?"Sparar...":"Spara PB"}</BodyText></Pressable><Pressable onPress={newPb} style={styles.performanceSecondaryButton}><BodyText>Rensa</BodyText></Pressable>{editingPbId?<Pressable onPress={()=>deletePb(editingPbId)} disabled={saving} style={styles.performanceDangerButton}><BodyText style={styles.performanceDangerText}>Ta bort</BodyText></Pressable>:null}</View></View></Card>
  </>}</View>;
}
function PerformanceMetric({label,value}:{label:string;value:string}){return <View style={styles.performanceMetric}><BodyText style={styles.performanceMetricLabel}>{label}</BodyText><BodyText style={styles.performanceMetricValue}>{value}</BodyText></View>;}

const styles =
  StyleSheet.create({
    header: {
      marginBottom: 20,
    },

    headerDesktop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-end",
    },

    headerRight: {
      alignItems: "flex-end",
    },

    status: {
      marginTop: 8,
      fontSize: 14,
      opacity: 0.7,
    },

    logoutButton: {
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    logoutText: {
      fontSize: 12,
      fontWeight: "600",
      opacity: 0.7,
    },

    nextDate: {
      marginTop: 8,
      fontSize: 14,
      opacity: 0.55,
    },

    nextTitle: {
      marginTop: 6,
      fontSize: 20,
      fontWeight: "700",
    },

    nextDescription: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      opacity: 0.7,
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

    completionStatsRow: {
      marginTop: 12,
      flexDirection: "row",
      gap: 10,
    },

    completionStat: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      backgroundColor: "#F0F8F3",
      borderWidth: 1,
      borderColor: "#C7E5D1",
    },

    completionStatValue: {
      fontSize: 22,
      fontWeight: "700",
      color: "#172033",
    },

    completionStatLabel: {
      marginTop: 2,
      fontSize: 11,
      color: "#536174",
    },

    completionWeekText: {
      marginTop: 10,
      fontSize: 12,
      color: "#536174",
    },

    viewToggle: {
      flexDirection: "row",
      alignSelf: "center",
      marginTop: 8,
      marginBottom: 14,
      padding: 4,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.08)",
    },

    viewToggleButton: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 9,
    },

    viewToggleButtonActive: {
      backgroundColor: "#8EE3B0",
    },

    viewToggleText: {
      fontSize: 13,
      fontWeight: "600",
      opacity: 0.7,
    },

    viewToggleTextActive: {
      color: "#111827",
      opacity: 1,
    },

    weekNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 8,
      marginBottom: 18,
    },

    weekNavigationDesktop: {
      maxWidth: 1100,
      alignSelf: "center",
      width: "100%",
    },

    navigationButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    navigationButtonDisabled: {
      opacity: 0.25,
    },

    navigationText: {
      fontSize: 22,
      fontWeight: "600",
    },

    weekTitle: {
      alignItems: "center",
    },

    weekNumber: {
      marginTop: 4,
      fontSize: 18,
      fontWeight: "700",
    },

    weekDate: {
      marginTop: 2,
      fontSize: 12,
      opacity: 0.5,
    },

    week: {
      gap: 12,
    },

    weekDesktop: {
      flexDirection: "row",
      flexWrap: "wrap",
    },

    dayCard: {
      padding: 16,
      borderRadius: 14,
      backgroundColor:
        "rgba(255,255,255,0.05)",
    },

    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    dayName: {
      fontSize: 16,
      fontWeight: "700",
    },

    dayDate: {
      marginTop: 2,
      fontSize: 13,
      opacity: 0.5,
    },

    sessionCount: {
      fontSize: 12,
      opacity: 0.45,
    },

    restDay: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.08)",
    },

    restText: {
      fontSize: 14,
      opacity: 0.4,
    },

    session: {
      marginTop: 14,
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 1,
    },

    sessionEasy: {
      backgroundColor: "#EAF7EE",
      borderColor: "#B9DFC5",
    },

    sessionQuality: {
      backgroundColor: "#FFF5D9",
      borderColor: "#E8D28C",
    },

    sessionLong: {
      backgroundColor: "#EAF2FF",
      borderColor: "#BDD1F0",
    },

    sessionRest: {
      backgroundColor: "#F1F3F5",
      borderColor: "#D5D9DE",
    },

    sessionSelected: {
      borderColor: "#111827",
      borderWidth: 2,
    },

    sessionTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    sessionTopRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    completedBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#8EE3B0",
    },

    completedBadgeText: {
      color: "#14532D",
      fontSize: 13,
      fontWeight: "800",
    },

    sessionSlot: {
      fontSize: 12,
      fontWeight: "600",
      color: "#4B5563",
      opacity: 1,
    },

    sessionType: {
      fontSize: 16,
    },

    sessionTitle: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: "700",
      color: "#111827",
    },

    sessionDescription: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 20,
      color: "#374151",
      opacity: 1,
    },

    readMore: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "600",
      color: "#374151",
      opacity: 0.8,
    },

    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },

    monthGridDesktop: {
      gap: 8,
    },

    monthDay: {
      // Seven equal columns so Monday starts at the far left and
      // Sunday stays in the seventh column instead of wrapping early.
      width: "13.2%",
      minHeight: 112,
      padding: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      backgroundColor: "rgba(255,255,255,0.04)",
    },

    monthDayOutside: {
      opacity: 0.35,
    },

    monthDayNumber: {
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 4,
    },

    monthSession: {
      marginTop: 4,
      padding: 4,
      borderRadius: 5,
      borderWidth: 1,
    },

    monthSessionRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 3,
    },

    monthSessionText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 13,
      color: "#111827",
      fontWeight: "600",
    },

    monthCompletedMark: {
      fontSize: 11,
      fontWeight: "800",
      color: "#166534",
    },

    monthMoreText: {
      marginTop: 4,
      fontSize: 10,
      opacity: 0.6,
    },

    detailHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-start",
    },

    detailHeaderText: {
      flex: 1,
    },

    detailTitle: {
      marginTop: 5,
      fontSize: 20,
      fontWeight: "700",
    },

    detailSlot: {
      marginTop: 10,
      fontSize: 14,
      opacity: 0.6,
    },

    detailDescription: {
      marginTop: 14,
      fontSize: 15,
      lineHeight: 23,
      opacity: 0.8,
    },

    completionSection: {
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.1)",
    },

    completionButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#C7E5D1",
      backgroundColor: "#F0F8F3",
    },

    completionCheckbox: {
      width: 28,
      height: 28,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: "#6B7280",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
    },

    completionCheckboxDone: {
      borderColor: "#4FA875",
      backgroundColor: "#8EE3B0",
    },

    completionCheck: {
      color: "#14532D",
      fontSize: 18,
      lineHeight: 20,
      fontWeight: "800",
    },

    completionButtonText: {
      marginLeft: 12,
      flex: 1,
    },

    completionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#172033",
    },

    completionSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: "#536174",
    },

    completionMessage: {
      marginTop: 8,
      fontSize: 13,
      color: "#4B5563",
    },

    rpeSection: {
      marginTop: 28,
      paddingTop: 22,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.1)",
    },

    rpeIntro: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.6,
    },

    rpeScale: {
      marginTop: 14,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      maxWidth: 560,
    },

    rpeButton: {
      width: 44,
      height: 44,
      borderRadius: 9,
      borderWidth: 1,
      borderColor:
        "rgba(30,41,59,0.16)",
      backgroundColor:
        "rgba(255,255,255,0.7)",
      alignItems: "center",
      justifyContent: "center",
    },

    rpeButtonSelected: {
      backgroundColor: "#8EE3B0",
      borderColor: "#4FA875",
    },

    rpeButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#374151",
    },

    rpeButtonTextSelected: {
      color: "#111827",
    },

    rpeSelectedLabel: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: "600",
      color: "#374151",
    },

    saveRpeButton: {
      alignSelf: "flex-start",
      marginTop: 12,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 9,
      backgroundColor: "#8EE3B0",
    },

    saveRpeButtonDisabled: {
      opacity: 0.5,
    },

    saveRpeText: {
      color: "#111",
      fontWeight: "700",
    },

    rpeMessage: {
      marginTop: 8,
      fontSize: 13,
      color: "#4B5563",
    },

    commentSection: {
      marginTop: 28,
      paddingTop: 22,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.1)",
    },

    commentIntro: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.6,
    },

    commentList: {
      marginTop: 14,
      gap: 10,
    },

    commentBubble: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },

    athleteCommentBubble: {
      backgroundColor: "#EAF7EE",
      borderColor: "#B9DFC5",
    },

    coachCommentBubble: {
      backgroundColor: "#EAF2FF",
      borderColor: "#BDD1F0",
    },

    commentBubbleHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },

    commentAuthor: {
      fontSize: 12,
      fontWeight: "700",
      color: "#374151",
    },

    commentDate: {
      fontSize: 11,
      color: "#6B7280",
    },

    commentBubbleText: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 20,
      color: "#111827",
    },

    noCommentsText: {
      marginTop: 14,
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.6,
    },

    commentInput: {
      marginTop: 14,
      minHeight: 120,
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.2)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: "#111",
      fontSize: 15,
    },

    saveCommentButton: {
      alignSelf: "flex-start",
      marginTop: 12,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 9,
      backgroundColor: "#8EE3B0",
    },

    saveCommentButtonDisabled: {
      opacity: 0.6,
    },

    saveCommentText: {
      color: "#111",
      fontSize: 13,
      fontWeight: "700",
    },

    commentMessage: {
      marginTop: 10,
      fontSize: 13,
      opacity: 0.6,
    },

    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    closeText: {
      fontSize: 22,
      lineHeight: 24,
      opacity: 0.7,
    },

    performanceContainer:{marginTop:8,gap:16}, performanceTitle:{marginTop:4,fontSize:24,fontWeight:"800",color:"#172033"}, performanceIntro:{marginTop:4,fontSize:14,lineHeight:20,opacity:0.65}, performanceMessage:{marginTop:4,fontSize:13,color:"#278653"}, performanceLoading:{paddingVertical:40,alignItems:"center"}, performanceCard:{padding:18}, performanceSectionTitle:{marginTop:6,fontSize:19,fontWeight:"800",color:"#172033"}, performanceGrid:{marginTop:14,gap:10}, performanceGridDesktop:{flexDirection:"row",flexWrap:"wrap"}, performanceMetric:{flexGrow:1,flexBasis:"30%",padding:12,borderRadius:10,backgroundColor:"#F0F8F3",borderWidth:1,borderColor:"#C7E5D1"}, performanceMetricLabel:{fontSize:11,fontWeight:"700",color:"#536174",textTransform:"uppercase"}, performanceMetricValue:{marginTop:4,fontSize:18,fontWeight:"800",color:"#172033"}, performanceForm:{marginTop:18,paddingTop:18,borderTopWidth:1,borderTopColor:"#E2E8F0"}, performanceFormTitle:{fontSize:15,fontWeight:"800",color:"#172033"}, performanceTwoColumns:{gap:10}, performanceInput:{marginTop:10,minHeight:44,borderWidth:1,borderColor:"#CBD5E1",borderRadius:9,paddingHorizontal:12,paddingVertical:10,backgroundColor:"#FFFFFF",color:"#172033",fontSize:15}, performanceTextArea:{minHeight:90,textAlignVertical:"top"}, performanceActions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:12}, performancePrimaryButton:{paddingHorizontal:16,paddingVertical:11,borderRadius:9,backgroundColor:"#8EE3B0"}, performancePrimaryButtonText:{color:"#111827",fontSize:13,fontWeight:"800"}, performanceSecondaryButton:{paddingHorizontal:16,paddingVertical:11,borderRadius:9,backgroundColor:"#E2E8F0"}, performanceDangerButton:{paddingHorizontal:16,paddingVertical:11,borderRadius:9,backgroundColor:"#FEE2E2"}, performanceDangerText:{color:"#B91C1C",fontSize:13,fontWeight:"700"}, performanceHistory:{marginTop:20,gap:8}, performanceHistoryRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:12,borderRadius:9,backgroundColor:"#F8FAFC",borderWidth:1,borderColor:"#E2E8F0"}, performanceHistoryMain:{flex:1}, performanceHistoryDate:{fontSize:14,fontWeight:"800",color:"#172033"}, performanceHistoryValues:{marginTop:3,fontSize:12,lineHeight:18,color:"#536174"}, performanceEditText:{marginLeft:12,fontSize:12,fontWeight:"700",color:"#278653"}, pbQuickList:{marginTop:14,gap:8}, pbQuickItem:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:12,borderRadius:9,backgroundColor:"#F8FAFC",borderWidth:1,borderColor:"#E2E8F0"}, pbQuickDistance:{fontSize:14,fontWeight:"700",color:"#172033"}, pbQuickTime:{fontSize:14,fontWeight:"800",color:"#278653"},
    emptyState: {
      paddingVertical: 50,
    },

    emptyText: {
      marginTop: 10,
      fontSize: 16,
      opacity: 0.6,
    },
  });