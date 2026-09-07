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

import { getAthlete } from "@/features/athletes";
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

  const athlete = getAthlete(id);

  const [sessions, setSessions] =
    useState<TrainingSession[]>([]);

  const [weekStart, setWeekStart] =
    useState<string>(() =>
      getMonday(
        new Date()
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

  useEffect(() => {
    if (!id) {
      return;
    }

    loadSessions();
  }, [id]);

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

      if (mapped.length > 0) {
        setWeekStart(
          getMonday(
            parseDate(
              mapped[0].date
            )
          )
        );
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