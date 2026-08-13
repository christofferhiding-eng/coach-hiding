import React, {
    useEffect,
    useRef,
    useState,
  } from "react";
  import {
    Platform,
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
  
  import {
    getStoredTrainingWeeks,
    addTrainingSession,
    updateTrainingSession,
    deleteTrainingSession,
    copyTrainingSession,
    addTrainingWeek,
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
  
  export default function CoachAthleteScreen() {
    const { id } =
      useLocalSearchParams<{ id: string }>();

    const router = useRouter();
  
    const { width } =
      useWindowDimensions();
  
    const isDesktop = width >= 900;
  
    const athlete = getAthlete(id);
  
    const [weeks, setWeeks] =
      useState<TrainingWeek[]>([]);
  
    const [weekIndex, setWeekIndex] =
      useState(0);
  
    const [selectedDate, setSelectedDate] =
      useState<string | null>(null);
  
    const [editingSession, setEditingSession] =
      useState<TrainingSession | null>(
        null
      );
  
    const [copyingSession, setCopyingSession] =
      useState<TrainingSession | null>(
        null
      );
  
    const [draggingSessionId, setDraggingSessionId] =
      useState<string | null>(null);
  
    const [dragOverDate, setDragOverDate] =
      useState<string | null>(null);
  
    const draggingSessionIdRef =
      useRef<string | null>(null);
  
    const dragOverDateRef =
      useRef<string | null>(null);
  
    const hasDraggedRef =
      useRef(false);
  
    const pendingDragSessionRef =
      useRef<TrainingSession | null>(
        null
      );
  
    const pointerStartRef =
      useRef<{
        x: number;
        y: number;
      } | null>(null);
  
    /*
     * Läs in träningsplanen.
     */
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
  
    /*
     * Conditional returns kommer först
     * efter samtliga hooks.
     */
    if (!athlete) {
      return (
        <Screen>
          <BodyText>
            Adepten kunde inte hittas.
          </BodyText>
        </Screen>
      );
    }
  
    const week = weeks[weekIndex];
  
    if (!week) {
      return (
        <Screen>
          <BodyText>
            Ingen träningsplan hittades.
          </BodyText>
        </Screen>
      );
    }
  
    const canGoBack =
      weekIndex > 0;
  
    const canGoForward =
      weekIndex <
      weeks.length - 1;
  
    const days = createWeekDays(
      week,
      athlete.id
    );
  
    const hasPanel =
      selectedDate !== null ||
      editingSession !== null ||
      copyingSession !== null;
  
    async function handleSaveSession(
      data: {
        date: string;
        slot:
          | "morning"
          | "afternoon"
          | "evening";
        type:
          | "easy"
          | "quality"
          | "long"
          | "rest";
        title: string;
        description: string;
      }
    ) {
      try {
        if (copyingSession) {
          await copyTrainingSession(
            copyingSession,
            data.date,
            data.slot
          );
  
          setCopyingSession(null);
        } else if (editingSession) {
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
  
          await updateTrainingSession(
            updatedSession
          );
  
          setEditingSession(null);
        } else {
          const newSession: TrainingSession =
            {
              id: `${athlete.id}-${data.date}-${data.slot}-${Date.now()}`,
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
  
          await addTrainingSession(
            newSession
          );
        }
  
        const updatedWeeks =
          await getStoredTrainingWeeks();
  
        setWeeks(updatedWeeks);
        setSelectedDate(null);
      } catch (error) {
        console.error(
          "Kunde inte spara träningspasset:",
          error
        );
      }
    }
  
    async function handleDeleteSession() {
      if (!editingSession) {
        return;
      }
  
      try {
        await deleteTrainingSession(
          editingSession.id
        );
  
        const updatedWeeks =
          await getStoredTrainingWeeks();
  
        setWeeks(updatedWeeks);
        setSelectedDate(null);
        setEditingSession(null);
      } catch (error) {
        console.error(
          "Kunde inte ta bort träningspasset:",
          error
        );
      }
    }
  
    function handleAddSession(
      date: string
    ) {
      setEditingSession(null);
      setCopyingSession(null);
      setSelectedDate(date);
    }
  
    function handleEditSession(
      session: TrainingSession
    ) {
      /*
       * Om ett faktiskt drag har skett
       * ska klicket inte öppna editorn.
       */
      if (hasDraggedRef.current) {
        hasDraggedRef.current =
          false;
  
        return;
      }
  
      setCopyingSession(null);
      setEditingSession(session);
      setSelectedDate(session.date);
    }
  
    function handleCopySession(
      session: TrainingSession
    ) {
      setEditingSession(null);
      setCopyingSession(session);
      setSelectedDate(session.date);
    }
  
    function closePanel() {
      setSelectedDate(null);
      setEditingSession(null);
      setCopyingSession(null);
    }
  
    function changeWeek(
      direction: number
    ) {
      const nextIndex =
        weekIndex + direction;
  
      if (
        nextIndex < 0 ||
        nextIndex >= weeks.length
      ) {
        return;
      }
  
      setWeekIndex(nextIndex);
      closePanel();
    }
  
    async function handleAddWeek() {
      try {
        const lastWeek =
          weeks[weeks.length - 1];
  
        if (!lastWeek) {
          return;
        }
  
        const nextWeekStart =
          addDays(
            lastWeek.startDate,
            7
          );
  
        const newWeek =
          await addTrainingWeek(
            nextWeekStart
          );
  
        const updatedWeeks =
          await getStoredTrainingWeeks();
  
        setWeeks(updatedWeeks);
  
        const newIndex =
          updatedWeeks.findIndex(
            (item) =>
              item.id === newWeek.id
          );
  
        if (newIndex !== -1) {
          setWeekIndex(newIndex);
        }
  
        closePanel();
      } catch (error) {
        console.error(
          "Kunde inte skapa ny vecka:",
          error
        );
      }
    }
  
    function cleanupDragState() {
      draggingSessionIdRef.current =
        null;

      dragOverDateRef.current =
        null;

      setDraggingSessionId(null);
      setDragOverDate(null);

      /*
       * Behåll flaggan ett ögonblick så att
       * ett eventuellt efterföljande click/
       * onPress efter dragningen inte öppnar
       * redigeringspanelen.
       */
      hasDraggedRef.current =
        true;

      setTimeout(() => {
        hasDraggedRef.current =
          false;
      }, 0);
    }

    function handleDragStart(
      session: TrainingSession,
      event: any
    ) {
      if (
        !isDesktop ||
        Platform.OS !== "web"
      ) {
        return;
      }

      const dragEvent =
        event as DragEvent;

      dragEvent.dataTransfer?.setData(
        "text/plain",
        session.id
      );

      if (
        dragEvent.dataTransfer
      ) {
        dragEvent.dataTransfer.effectAllowed =
          "move";
      }

      draggingSessionIdRef.current =
        session.id;

      dragOverDateRef.current =
        session.date;

      hasDraggedRef.current =
        true;

      setDraggingSessionId(
        session.id
      );

      setDragOverDate(
        session.date
      );
    }

    function handleDragOver(
      event: any
    ) {
      if (
        !draggingSessionIdRef.current
      ) {
        return;
      }

      const dragEvent =
        event as DragEvent;

      dragEvent.preventDefault();

      if (
        dragEvent.dataTransfer
      ) {
        dragEvent.dataTransfer.dropEffect =
          "move";
      }

      const element =
        dragEvent.currentTarget as HTMLElement;

      const date =
        element.getAttribute(
          "data-training-date"
        );

      if (date) {
        dragOverDateRef.current =
          date;

        setDragOverDate(date);
      }
    }

    async function handleDrop(
      event: any
    ) {
      if (
        !draggingSessionIdRef.current
      ) {
        return;
      }

      const dragEvent =
        event as DragEvent;

      dragEvent.preventDefault();

      const targetElement =
        dragEvent.currentTarget as HTMLElement;

      const targetDate =
        targetElement.getAttribute(
          "data-training-date"
        );

      const sessionId =
        draggingSessionIdRef.current;

      if (
        !targetDate ||
        !sessionId
      ) {
        cleanupDragState();
        return;
      }

      try {
        const currentWeeks =
          await getStoredTrainingWeeks();

        let sessionToMove:
          | TrainingSession
          | null = null;

        for (
          const currentWeek of currentWeeks
        ) {
          const found =
            currentWeek.sessions.find(
              (session) =>
                session.id ===
                sessionId
            );

          if (found) {
            sessionToMove =
              found;
            break;
          }
        }

        if (!sessionToMove) {
          return;
        }

        if (
          sessionToMove.date ===
          targetDate
        ) {
          return;
        }

        const updatedSession: TrainingSession =
          {
            ...sessionToMove,
            date: targetDate,
            day: getDayName(
              targetDate
            ),
          };

        await updateTrainingSession(
          updatedSession
        );

        const updatedWeeks =
          await getStoredTrainingWeeks();

        setWeeks(updatedWeeks);
      } catch (error) {
        console.error(
          "Kunde inte flytta träningspasset:",
          error
        );
      } finally {
        cleanupDragState();
      }
    }

    function handleDragEnd() {
      cleanupDragState();
    }

    /*
     * Börjar inte dra direkt.
     * Vi väntar tills musen faktiskt
     * har flyttats några pixlar.
     *
     * Detta gör att vanligt klick
     * fortfarande fungerar.
     */
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
\n            <Pressable
              onPress={() =>
                router.push(
                  `/athlete/${athlete.id}`
                )
              }
              style={styles.athletePreviewButton}
            >
              <BodyText
                style={styles.athletePreviewButtonText}
              >
                👤 Visa som adept
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
                canGoBack &&
                changeWeek(-1)
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
                TRÄNINGSPLAN
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
                changeWeek(1)
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
                  isDesktop={isDesktop}
                  isSelected={
                    selectedDate ===
                    day.date
                  }
                  isDragOver={
                    dragOverDate ===
                    day.date
                  }
                  draggingSessionId={
                    draggingSessionId
                  }
                  onAddSession={() =>
                    handleAddSession(
                      day.date
                    )
                  }
                  onEditSession={
                    handleEditSession
                  }
                  onDragStart={
                    handleDragStart
                  }
                  onDragOver={
                    handleDragOver
                  }
                  onDrop={
                    handleDrop
                  }
                  onDragEnd={
                    handleDragEnd
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
                {hasPanel ? (
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
                          {copyingSession
                            ? "KOPIERA"
                            : editingSession
                              ? "REDIGERA"
                              : "NYTT PASS"}
                        </SectionLabel>
  
                        <BodyText
                          style={
                            styles.panelTitle
                          }
                        >
                          {copyingSession
                            ? copyingSession.title
                            : editingSession
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
                        selectedDate ??
                        editingSession?.date ??
                        copyingSession?.date ??
                        week.startDate
                      }
                      initialSession={
                        editingSession ??
                        copyingSession ??
                        undefined
                      }
                      isCopying={Boolean(
                        copyingSession
                      )}
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
                      <View
                        style={
                          styles.panelActions
                        }
                      >
                        <Pressable
                          onPress={() =>
                            handleCopySession(
                              editingSession
                            )
                          }
                          style={
                            styles.secondaryAction
                          }
                        >
                          <BodyText
                            style={
                              styles.secondaryActionText
                            }
                          >
                            Kopiera pass
                          </BodyText>
                        </Pressable>
                      </View>
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
                        Välj ett pass
                      </BodyText>
  
                      <BodyText
                        style={
                          styles.emptyPanelText
                        }
                      >
                        Klicka på ett pass för
                        att redigera eller
                        kopiera det. Du kan
                        också lägga till ett
                        nytt pass från en dag.
                      </BodyText>
                    </View>
                  </Card>
                )}
              </View>
            )}
          </View>
  
          <Pressable
            onPress={handleAddWeek}
            style={styles.addWeekButton}
          >
            <BodyText
              style={styles.addWeekText}
            >
              + Lägg till vecka
            </BodyText>
          </Pressable>
        </Screen>
      </>
    );
  }
  
  function DayRow({
    day,
    isDesktop,
    isSelected,
    isDragOver,
    draggingSessionId,
    onAddSession,
    onEditSession,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }: {
    day: {
      date: string;
      day: string;
      sessions: TrainingSession[];
    };
  
    isDesktop: boolean;
  
    isSelected: boolean;
  
    isDragOver: boolean;
  
    draggingSessionId: string | null;
  
    onAddSession: () => void;
  
    onEditSession: (
      session: TrainingSession
    ) => void;
  
    onPointerDown: (
      session: TrainingSession,
      event?: any
    ) => void;
  
    onPointerCancel: () => void;
  }) {
    if (!isDesktop) {
      return (
        <Card>
          <View
            style={styles.dayHeader}
          >
            <View>
              <BodyText
                style={styles.day}
              >
                {day.day}
              </BodyText>
  
              <BodyText
                style={styles.date}
              >
                {formatDate(
                  day.date
                )}
              </BodyText>
            </View>
  
            <Pressable
              onPress={onAddSession}
              style={
                styles.addButton
              }
            >
              <BodyText
                style={
                  styles.addButtonText
                }
              >
                + Lägg till
              </BodyText>
            </Pressable>
          </View>
  
          {day.sessions.length ===
          0 ? (
            <BodyText
              style={
                styles.emptyDay
              }
            >
              Ingen träning planerad
            </BodyText>
          ) : (
            <View
              style={styles.sessions}
            >
              {day.sessions.map(
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
                      styles.mobileSession
                    }
                  >
                    <BodyText
                      style={
                        styles.slot
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
                        styles.title
                      }
                    >
                      {
                        TYPE_ICONS[
                          session.type
                        ]
                      }{" "}
                      {session.title}
                    </BodyText>
  
                    <BodyText
                      style={
                        styles.description
                      }
                    >
                      {
                        session.description
                      }
                    </BodyText>
                  </Pressable>
                )
              )}
            </View>
          )}
        </Card>
      );
    }
  
    const dayProps =
      Platform.OS === "web"
        ? ({
            "data-training-date":
              day.date,
          } as any)
        : {};
  
    if (Platform.OS === "web") {
      (dayProps as any).onDragOver =
        onDragOver;

      (dayProps as any).onDrop =
        onDrop;
    }

    return (
      <View
        {...dayProps}
        style={[
          styles.desktopDayRow,
          isSelected &&
            styles.desktopDayRowSelected,
          isDragOver &&
            styles.desktopDayRowDragOver,
        ]}
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
              {isDragOver
                ? "Släpp här"
                : "—"}
            </BodyText>
          ) : (
            day.sessions.map(
              (session) => (
                <DesktopSession
                  key={
                    session.id
                  }
                  session={
                    session
                  }
                  isDragging={
                    draggingSessionId ===
                    session.id
                  }
                  onPress={() =>
                    onEditSession(
                      session
                    )
                  }
                  onDragStart={
                    onDragStart
                  }
                  onDragEnd={
                    onDragEnd
                  }
                />
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
  
  function DesktopSession({
    session,
    isDragging,
    onPress,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }: {
    session: TrainingSession;
  
    isDragging: boolean;
  
    onPress: () => void;
  
    onPointerDown: (
      session: TrainingSession,
      event?: any
    ) => void;
  
    onPointerCancel: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        {...(
          Platform.OS === "web"
            ? ({
                draggable: true,
                onDragStart: (
                  event: any
                ) =>
                  onDragStart(
                    session,
                    event
                  ),
                onDragEnd:
                  onDragEnd,
              } as any)
            : {}
        )}
        style={[
          styles.desktopSession,
          isDragging &&
            styles.desktopSessionDragging,
        ]}
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
      </Pressable>
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
  
    const startText =
      start.toLocaleDateString(
        "sv-SE",
        {
          day: "numeric",
          month: "short",
        }
      );
  
    const endText =
      end.toLocaleDateString(
        "sv-SE",
        {
          day: "numeric",
          month: "short",
        }
      );
  
    return `${startText}–${endText}`;
  }
  
  function getDayName(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleDateString(
      "sv-SE",
      {
        weekday: "short",
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
  
  const styles = StyleSheet.create({
    header: {
      marginBottom: 16,
    },
  
    status: {
      marginTop: 5,
      fontSize: 14,
      opacity: 0.7,
    },
  
    athletePreviewButton: {
      alignSelf: "flex-start",
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    athletePreviewButtonText: {
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.9,
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
  
    navigationButtonDisabled: {
      opacity: 0.25,
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
  
    panelHeader: {
      flexDirection: "row",
      alignItems:
        "flex-start",
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
  
    desktopDayRow: {
      minHeight: 58,
      flexDirection: "row",
      alignItems:
        "center",
      borderBottomWidth: 1,
      borderBottomColor:
        "rgba(255,255,255,0.08)",
      paddingVertical: 7,
      paddingHorizontal: 10,
    },
  
    desktopDayRowSelected: {
      backgroundColor:
        "rgba(255,255,255,0.035)",
      borderRadius: 8,
    },
  
    desktopDayRowDragOver: {
      backgroundColor:
        "rgba(255,255,255,0.10)",
      borderRadius: 8,
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
      alignItems:
        "center",
      gap: 8,
      minWidth: 0,
    },
  
    desktopSession: {
      minWidth: 150,
      maxWidth: 240,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 7,
      backgroundColor:
        "rgba(255,255,255,0.055)",
      cursor: "grab",
      userSelect: "none",
    } as any,
  
    desktopSessionDragging: {
      opacity: 0.35,
      cursor: "grabbing",
    } as any,
  
    desktopSlot: {
      fontSize: 10,
      fontWeight: "600",
      opacity: 0.5,
      userSelect: "none",
    } as any,
  
    desktopTitle: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "700",
      userSelect: "none",
    } as any,
  
    desktopEmpty: {
      fontSize: 12,
      opacity: 0.3,
    },
  
    desktopAddButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 8,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },
  
    desktopAddText: {
      fontSize: 18,
      opacity: 0.5,
    },
  
    dayHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
    },
  
    day: {
      fontSize: 18,
      fontWeight: "700",
    },
  
    date: {
      marginTop: 2,
      fontSize: 14,
      opacity: 0.5,
    },
  
    addButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },
  
    addButtonText: {
      fontSize: 13,
      fontWeight: "700",
    },
  
    sessions: {
      marginTop: 12,
    },
  
    mobileSession: {
      paddingTop: 11,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.08)",
    },
  
    slot: {
      fontSize: 12,
      fontWeight: "600",
      opacity: 0.5,
    },
  
    title: {
      marginTop: 3,
      fontSize: 17,
      fontWeight: "700",
    },
  
    description: {
      marginTop: 5,
      lineHeight: 20,
      opacity: 0.65,
    },
  
    emptyDay: {
      marginTop: 11,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.08)",
      fontSize: 13,
      opacity: 0.4,
    },
  
    panelActions: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.08)",
    },
  
    secondaryAction: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor:
        "rgba(255,255,255,0.07)",
    },
  
    secondaryActionText: {
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
    },
  
    addWeekButton: {
      alignSelf: "center",
      marginTop: 14,
      marginBottom: 10,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },
  
    addWeekText: {
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.7,
    },
  });