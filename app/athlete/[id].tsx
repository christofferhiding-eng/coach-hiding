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

import { getAthlete } from "@/features/athletes";

import {
  getStoredTrainingWeeks,
  TrainingSession,
  TrainingWeek,
} from "@/features/training-plan";

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

export default function AthleteHomeScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const { width } =
    useWindowDimensions();

  const isDesktop = width >= 900;

  const athlete = getAthlete(id);

  const [weeks, setWeeks] =
    useState<TrainingWeek[]>([]);

  const [weekIndex, setWeekIndex] =
    useState(0);

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
        const storedWeeks =
          await getStoredTrainingWeeks();

        const weeksByStartDate =
          new Map<string, TrainingWeek>();

        for (const week of storedWeeks) {
          const existingWeek =
            weeksByStartDate.get(
              week.startDate
            );

          if (!existingWeek) {
            weeksByStartDate.set(
              week.startDate,
              {
                ...week,
                sessions: [
                  ...week.sessions,
                ],
              }
            );

            continue;
          }

          const sessionIds =
            new Set(
              existingWeek.sessions.map(
                (session) =>
                  session.id
              )
            );

          const newSessions =
            week.sessions.filter(
              (session) =>
                !sessionIds.has(
                  session.id
                )
            );

          existingWeek.sessions.push(
            ...newSessions
          );
        }

        const sortedWeeks =
          Array.from(
            weeksByStartDate.values()
          ).sort((a, b) =>
            a.startDate.localeCompare(
              b.startDate
            )
          );

        setWeeks(sortedWeeks);

        /*
         * Ladda kommentarer.
         */

        const {
          data: commentData,
          error: commentError,
        } = await supabase
          .from("training_sessions")
          .select(
            "id, athlete_comment"
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

        if (!sortedWeeks.length) {
          return;
        }

        const today =
          formatISODate(new Date());

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

      console.log(
        "Försöker spara kommentar för pass:",
        selectedSessionId
      );

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

      console.log(
        "Resultat från sparning:",
        {
          data,
          error,
        }
      );

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
        console.error(
          "Ingen rad uppdaterades."
        );

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
      athlete.id
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
      athlete.id
    );

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
            <BodyText
              style={
                styles.status
              }
            >
              {getStatusIcon(
                athlete.status
              )}{" "}
              {athlete.statusText}
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
              style={
                styles.navigationText
              }
            >
              ←
            </BodyText>
          </Pressable>

          <View
            style={
              styles.weekTitle
            }
          >
            <SectionLabel>
              TRÄNINGSVECKA
            </SectionLabel>

            <BodyText
              style={
                styles.weekNumber
              }
            >
              {week.title}
            </BodyText>

            <BodyText
              style={
                styles.weekDate
              }
            >
              {formatWeekRange(
                week.startDate
              )}
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
            <BodyText
              style={
                styles.navigationText
              }
            >
              →
            </BodyText>
          </Pressable>
        </View>

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
              selectedSessionId={
                selectedSessionId
              }
              onSelectSession={
                setSelectedSessionId
              }
            />
          ))}
        </View>

        {selectedSession && (
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
                      selectedSession.type
                    ]
                  }{" "}
                  {
                    selectedSession.title
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
                  selectedSession.slot
                ]
              }{" "}
              {
                SLOT_LABELS[
                  selectedSession.slot
                ]
              }
            </BodyText>

            <BodyText
              style={
                styles.detailDescription
              }
            >
              {
                selectedSession.description
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
    sessions: TrainingSession[];
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
  slot:
    | "morning"
    | "afternoon"
    | "evening"
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

function getStatusIcon(
  status:
    | "green"
    | "yellow"
    | "red"
) {
  if (status === "red") {
    return "🔴";
  }

  if (status === "yellow") {
    return "🟡";
  }

  return "🟢";
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
      padding: 14,
      borderRadius: 10,
      backgroundColor:
        "rgba(255,255,255,0.055)",
    },

    sessionSelected: {
      backgroundColor:
        "rgba(142,227,176,0.12)",
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
      opacity: 0.55,
    },

    sessionType: {
      fontSize: 16,
    },

    sessionTitle: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: "700",
    },

    sessionDescription: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.65,
    },

    readMore: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "600",
      opacity: 0.55,
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