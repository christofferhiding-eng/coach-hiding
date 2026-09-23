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

const CYCLE_TYPE_LABELS: Record<TrainingCycleType, string> = {
  "grundträning": "Grundträning",
  "tävlingsförberedande": "Tävlingsförberedande",
  "specifik period": "Specifik period",
  "tävlingsperiod": "Tävlingsperiod",
};

export default function AthleteHomeScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const { width } =
    useWindowDimensions();

  const isDesktop = width >= 900;

  const [athlete, setAthlete] =
    useState<AthleteProfile | null>(null);

  const [weeks, setWeeks] =
    useState<TrainingWeek[]>([]);

  const [cycles, setCycles] =
    useState<TrainingCycle[]>([]);

  const [weekIndex, setWeekIndex] =
    useState(0);

  const [viewMode, setViewMode] =
    useState<"week" | "month">("week");

  const [monthStart, setMonthStart] =
    useState(() => getMonthStart(formatISODate(new Date())));

  const [selectedSessionId, setSelectedSessionId] =
    useState<string | null>(null);

  const [comments, setComments] =
    useState<Record<string, string>>({});

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
            "Kunde inte läsa kommentarer:",
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
      return;
    }

    setCommentText(
      comments[selectedSessionId] ?? ""
    );

    setCommentMessage(null);
  }, [
    selectedSessionId,
    comments,
  ]);

  async function handleSaveComment() {
    if (!selectedSessionId) {
      return;
    }

    try {
      setSavingComment(true);
      setCommentMessage(null);

      const {
        data,
        error,
      } = await supabase
        .from("training_sessions")
        .update({
          athlete_comment:
            commentText.trim() || null,
        })
        .eq(
          "id",
          selectedSessionId
        )
        .select();

      if (error) {
        console.error(
          "Kunde inte spara kommentar:",
          error
        );

        setCommentMessage(
          `Kunde inte spara: ${error.message}`
        );

        return;
      }

      if (!data || data.length === 0) {
        setCommentMessage(
          "Kommentaren kunde inte sparas. Ingen databasrad uppdaterades."
        );

        return;
      }

      setComments(
        (current) => ({
          ...current,
          [selectedSessionId]:
            commentText.trim(),
        })
      );

      setCommentMessage(
        "Kommentaren är sparad ✓"
      );
    } catch (error) {
      console.error(
        "Kunde inte spara kommentar:",
        error
      );

      setCommentMessage(
        "Något gick fel när kommentaren skulle sparas."
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

      <Screen>
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
        </View>

        {viewMode === "week" ? (
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
        )}

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
              />
            ))}
          </View>
        ) : (
          <MonthCalendar
            days={monthDays}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
            isDesktop={isDesktop}
          />
        )}

        {activeSelectedSession && (
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
                styles.commentSection
              }
            >
              <SectionLabel>
                DIN KOMMENTAR
              </SectionLabel>

              <BodyText
                style={
                  styles.commentIntro
                }
              >
                Hur kändes passet? Skriv
                en kommentar till din coach.
              </BodyText>

              <TextInput
                value={commentText}
                onChangeText={
                  setCommentText
                }
                placeholder="Skriv din kommentar här..."
                placeholderTextColor="#666"
                multiline
                textAlignVertical="top"
                style={
                  styles.commentInput
                }
              />

              <Pressable
                onPress={
                  handleSaveComment
                }
                disabled={
                  savingComment
                }
                style={[
                  styles.saveCommentButton,
                  savingComment &&
                    styles.saveCommentButtonDisabled,
                ]}
              >
                {savingComment ? (
                  <ActivityIndicator />
                ) : (
                  <BodyText
                    style={
                      styles.saveCommentText
                    }
                  >
                    Spara kommentar
                  </BodyText>
                )}
              </Pressable>

              {commentMessage && (
                <BodyText
                  style={
                    styles.commentMessage
                  }
                >
                  {commentMessage}
                </BodyText>
              )}
            </View>
          </Card>
        )}
      </Screen>
    </>
  );
}

function DayCard({
  day,
  selectedSessionId,
  onSelectSession,
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
                <BodyText
                  numberOfLines={2}
                  style={styles.monthSessionText}
                >
                  {TYPE_ICONS[session.type]} {session.title}
                </BodyText>
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

    monthSessionText: {
      fontSize: 10,
      lineHeight: 13,
      color: "#111827",
      fontWeight: "600",
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

    emptyState: {
      paddingVertical: 50,
    },

    emptyText: {
      marginTop: 10,
      fontSize: 16,
      opacity: 0.6,
    },
  });