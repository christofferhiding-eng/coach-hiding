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
  } from "expo-router";
  
  import Screen from "@/components/ui/Screen";
  import Card from "@/components/ui/Card";
  import BodyText from "@/components/ui/BodyText";
  import Metric from "@/components/ui/Metric";
  import SectionLabel from "@/components/ui/SectionLabel";
  
  import { getAthlete } from "@/features/athletes";
  
  import {
    getStoredTrainingWeeks,
  } from "@/features/training-plan";
  
  import {
    TrainingSession,
    TrainingWeek,
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
  
    useEffect(() => {
      async function loadPlan() {
        try {
          const storedWeeks =
            await getStoredTrainingWeeks();
  
          setWeeks(storedWeeks);
        } catch (error) {
          console.error(
            "Kunde inte läsa träningsplanen:",
            error
          );
        }
      }
  
      loadPlan();
    }, []);
  
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
          <View style={styles.emptyState}>
            <SectionLabel>
              TRÄNING
            </SectionLabel>
  
            <Metric>
              {athlete.name}
            </Metric>
  
            <BodyText
              style={styles.emptyText}
            >
              Din träningsplan är inte
              klar ännu.
            </BodyText>
          </View>
        </Screen>
      );
    }
  
    const week = weeks[weekIndex];
  
    if (!week) {
      return null;
    }
  
    const days = createWeekDays(
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
  
            <BodyText
              style={styles.status}
            >
              {getStatusIcon(
                athlete.status
              )}{" "}
              {athlete.statusText}
            </BodyText>
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
              style={styles.weekTitle}
            >
              <SectionLabel>
                TRÄNINGSVECKA
              </SectionLabel>
  
              <BodyText
                style={styles.weekNumber}
              >
                {week.title}
              </BodyText>
  
              <BodyText
                style={styles.weekDate}
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
                style={styles.detailSlot}
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
        style={styles.day}
      >
        <View
          style={styles.dayHeader}
        >
          <View>
            <BodyText
              style={styles.dayName}
            >
              {day.day}
            </BodyText>
  
            <BodyText
              style={styles.dayDate}
            >
              {formatDate(day.date)}
            </BodyText>
          </View>
  
          {hasSessions && (
            <BodyText
              style={styles.sessionCount}
            >
              {day.sessions.length}{" "}
              {day.sessions.length ===
              1
                ? "pass"
                : "pass"}
            </BodyText>
          )}
        </View>
  
        {!hasSessions ? (
          <View
            style={styles.restDay}
          >
            <BodyText
              style={styles.restText}
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
        const date = addDays(
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
          (week) => week.sessions
        )
        .filter(
          (session) =>
            session.athleteId ===
            athleteId
        )
        .sort((a, b) =>
          a.date.localeCompare(
            b.date
          )
        );
  
    const today =
      formatISODate(new Date());
  
    return (
      sessions.find(
        (session) =>
          session.date >= today &&
          session.type !== "rest"
      ) ?? null
    );
  }
  
  function addDays(
    date: string,
    amount: number
  ) {
    const result =
      new Date(date);
  
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
  
  function formatDate(
    date: string
  ) {
    return new Date(
      date
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
      date
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
    const start =
      new Date(startDate);
  
    const end =
      new Date(startDate);
  
    end.setDate(
      end.getDate() + 6
    );
  
    return `${start.toLocaleDateString(
      "sv-SE",
      {
        day: "numeric",
        month: "short",
      }
    )}–${end.toLocaleDateString(
      "sv-SE",
      {
        day: "numeric",
        month: "short",
      }
    )}`;
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
  
    if (slot === "afternoon") {
      return 2;
    }
  
    return 3;
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
  
  const styles = StyleSheet.create({
    header: {
      marginBottom: 18,
    },
  
    headerDesktop: {
      maxWidth: 900,
      width: "100%",
      alignSelf: "center",
    },
  
    status: {
      marginTop: 5,
      fontSize: 13,
      opacity: 0.6,
    },
  
    nextDate: {
      marginTop: 7,
      fontSize: 13,
      opacity: 0.55,
    },
  
    nextTitle: {
      marginTop: 4,
      fontSize: 21,
      fontWeight: "700",
    },
  
    nextDescription: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.65,
    },
  
    weekNavigation: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 18,
      marginBottom: 12,
    },
  
    weekNavigationDesktop: {
      maxWidth: 900,
      width: "100%",
      alignSelf: "center",
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
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },
  
    navigationButtonDisabled: {
      opacity: 0.25,
    },
  
    navigationText: {
      fontSize: 20,
      fontWeight: "600",
    },
  
    week: {
      width: "100%",
    },
  
    weekDesktop: {
      maxWidth: 900,
      alignSelf: "center",
    },
  
    day: {
      marginBottom: 10,
    },
  
    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 4,
      marginBottom: 5,
    },
  
    dayName: {
      fontSize: 15,
      fontWeight: "700",
    },
  
    dayDate: {
      marginTop: 1,
      fontSize: 11,
      opacity: 0.45,
    },
  
    sessionCount: {
      fontSize: 11,
      opacity: 0.4,
    },
  
    session: {
      padding: 13,
      marginBottom: 7,
      borderRadius: 10,
      backgroundColor:
        "rgba(255,255,255,0.055)",
    },
  
    sessionSelected: {
      backgroundColor:
        "rgba(255,255,255,0.10)",
    },
  
    sessionTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },
  
    sessionSlot: {
      fontSize: 11,
      fontWeight: "600",
      opacity: 0.5,
    },
  
    sessionType: {
      fontSize: 13,
    },
  
    sessionTitle: {
      marginTop: 4,
      fontSize: 17,
      fontWeight: "700",
    },
  
    sessionDescription: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 19,
      opacity: 0.62,
    },
  
    readMore: {
      marginTop: 7,
      fontSize: 11,
      fontWeight: "600",
      opacity: 0.45,
    },
  
    restDay: {
      paddingVertical: 10,
      paddingHorizontal: 13,
      marginBottom: 8,
      borderRadius: 9,
      backgroundColor:
        "rgba(255,255,255,0.025)",
    },
  
    restText: {
      fontSize: 12,
      opacity: 0.35,
    },
  
    detailHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
    },
  
    detailHeaderText: {
      flex: 1,
    },
  
    detailTitle: {
      marginTop: 3,
      fontSize: 19,
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
  
    closeText: {
      fontSize: 20,
      lineHeight: 22,
      opacity: 0.65,
    },
  
    detailSlot: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: "600",
      opacity: 0.5,
    },
  
    detailDescription: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      opacity: 0.75,
    },
  
    emptyState: {
      paddingVertical: 30,
      alignItems: "center",
    },
  
    emptyText: {
      marginTop: 12,
      textAlign: "center",
      opacity: 0.55,
    },
  });