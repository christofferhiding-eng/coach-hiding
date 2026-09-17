import React, {
  useEffect,
  useState,
} from "react";

import {
  Pressable,
  StyleSheet,
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

export default function CoachAthleteScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const router = useRouter();

  const { width } =
    useWindowDimensions();

  const isDesktop = width >= 900;

  const [athlete, setAthlete] =
    useState<CoachAthlete | null>(null);

  const [sessions, setSessions] =
    useState<TrainingSession[]>([]);

  const [weekStart, setWeekStart] =
    useState<string>(() =>
      getMonday(new Date())
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

  useEffect(() => {
    if (!id) {
      return;
    }

    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: athleteData,
        error: athleteError,
      } = await supabase
        .from("profiles")
        .select(
          "name, athlete_id"
        )
        .eq("athlete_id", id)
        .eq("role", "athlete")
        .maybeSingle();

      if (athleteError) {
        throw athleteError;
      }

      if (!athleteData) {
        setAthlete(null);
        setSessions([]);
        return;
      }

      setAthlete({
        id: athleteData.athlete_id,
        name: athleteData.name,
        status: "green",
        statusText: "Redo för dagens pass",
      });

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase
        .from("training_sessions")
        .select(
          "id, athlete_id, date, day, slot, title, description, type"
        )
        .eq("athlete_id", id)
        .order("date", {
          ascending: true,
        });

      if (sessionError) {
        throw sessionError;
      }

      const mapped: TrainingSession[] =
        (
          (sessionData ?? []) as SupabaseSession[]
        ).map((session) => ({
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
        }));

      setSessions(mapped);
    } catch (error) {
      console.error(
        "Kunde inte läsa adepten:",
        error
      );

      setError(
        "Kunde inte läsa adepten."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <BodyText>
            Laddar adept...
          </BodyText>
        </View>
      </Screen>
    );
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

      setWeekStart(
        getMonday(
          parseDate(data.date)
        )
      );

      await loadData();
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

      await loadData();
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

        <View
          style={[
            styles.weekNavigation,
            isDesktop &&
              styles.weekNavigationDesktop,
          ]}
        >
          <Pressable
            onPress={() =>
              changeWeek(-1)
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
              Vecka {weekNumber}
            </BodyText>

            <BodyText
              style={styles.weekDate}
            >
              {formatWeekRange(
                weekStart
              )}
            </BodyText>
          </View>

          <Pressable
            onPress={() =>
              changeWeek(1)
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
            <View
              style={styles.calendar}
            >
              {days.map((day) => (
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
              ))}
            </View>
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
                    numberOfLines={2}
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
          sessions.filter(
            (session) =>
              session.date ===
              date
          ),
      };
    }
  );
}

function parseDate(
  date: string
) {
  const [
    year,
    month,
    day,
  ] = date
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}

function getMonday(
  date: Date
) {
  const result =
    new Date(date);

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

  const year =
    result.getFullYear();

  const month =
    String(
      result.getMonth() + 1
    ).padStart(2, "0");

  const dayOfMonth =
    String(
      result.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${dayOfMonth}`;
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

  const year =
    result.getUTCFullYear();

  const month =
    String(
      result.getUTCMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      result.getUTCDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getISOWeek(
  date: Date
) {
  const target =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
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

const styles =
  StyleSheet.create({
    header: {
      marginBottom: 22,
    },

    status: {
      marginTop: 6,
      fontSize: 14,
      color: "#374151",
      opacity: 1,
    },

    headerActions: {
      marginTop: 14,
    },

    previewButton: {
      alignSelf: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#D1D5DB",
    },

    previewButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#374151",
      opacity: 1,
    },

    weekNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 20,
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
      marginTop: 4,
      fontSize: 19,
      fontWeight: "700",
      color: "#111827",
    },

    weekDate: {
      marginTop: 3,
      fontSize: 13,
      color: "#64748B",
      opacity: 1,
    },

    navigationButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#D1D5DB",
    },

    navigationText: {
      fontSize: 21,
      fontWeight: "600",
      color: "#374151",
    },

    workspace: {
      width: "100%",
    },

    workspaceDesktop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 20,
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

    calendar: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      overflow: "hidden",
    },

    panelColumn: {
      width: 370,
      maxWidth: 370,
    },

    desktopDayRow: {
      minHeight: 88,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: "#FFFFFF",
    },

    desktopDayInfo: {
      width: 82,
    },

    desktopDayName: {
      fontSize: 15,
      fontWeight: "700",
      color: "#111827",
    },

    desktopDate: {
      marginTop: 3,
      fontSize: 12,
      color: "#64748B",
      opacity: 1,
    },

    desktopSessions: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
      minWidth: 0,
    },

    desktopSession: {
      minWidth: 180,
      maxWidth: 280,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#D1D5DB",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 1,
    },

    desktopSlot: {
      fontSize: 11,
      fontWeight: "700",
      color: "#64748B",
      opacity: 1,
    },

    desktopTitle: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: "700",
      color: "#111827",
    },

    desktopDescription: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 17,
      color: "#374151",
      opacity: 1,
    },

    desktopEmpty: {
      fontSize: 13,
      color: "#94A3B8",
      opacity: 1,
    },

    desktopAddButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 10,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#D1D5DB",
    },

    desktopAddText: {
      fontSize: 22,
      lineHeight: 24,
      fontWeight: "400",
      color: "#374151",
      opacity: 1,
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
      marginTop: 5,
      fontSize: 19,
      fontWeight: "700",
      color: "#111827",
    },

    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#D1D5DB",
    },

    closeButtonText: {
      fontSize: 21,
      lineHeight: 23,
      color: "#374151",
      opacity: 1,
    },

    emptyPanel: {
      paddingVertical: 16,
    },

    emptyPanelTitle: {
      marginTop: 7,
      fontSize: 19,
      fontWeight: "700",
      color: "#111827",
    },

    emptyPanelText: {
      marginTop: 9,
      lineHeight: 21,
      fontSize: 14,
      color: "#374151",
      opacity: 1,
    },

    saving: {
      marginTop: 10,
      fontSize: 12,
      color: "#64748B",
      opacity: 1,
    },

    error: {
      marginBottom: 12,
      color: "#B91C1C",
      fontSize: 13,
    },

    loading: {
      paddingVertical: 40,
      alignItems: "center",
    },
  });