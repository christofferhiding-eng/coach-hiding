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
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import TrainingSessionForm from "@/components/training/TrainingSessionForm";

import {
  Colors,
  Radius,
  Spacing,
} from "@/constants/design";

import { getAthlete } from "@/features/athletes";
import { supabase } from "@/lib/supabase";

import type {
  TrainingSession,
  TrainingWeek,
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
  {
    day: "Mån",
    offset: 0,
  },
  {
    day: "Tis",
    offset: 1,
  },
  {
    day: "Ons",
    offset: 2,
  },
  {
    day: "Tor",
    offset: 3,
  },
  {
    day: "Fre",
    offset: 4,
  },
  {
    day: "Lör",
    offset: 5,
  },
  {
    day: "Sön",
    offset: 6,
  },
];

type FormData = {
  date: string;
  slot: TrainingSlot;
  type: TrainingType;
  title: string;
  description: string;
};


export default function CoachAthleteTrainingScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const { width } =
    useWindowDimensions();

  const isDesktop =
    width >= 900;

  const athlete =
    getAthlete(id);

  const [weeks, setWeeks] =
    useState<TrainingWeek[]>([]);

  const [weekIndex, setWeekIndex] =
    useState(0);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState<string | null>(
    null
  );

  const [
    editingSession,
    setEditingSession,
  ] = useState<
    TrainingSession | null
  >(null);

  const [
    copyingSession,
    setCopyingSession,
  ] = useState<
    TrainingSession | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  async function loadPlan(
    preserveWeek = false
  ) {
    try {
      setLoading(true);
      setError(null);

      const {
        data,
        error: loadError,
      } = await supabase
        .from("training_sessions")
        .select(
          `
            id,
            athlete_id,
            date,
            day,
            slot,
            title,
            description,
            type,
            athlete_comment
          `
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

      if (loadError) {
        throw loadError;
      }

      const sessions: TrainingSession[] =
        (data ?? []).map(
          (row) => ({
            id: row.id,
            athleteId:
              row.athlete_id,
            date: row.date,
            day: row.day,
            slot:
              row.slot as TrainingSlot,
            title: row.title,
            description:
              row.description ?? "",
            type:
              row.type as TrainingType,
            athleteComment:
              row.athlete_comment ?? null,
          })
        );

      const groupedWeeks =
        groupSessionsIntoWeeks(
          sessions
        );

      setWeeks(groupedWeeks);

      if (
        groupedWeeks.length === 0
      ) {
        setWeekIndex(0);
        return;
      }

      if (!preserveWeek) {
        const today =
          formatISODate(
            new Date()
          );

        const currentWeekIndex =
          groupedWeeks.findIndex(
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

        if (
          currentWeekIndex !== -1
        ) {
          setWeekIndex(
            currentWeekIndex
          );
        } else {
          setWeekIndex(0);
        }
      } else {
        setWeekIndex(
          (current) =>
            Math.min(
              current,
              Math.max(
                groupedWeeks.length - 1,
                0
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

      setWeeks([]);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (id) {
      loadPlan();
    }
  }, [id]);


  function closePanel() {
    setSelectedDate(null);
    setEditingSession(null);
    setCopyingSession(null);
  }


  function handleAddSession(
    date: string
  ) {
    setEditingSession(null);
    setCopyingSession(null);
    setSelectedDate(date);
    setError(null);
  }


  function handleEditSession(
    session: TrainingSession
  ) {
    setCopyingSession(null);
    setEditingSession(session);
    setSelectedDate(session.date);
    setError(null);
  }


  function handleCopySession(
    session: TrainingSession
  ) {
    setEditingSession(null);
    setCopyingSession(session);
    setSelectedDate(session.date);
    setError(null);
  }


  async function handleSaveSession(
    data: FormData
  ) {
    try {
      setSaving(true);
      setError(null);

      if (copyingSession) {
        const newId =
          `${id}-${Date.now()}`;

        const {
          error: copyError,
        } = await supabase
          .from("training_sessions")
          .insert({
            id: newId,
            athlete_id: id,
            date: data.date,
            day: getDayName(
              data.date
            ),
            slot: data.slot,
            type: data.type,
            title: data.title,
            description:
              data.description,
            athlete_comment: null,
          });

        if (copyError) {
          throw copyError;
        }
      } else if (editingSession) {
        const {
          error: updateError,
        } = await supabase
          .from("training_sessions")
          .update({
            date: data.date,
            day: getDayName(
              data.date
            ),
            slot: data.slot,
            type: data.type,
            title: data.title,
            description:
              data.description,
          })
          .eq(
            "id",
            editingSession.id
          );

        if (updateError) {
          throw updateError;
        }
      } else {
        const newId =
          `${id}-${Date.now()}`;

        const {
          error: insertError,
        } = await supabase
          .from("training_sessions")
          .insert({
            id: newId,
            athlete_id: id,
            date: data.date,
            day: getDayName(
              data.date
            ),
            slot: data.slot,
            type: data.type,
            title: data.title,
            description:
              data.description,
            athlete_comment: null,
          });

        if (insertError) {
          throw insertError;
        }
      }

      closePanel();

      await loadPlan(true);
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
        error: deleteError,
      } = await supabase
        .from("training_sessions")
        .delete()
        .eq(
          "id",
          editingSession.id
        );

      if (deleteError) {
        throw deleteError;
      }

      closePanel();

      await loadPlan(true);
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


  if (!athlete) {
    return (
      <Screen>
        <BodyText>
          Adepten kunde inte hittas.
        </BodyText>
      </Screen>
    );
  }


  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title:
              athlete.name,
          }}
        />

        <Screen>
          <View
            style={
              styles.loading
            }
          >
            <BodyText>
              Laddar träningsplan...
            </BodyText>
          </View>
        </Screen>
      </>
    );
  }


  if (weeks.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title:
              athlete.name,
          }}
        />

        <Screen>
          <View
            style={
              styles.emptyState
            }
          >
            <SectionLabel>
              TRÄNINGSPLAN
            </SectionLabel>

            <Metric>
              {athlete.name}
            </Metric>

            <BodyText
              style={
                styles.emptyStateText
              }
            >
              Ingen träningsplan
              hittades för den här
              adepten.
            </BodyText>
          </View>
        </Screen>
      </>
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

  const canGoBack =
    weekIndex > 0;

  const canGoForward =
    weekIndex <
    weeks.length - 1;

  const hasPanel =
    selectedDate !== null ||
    editingSession !== null ||
    copyingSession !== null;


  return (
    <>
      <Stack.Screen
        options={{
          title:
            athlete.name,
        }}
      />

      <Screen>
        <View
          style={styles.header}
        >
          <SectionLabel>
            ADEPT
          </SectionLabel>

          <Metric>
            {athlete.name}
          </Metric>

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
        </View>


        <View
          style={[
            styles.weekNavigation,
            isDesktop &&
              styles.weekNavigationDesktop,
          ]}
        >
          <Pressable
            onPress={() => {
              if (
                !canGoBack
              ) {
                return;
              }

              closePanel();

              setWeekIndex(
                (current) =>
                  current - 1
              );
            }}
            disabled={
              !canGoBack
            }
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
              TRÄNINGSPLAN
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
            onPress={() => {
              if (
                !canGoForward
              ) {
                return;
              }

              closePanel();

              setWeekIndex(
                (current) =>
                  current + 1
              );
            }}
            disabled={
              !canGoForward
            }
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


        {error && (
          <BodyText
            style={
              styles.error
            }
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
            {days.map(
              (day) => (
                <DayRow
                  key={
                    day.date
                  }
                  day={day}
                  isDesktop={
                    isDesktop
                  }
                  onAddSession={() =>
                    handleAddSession(
                      day.date
                    )
                  }
                  onEditSession={
                    handleEditSession
                  }
                />
              )
            )}
          </View>


          {isDesktop && (
            <View
              style={
                styles.panelColumn
              }
            >
              {hasPanel ? (
                <View
                  style={
                    styles.panel
                  }
                >
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
                          ? "KOPIERA PASS"
                          : editingSession
                            ? "REDIGERA PASS"
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


                  {/*
                    Kommentaren ligger här,
                    INNAN formuläret.
                    Bara en enda version.
                  */}
                  {editingSession && (
                    <View
                      style={
                        styles.commentBox
                      }
                    >
                      <SectionLabel>
                        ADEPTENS KOMMENTAR
                      </SectionLabel>

                      <BodyText
                        style={
                          styles.commentText
                        }
                      >
                        {editingSession.athleteComment
                          ? editingSession.athleteComment
                          : "Ingen kommentar från adepten ännu."}
                      </BodyText>
                    </View>
                  )}


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
                    isCopying={
                      Boolean(
                        copyingSession
                      )
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


                  {saving && (
                    <BodyText
                      style={
                        styles.saving
                      }
                    >
                      Sparar...
                    </BodyText>
                  )}
                </View>
              ) : (
                <View
                  style={
                    styles.panel
                  }
                >
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
                      Klicka på ett pass
                      för att redigera
                      eller kopiera det.
                      Du kan också lägga
                      till ett nytt pass.
                    </BodyText>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>


        {!isDesktop && hasPanel && (
          <View
            style={
              styles.mobilePanel
            }
          >
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
                    ? "KOPIERA PASS"
                    : editingSession
                      ? "REDIGERA PASS"
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


            {editingSession && (
              <View
                style={
                  styles.commentBox
                }
              >
                <SectionLabel>
                  ADEPTENS KOMMENTAR
                </SectionLabel>

                <BodyText
                  style={
                    styles.commentText
                  }
                >
                  {editingSession.athleteComment
                    ? editingSession.athleteComment
                    : "Ingen kommentar från adepten ännu."}
                </BodyText>
              </View>
            )}


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
              isCopying={
                Boolean(
                  copyingSession
                )
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


            {saving && (
              <BodyText
                style={
                  styles.saving
                }
              >
                Sparar...
              </BodyText>
            )}
          </View>
        )}
      </Screen>
    </>
  );
}


function DayRow({
  day,
  isDesktop,
  onAddSession,
  onEditSession,
}: {
  day: {
    date: string;
    day: string;
    sessions: TrainingSession[];
  };

  isDesktop: boolean;

  onAddSession: () => void;

  onEditSession: (
    session: TrainingSession
  ) => void;
}) {
  if (isDesktop) {
    return (
      <View
        style={
          styles.desktopDayRow
        }
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
              Ingen planerad träning
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
                    numberOfLines={
                      1
                    }
                  >
                    {
                      TYPE_ICONS[
                        session.type
                      ]
                    }{" "}
                    {session.title}
                  </BodyText>
                </Pressable>
              )
            )
          )}
        </View>


        <Pressable
          onPress={
            onAddSession
          }
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


  return (
    <View
      style={
        styles.mobileDay
      }
    >
      <View
        style={
          styles.mobileDayHeader
        }
      >
        <View>
          <BodyText
            style={
              styles.mobileDayName
            }
          >
            {day.day}
          </BodyText>

          <BodyText
            style={
              styles.mobileDate
            }
          >
            {formatDate(
              day.date
            )}
          </BodyText>
        </View>

        <Pressable
          onPress={
            onAddSession
          }
          style={
            styles.mobileAddButton
          }
        >
          <BodyText
            style={
              styles.mobileAddText
            }
          >
            +
          </BodyText>
        </Pressable>
      </View>


      {day.sessions.length ===
      0 ? (
        <BodyText
          style={
            styles.mobileEmpty
          }
        >
          Ingen träning planerad
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
                styles.mobileSession
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
                  styles.sessionDescription
                }
              >
                {
                  session.description
                }
              </BodyText>
            </Pressable>
          )
        )
      )}
    </View>
  );
}


function groupSessionsIntoWeeks(
  sessions: TrainingSession[]
): TrainingWeek[] {
  const weeks = new Map<
    string,
    TrainingSession[]
  >();

  for (
    const session of sessions
  ) {
    const monday =
      getMondayDate(
        session.date
      );

    const existing =
      weeks.get(monday) ?? [];

    existing.push(session);

    weeks.set(
      monday,
      existing
    );
  }

  return Array.from(
    weeks.entries()
  )
    .sort(
      ([a], [b]) =>
        a.localeCompare(b)
    )
    .map(
      ([
        startDate,
        weekSessions,
      ]) => {
        const weekNumber =
          getISOWeekNumber(
            startDate
          );

        return {
          id:
            `week-${startDate}`,
          weekNumber,
          title:
            `Vecka ${weekNumber}`,
          startDate,
          sessions:
            weekSessions.sort(
              (a, b) =>
                a.date.localeCompare(
                  b.date
                ) ||
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
    ({
      day,
      offset,
    }) => {
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


function getSlotOrder(
  slot: TrainingSlot
) {
  if (
    slot === "morning"
  ) {
    return 0;
  }

  if (
    slot === "afternoon"
  ) {
    return 1;
  }

  return 2;
}


function parseDate(
  dateString: string
) {
  return new Date(
    `${dateString}T00:00:00.000Z`
  );
}


function formatISODate(
  date: Date
) {
  return date
    .toISOString()
    .slice(0, 10);
}


function addDays(
  dateString: string,
  days: number
) {
  const date =
    parseDate(
      dateString
    );

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return formatISODate(
    date
  );
}


function getMondayDate(
  dateString: string
) {
  const date =
    parseDate(
      dateString
    );

  const day =
    date.getUTCDay();

  const daysSinceMonday =
    day === 0
      ? 6
      : day - 1;

  date.setUTCDate(
    date.getUTCDate() -
      daysSinceMonday
  );

  return formatISODate(
    date
  );
}


function getISOWeekNumber(
  mondayDate: string
) {
  const date =
    parseDate(
      mondayDate
    );

  const thursday =
    new Date(date);

  thursday.setUTCDate(
    thursday.getUTCDate() +
      3
  );

  const yearStart =
    new Date(
      Date.UTC(
        thursday.getUTCFullYear(),
        0,
        1
      )
    );

  return Math.ceil(
    (
      (
        thursday.getTime() -
        yearStart.getTime()
      ) /
        86400000 +
      1
    ) / 7
  );
}


function formatDate(
  dateString: string
) {
  return parseDate(
    dateString
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
  const endDate =
    addDays(
      startDate,
      6
    );

  const start =
    parseDate(
      startDate
    );

  const end =
    parseDate(
      endDate
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
  dateString: string
) {
  return parseDate(
    dateString
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


const styles =
  StyleSheet.create({
    header: {
      marginBottom:
        Spacing.lg,
    },

    status: {
      marginTop:
        Spacing.xs,
      fontSize: 14,
      opacity: 0.7,
    },

    weekNavigation: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom:
        Spacing.lg,
    },

    weekNavigationDesktop: {
      maxWidth: 1200,
      alignSelf:
        "center",
      width: "100%",
    },

    weekTitle: {
      alignItems:
        "center",
    },

    weekNumber: {
      marginTop: 3,
      fontSize: 17,
      fontWeight: "700",
    },

    weekDate: {
      marginTop: 2,
      fontSize: 11,
      opacity: 0.5,
    },

    navigationButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        "center",
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
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      gap: 18,
      maxWidth: 1200,
      alignSelf:
        "center",
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

    panel: {
      padding:
        Spacing.md,
      borderRadius:
        Radius.card,
      backgroundColor:
        Colors.surface,
    },

    mobilePanel: {
      marginTop:
        Spacing.lg,
      padding:
        Spacing.md,
      borderRadius:
        Radius.card,
      backgroundColor:
        Colors.surface,
    },

    panelHeader: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-between",
      marginBottom:
        Spacing.sm,
    },

    panelHeaderText: {
      flex: 1,
      paddingRight: 10,
    },

    panelTitle: {
      marginTop: 3,
      fontSize: 18,
      fontWeight: "700",
    },

    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    closeButtonText: {
      fontSize: 21,
      lineHeight: 23,
      opacity: 0.7,
    },

    commentBox: {
      marginTop: 12,
      marginBottom: 16,
      padding: 12,
      borderRadius:
        Radius.sm,
      backgroundColor:
        "rgba(142,227,176,0.08)",
      borderWidth: 1,
      borderColor:
        "rgba(142,227,176,0.18)",
    },

    commentText: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      opacity: 0.85,
    },

    panelActions: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.08)",
    },

    secondaryAction: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius:
        Radius.sm,
      backgroundColor:
        "rgba(255,255,255,0.07)",
    },

    secondaryActionText: {
      fontSize: 13,
      fontWeight: "700",
      textAlign:
        "center",
    },

    saving: {
      marginTop: 10,
      fontSize: 12,
      opacity: 0.5,
    },

    error: {
      marginBottom:
        Spacing.md,
      color: "#ff7b7b",
      fontSize: 13,
    },

    loading: {
      paddingVertical: 40,
      alignItems:
        "center",
    },

    emptyState: {
      paddingVertical: 50,
      alignItems:
        "center",
    },

    emptyStateText: {
      marginTop:
        Spacing.sm,
      opacity: 0.6,
      textAlign:
        "center",
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
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.55,
    },

    desktopDayRow: {
      minHeight: 72,
      flexDirection:
        "row",
      alignItems:
        "center",
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
      marginTop: 2,
      fontSize: 11,
      opacity: 0.5,
    },

    desktopSessions: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      minWidth: 0,
    },

    desktopSession: {
      minWidth: 150,
      maxWidth: 260,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius:
        Radius.sm,
      backgroundColor:
        "rgba(255,255,255,0.055)",
    },

    desktopSlot: {
      fontSize: 10,
      fontWeight: "600",
      opacity: 0.55,
    },

    desktopTitle: {
      marginTop: 3,
      fontSize: 13,
      fontWeight: "700",
    },

    desktopEmpty: {
      fontSize: 12,
      opacity: 0.35,
    },

    desktopAddButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 8,
      backgroundColor:
        "rgba(255,255,255,0.07)",
    },

    desktopAddText: {
      fontSize: 20,
      opacity: 0.6,
    },

    mobileDay: {
      marginBottom:
        Spacing.md,
      padding:
        Spacing.md,
      borderRadius:
        Radius.card,
      backgroundColor:
        Colors.surface,
    },

    mobileDayHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      marginBottom: 12,
    },

    mobileDayName: {
      fontSize: 16,
      fontWeight: "700",
    },

    mobileDate: {
      marginTop: 2,
      fontSize: 12,
      opacity: 0.5,
    },

    mobileAddButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    mobileAddText: {
      fontSize: 22,
      opacity: 0.7,
    },

    mobileEmpty: {
      paddingVertical: 8,
      fontSize: 13,
      opacity: 0.4,
    },

    mobileSession: {
      marginTop: 8,
      padding: 12,
      borderRadius:
        Radius.sm,
      backgroundColor:
        "rgba(255,255,255,0.055)",
    },

    sessionDescription: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      opacity: 0.65,
    },
  });