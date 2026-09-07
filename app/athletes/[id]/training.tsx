import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import Screen from "@/components/ui/Screen";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import { getAthlete } from "@/features/athletes";

import {
  addTrainingSession,
  updateTrainingSession,
} from "@/features/training-plan";

import {
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

const TYPE_LABELS = {
  easy: "Lugnt",
  quality: "Kvalitet",
  long: "Långpass",
  rest: "Vila",
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

export default function TrainingScreen() {
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

  const [expandedSessionId, setExpandedSessionId] =
    useState<string | null>(null);

  const [editingSessionId, setEditingSessionId] =
    useState<string | null>(null);

  const [addingDate, setAddingDate] =
    useState<string | null>(null);

  const [editTitle, setEditTitle] =
    useState("");

  const [editDescription, setEditDescription] =
    useState("");

  const [editType, setEditType] =
    useState<SessionType>("easy");

  const [editSlot, setEditSlot] =
    useState<SessionSlot>("morning");

  const [isSaving, setIsSaving] =
    useState(false);

  useEffect(() => {
    loadTrainingPlan();
  }, [id]);

  async function loadTrainingPlan() {
    if (!id) {
      return;
    }

    try {
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

      const sessions: TrainingSession[] =
        (data ?? []).map((session) => ({
          id: session.id,
          athleteId: session.athlete_id,
          date: session.date,
          day: session.day,
          slot:
            session.slot as TrainingSession["slot"],
          title: session.title,
          description:
            session.description ?? "",
          type:
            session.type as TrainingSession["type"],
        }));

      const groupedWeeks =
        groupSessionsIntoWeeks(
          sessions
        );

      setWeeks(groupedWeeks);
      setWeekIndex(0);
    } catch (error) {
      console.error(
        "Kunde inte läsa träningsplanen från Supabase:",
        error
      );

      setWeeks([]);
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
        <View style={styles.emptyState}>
          <SectionLabel>
            TRÄNINGSPLAN
          </SectionLabel>

          <Metric>
            {athlete.name}
          </Metric>

          <BodyText
            style={styles.emptyText}
          >
            Ingen träningsplan hittades
            för den här adepten.
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

  const canGoBack =
    weekIndex > 0;

  const canGoForward =
    weekIndex <
    weeks.length - 1;

  function toggleSession(
    sessionId: string
  ) {
    if (
      expandedSessionId ===
      sessionId
    ) {
      setExpandedSessionId(null);
      setEditingSessionId(null);
      return;
    }

    setExpandedSessionId(
      sessionId
    );

    setEditingSessionId(null);
    setAddingDate(null);
  }

  function startEditing(
    session: TrainingSession
  ) {
    setExpandedSessionId(
      session.id
    );

    setEditingSessionId(
      session.id
    );

    setAddingDate(null);

    setEditTitle(
      session.title
    );

    setEditDescription(
      session.description
    );

    setEditType(
      session.type
    );

    setEditSlot(
      session.slot
    );
  }

  function startAdding(
    date: string
  ) {
    setAddingDate(date);
    setExpandedSessionId(null);
    setEditingSessionId(null);

    setEditTitle("");
    setEditDescription("");
    setEditType("easy");
    setEditSlot("morning");
  }

  function cancelAdding() {
    setAddingDate(null);
    setEditTitle("");
    setEditDescription("");
    setEditType("easy");
    setEditSlot("morning");
  }

  function cancelEditing() {
    setEditingSessionId(null);
  }

  async function saveEditing(
    session: TrainingSession
  ) {
    if (
      isSaving ||
      !editTitle.trim()
    ) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedSession:
        TrainingSession = {
        ...session,
        title:
          editTitle.trim(),
        description:
          editDescription.trim(),
        type: editType,
        slot: editSlot,
      };

      await updateTrainingSession(
        updatedSession
      );

      await loadTrainingPlan();

      setEditingSessionId(null);

      setExpandedSessionId(
        updatedSession.id
      );
    } catch (error) {
      console.error(
        "Kunde inte spara träningspass:",
        error
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNewSession(
    date: string
  ) {
    if (
      isSaving ||
      !editTitle.trim()
    ) {
      return;
    }

    setIsSaving(true);

    try {
      const newSession:
        TrainingSession = {
        id: `${athlete.id}-${date}-${editSlot}-${Date.now()}`,
        athleteId: athlete.id,
        date,
        day: getDayName(date),
        slot: editSlot,
        title:
          editTitle.trim(),
        description:
          editDescription.trim(),
        type: editType,
      };

      await addTrainingSession(
        newSession
      );

      await loadTrainingPlan();

      setAddingDate(null);
      setEditTitle("");
      setEditDescription("");
      setEditType("easy");
      setEditSlot("morning");
    } catch (error) {
      console.error(
        "Kunde inte lägga till träningspass:",
        error
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${athlete.name} – Träningsschema`,
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
          <SectionLabel>
            TRÄNINGSSCHEMA
          </SectionLabel>

          <Metric>
            {athlete.name}
          </Metric>

          <BodyText
            style={styles.subtitle}
          >
            Planera och följ träningen
            vecka för vecka.
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
              expandedSessionId={
                expandedSessionId
              }
              editingSessionId={
                editingSessionId
              }
              addingDate={
                addingDate
              }
              editTitle={editTitle}
              editDescription={
                editDescription
              }
              editType={editType}
              editSlot={editSlot}
              isSaving={isSaving}
              onToggleSession={
                toggleSession
              }
              onStartEditing={
                startEditing
              }
              onStartAdding={
                startAdding
              }
              onCancelEditing={
                cancelEditing
              }
              onCancelAdding={
                cancelAdding
              }
              onSaveEditing={
                saveEditing
              }
              onSaveNewSession={
                saveNewSession
              }
              onChangeTitle={
                setEditTitle
              }
              onChangeDescription={
                setEditDescription
              }
              onChangeType={
                setEditType
              }
              onChangeSlot={
                setEditSlot
              }
            />
          ))}
        </View>
      </Screen>
    </>
  );
}

function DayCard({
  day,
  expandedSessionId,
  editingSessionId,
  addingDate,
  editTitle,
  editDescription,
  editType,
  editSlot,
  isSaving,
  onToggleSession,
  onStartEditing,
  onStartAdding,
  onCancelEditing,
  onCancelAdding,
  onSaveEditing,
  onSaveNewSession,
  onChangeTitle,
  onChangeDescription,
  onChangeType,
  onChangeSlot,
}: {
  day: {
    date: string;
    day: string;
    sessions: TrainingSession[];
  };

  expandedSessionId: string | null;
  editingSessionId: string | null;
  addingDate: string | null;

  editTitle: string;
  editDescription: string;

  editType: SessionType;
  editSlot: SessionSlot;

  isSaving: boolean;

  onToggleSession: (
    sessionId: string
  ) => void;

  onStartEditing: (
    session: TrainingSession
  ) => void;

  onStartAdding: (
    date: string
  ) => void;

  onCancelEditing: () => void;

  onCancelAdding: () => void;

  onSaveEditing: (
    session: TrainingSession
  ) => void;

  onSaveNewSession: (
    date: string
  ) => void;

  onChangeTitle: (
    value: string
  ) => void;

  onChangeDescription: (
    value: string
  ) => void;

  onChangeType: (
    value: SessionType
  ) => void;

  onChangeSlot: (
    value: SessionSlot
  ) => void;
}) {
  const hasSessions =
    day.sessions.length > 0;

  const isAdding =
    addingDate === day.date;

  return (
    <View style={styles.day}>
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
            {day.sessions.length} pass
          </BodyText>
        )}
      </View>

      {day.sessions.map(
        (session) => {
          const expanded =
            expandedSessionId ===
            session.id;

          const editing =
            editingSessionId ===
            session.id;

          return (
            <View
              key={session.id}
              style={
                styles.sessionWrapper
              }
            >
              <Pressable
                onPress={() =>
                  onToggleSession(
                    session.id
                  )
                }
                style={[
                  styles.session,
                  expanded &&
                    styles.sessionExpanded,
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

                <View
                  style={
                    styles.sessionTitleRow
                  }
                >
                  <BodyText
                    style={
                      styles.sessionTitle
                    }
                  >
                    {session.title}
                  </BodyText>

                  <BodyText
                    style={
                      styles.expandIcon
                    }
                  >
                    {expanded
                      ? "↑"
                      : "→"}
                  </BodyText>
                </View>

                <BodyText
                  style={
                    styles.sessionDescription
                  }
                  numberOfLines={
                    expanded
                      ? undefined
                      : 2
                  }
                >
                  {
                    session.description
                  }
                </BodyText>

                {!expanded && (
                  <BodyText
                    style={
                      styles.readMore
                    }
                  >
                    Visa detaljer →
                  </BodyText>
                )}
              </Pressable>

              {expanded && (
                <View
                  style={
                    styles.expandedArea
                  }
                >
                  {!editing ? (
                    <>
                      <BodyText
                        style={
                          styles.fullDescription
                        }
                      >
                        {
                          session.description
                        }
                      </BodyText>

                      <Pressable
                        onPress={() =>
                          onStartEditing(
                            session
                          )
                        }
                        style={
                          styles.editButton
                        }
                      >
                        <BodyText
                          style={
                            styles.editButtonText
                          }
                        >
                          ✏️ Redigera pass
                        </BodyText>
                      </Pressable>
                    </>
                  ) : (
                    <SessionForm
                      mode="edit"
                      title={
                        editTitle
                      }
                      description={
                        editDescription
                      }
                      type={
                        editType
                      }
                      slot={
                        editSlot
                      }
                      isSaving={
                        isSaving
                      }
                      onChangeTitle={
                        onChangeTitle
                      }
                      onChangeDescription={
                        onChangeDescription
                      }
                      onChangeType={
                        onChangeType
                      }
                      onChangeSlot={
                        onChangeSlot
                      }
                      onCancel={
                        onCancelEditing
                      }
                      onSave={() =>
                        onSaveEditing(
                          session
                        )
                      }
                    />
                  )}
                </View>
              )}
            </View>
          );
        }
      )}

      {isAdding ? (
        <View
          style={
            styles.addFormWrapper
          }
        >
          <SessionForm
            mode="add"
            title={editTitle}
            description={
              editDescription
            }
            type={editType}
            slot={editSlot}
            isSaving={isSaving}
            onChangeTitle={
              onChangeTitle
            }
            onChangeDescription={
              onChangeDescription
            }
            onChangeType={
              onChangeType
            }
            onChangeSlot={
              onChangeSlot
            }
            onCancel={
              onCancelAdding
            }
            onSave={() =>
              onSaveNewSession(
                day.date
              )
            }
          />
        </View>
      ) : (
        <Pressable
          onPress={() =>
            onStartAdding(
              day.date
            )
          }
          style={
            styles.addButton
          }
        >
          <BodyText
            style={
              styles.addButtonText
            }
          >
            ＋ Lägg till pass
          </BodyText>
        </Pressable>
      )}
    </View>
  );
}

function SessionForm({
  mode,
  title,
  description,
  type,
  slot,
  isSaving,
  onChangeTitle,
  onChangeDescription,
  onChangeType,
  onChangeSlot,
  onCancel,
  onSave,
}: {
  mode: "add" | "edit";

  title: string;
  description: string;

  type: SessionType;
  slot: SessionSlot;

  isSaving: boolean;

  onChangeTitle: (
    value: string
  ) => void;

  onChangeDescription: (
    value: string
  ) => void;

  onChangeType: (
    value: SessionType
  ) => void;

  onChangeSlot: (
    value: SessionSlot
  ) => void;

  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View>
      <SectionLabel>
        {mode === "add"
          ? "NYTT TRÄNINGSPASS"
          : "REDIGERA PASS"}
      </SectionLabel>

      <BodyText
        style={
          styles.inputLabel
        }
      >
        Titel
      </BodyText>

      <TextInput
        value={title}
        onChangeText={
          onChangeTitle
        }
        placeholder="Exempel: 10 km lugnt"
        placeholderTextColor="#888"
        style={styles.input}
      />

      <BodyText
        style={
          styles.inputLabel
        }
      >
        Instruktion
      </BodyText>

      <TextInput
        value={description}
        onChangeText={
          onChangeDescription
        }
        placeholder="Beskriv passet..."
        placeholderTextColor="#888"
        multiline
        textAlignVertical="top"
        style={[
          styles.input,
          styles.descriptionInput,
        ]}
      />

      <BodyText
        style={
          styles.inputLabel
        }
      >
        Typ
      </BodyText>

      <View
        style={
          styles.optionRow
        }
      >
        {(
          Object.keys(
            TYPE_LABELS
          ) as SessionType[]
        ).map((item) => (
          <Pressable
            key={item}
            onPress={() =>
              onChangeType(
                item
              )
            }
            style={[
              styles.optionButton,
              type === item &&
                styles.optionButtonSelected,
            ]}
          >
            <BodyText
              style={
                styles.optionText
              }
            >
              {
                TYPE_ICONS[
                  item
                ]
              }{" "}
              {
                TYPE_LABELS[
                  item
                ]
              }
            </BodyText>
          </Pressable>
        ))}
      </View>

      <BodyText
        style={
          styles.inputLabel
        }
      >
        Tid på dagen
      </BodyText>

      <View
        style={
          styles.optionRow
        }
      >
        {(
          Object.keys(
            SLOT_LABELS
          ) as SessionSlot[]
        ).map((item) => (
          <Pressable
            key={item}
            onPress={() =>
              onChangeSlot(
                item
              )
            }
            style={[
              styles.optionButton,
              slot === item &&
                styles.optionButtonSelected,
            ]}
          >
            <BodyText
              style={
                styles.optionText
              }
            >
              {
                SLOT_ICONS[
                  item
                ]
              }{" "}
              {
                SLOT_LABELS[
                  item
                ]
              }
            </BodyText>
          </Pressable>
        ))}
      </View>

      <View
        style={
          styles.editActions
        }
      >
        <Pressable
          onPress={onCancel}
          style={
            styles.cancelButton
          }
        >
          <BodyText
            style={
              styles.cancelButtonText
            }
          >
            Avbryt
          </BodyText>
        </Pressable>

        <Pressable
          onPress={onSave}
          disabled={
            isSaving ||
            !title.trim()
          }
          style={[
            styles.saveButton,
            (isSaving ||
              !title.trim()) &&
              styles.saveButtonDisabled,
          ]}
        >
          <BodyText
            style={
              styles.saveButtonText
            }
          >
            {isSaving
              ? "Sparar..."
              : mode === "add"
              ? "Lägg till pass"
              : "Spara ändringar"}
          </BodyText>
        </Pressable>
      </View>
    </View>
  );
}

function groupSessionsIntoWeeks(
  sessions: TrainingSession[]
): TrainingWeek[] {
  const weekMap = new Map<
    string,
    TrainingWeek
  >();

  sessions.forEach((session) => {
    const date = new Date(
      `${session.date}T12:00:00`
    );

    const dayOfWeek =
      (date.getDay() + 6) % 7;

    const monday =
      new Date(date);

    monday.setDate(
      date.getDate() - dayOfWeek
    );

    const startDate =
      formatISODate(monday);

    if (!weekMap.has(startDate)) {
      const weekNumber =
        getISOWeekNumber(monday);

      weekMap.set(
        startDate,
        {
          id: `supabase-week-${startDate}`,
          weekNumber,
          title: `Vecka ${weekNumber}`,
          startDate,
          sessions: [],
        }
      );
    }

    weekMap
      .get(startDate)!
      .sessions.push(session);
  });

  return Array.from(
    weekMap.values()
  ).sort(
    (a, b) =>
      a.startDate.localeCompare(
        b.startDate
      )
  );
}

function getISOWeekNumber(
  date: Date
) {
  const target =
    new Date(date);

  target.setHours(
    0,
    0,
    0,
    0
  );

  target.setDate(
    target.getDate() +
      3 -
      ((target.getDay() + 6) %
        7)
  );

  const firstThursday =
    new Date(
      target.getFullYear(),
      0,
      4
    );

  return (
    1 +
    Math.round(
      (
        (target.getTime() -
          firstThursday.getTime()) /
          86400000 -
        3 +
        ((firstThursday.getDay() +
          6) %
          7)
      ) / 7
    )
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

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function getDayName(
  date: string
) {
  return new Date(
    `${date}T12:00:00`
  ).toLocaleDateString(
    "sv-SE",
    {
      weekday: "short",
    }
  );
}

function formatWeekRange(
  startDate: string
) {
  const start =
    new Date(
      `${startDate}T12:00:00`
    );

  const end =
    new Date(
      `${startDate}T12:00:00`
    );

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
  slot: SessionSlot
) {
  if (slot === "morning") {
    return 1;
  }

  if (slot === "afternoon") {
    return 2;
  }

  return 3;
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

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
  },

  weekNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginTop: 8,
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

  sessionWrapper: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor:
      "rgba(255,255,255,0.055)",
  },

  session: {
    padding: 13,
  },

  sessionExpanded: {
    backgroundColor:
      "rgba(255,255,255,0.08)",
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

  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  sessionTitle: {
    flex: 1,
    marginTop: 4,
    fontSize: 17,
    fontWeight: "700",
  },

  expandIcon: {
    marginLeft: 10,
    fontSize: 18,
    opacity: 0.55,
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

  expandedArea: {
    paddingHorizontal: 13,
    paddingBottom: 14,
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  fullDescription: {
    paddingTop: 4,
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.72,
  },

  editButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor:
      "rgba(255,255,255,0.12)",
  },

  editButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },

  addButton: {
    paddingVertical: 10,
    marginTop: 3,
    marginBottom: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor:
      "rgba(255,255,255,0.16)",
  },

  addButtonText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.55,
  },

  addFormWrapper: {
    padding: 13,
    marginTop: 3,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  inputLabel: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.55,
  },

  input: {
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.16)",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    color: "white",
    backgroundColor:
      "rgba(255,255,255,0.04)",
    fontSize: 14,
  },

  descriptionInput: {
    minHeight: 100,
  },

  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor:
      "rgba(255,255,255,0.05)",
  },

  optionButtonSelected: {
    backgroundColor:
      "rgba(255,255,255,0.16)",
  },

  optionText: {
    fontSize: 11,
    fontWeight: "600",
  },

  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor:
      "rgba(255,255,255,0.05)",
  },

  cancelButtonText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },

  saveButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor:
      "rgba(255,255,255,0.14)",
  },

  saveButtonDisabled: {
    opacity: 0.35,
  },

  saveButtonText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
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