import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";

import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import BodyText from "@/components/ui/BodyText";
import Metric from "@/components/ui/Metric";
import SectionLabel from "@/components/ui/SectionLabel";

import { supabase } from "@/lib/supabase";
import { importEricTrainingPlan } from "@/features/training-plan/importEric";

type CoachAthlete = {
  id: string;
  name: string;
  status: "green" | "yellow" | "red";
  statusText: string;
  score: number;
  nextKeySession: string;
};

type TrainingSession = {
  id: string;
  athlete_id: string;
  date: string;
  title: string;
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

type CommentWithContext = TrainingComment & {
  athleteName: string;
  sessionTitle: string;
  sessionDate: string;
};

export default function CoachHomeScreen() {
  const [athletes, setAthletes] = useState<CoachAthlete[]>([]);
  const [comments, setComments] = useState<CommentWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  const [replyingTo, setReplyingTo] =
    useState<CommentWithContext | null>(null);

  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [commentMessage, setCommentMessage] =
    useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] =
    useState<string | null>(null);

  useEffect(() => {
    loadAthletes();
    loadComments();
  }, []);

  async function loadAthletes() {
    try {
      const {
        data: profiles,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("name, athlete_id")
        .eq("role", "athlete")
        .order("name");

      if (profileError) {
        console.error("Kunde inte läsa adepter:", profileError);
        return;
      }

      const today = new Date()
        .toISOString()
        .split("T")[0];

      const {
        data: sessions,
        error: sessionError,
      } = await supabase
        .from("training_sessions")
        .select("id, athlete_id, date, title")
        .gte("date", today)
        .order("date", { ascending: true });

      if (sessionError) {
        console.error(
          "Kunde inte läsa träningspass:",
          sessionError
        );
      }

      const trainingSessions =
        (sessions ?? []) as TrainingSession[];

      const mappedAthletes: CoachAthlete[] = (profiles ?? [])
        .filter((profile) => profile.athlete_id)
        .map((profile) => {
          const athleteId =
            profile.athlete_id as string;

          const nextSession =
            trainingSessions.find(
              (session) =>
                session.athlete_id === athleteId
            );

          return {
            id: athleteId,
            name: profile.name,
            status: "green",
            statusText: "Redo för dagens pass",
            score: 0,
            nextKeySession: nextSession
              ? nextSession.title
              : "Ingen träning planerad ännu",
          };
        });

      setAthletes(mappedAthletes);
    } catch (error) {
      console.error(
        "Kunde inte läsa adepter:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    try {
      setLoadingComments(true);

      const [
        { data: commentData, error: commentError },
        { data: profiles, error: profileError },
        { data: sessions, error: sessionError },
      ] = await Promise.all([
        supabase.rpc("get_coach_training_comments"),

        supabase
          .from("profiles")
          .select("name, athlete_id")
          .eq("role", "athlete"),

        supabase
          .from("training_sessions")
          .select("id, athlete_id, date, title"),
      ]);

      if (commentError) {
        console.error(
          "Kunde inte läsa kommentarer:",
          commentError
        );

        setCommentMessage(
          `Kunde inte läsa kommentarer: ${commentError.message}`
        );

        return;
      }

      if (profileError) {
        console.error(
          "Kunde inte läsa adeptprofiler:",
          profileError
        );

        return;
      }

      if (sessionError) {
        console.error(
          "Kunde inte läsa träningspass:",
          sessionError
        );

        return;
      }

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.athlete_id,
          profile.name,
        ])
      );

      const sessionMap = new Map(
        (sessions ?? []).map((session) => [
          session.id,
          session,
        ])
      );

      const mappedComments: CommentWithContext[] = (
        (commentData ?? []) as TrainingComment[]
      )
        .map((comment) => {
          const session = sessionMap.get(
            comment.training_session_id
          );

          return {
            ...comment,

            athleteName:
              profileMap.get(comment.athlete_id) ??
              "Okänd adept",

            sessionTitle:
              session?.title ?? "Träningspass",

            sessionDate:
              session?.date ?? "",
          };
        })
        .filter((comment) =>
          Boolean(
            sessionMap.has(
              comment.training_session_id
            )
          )
        );

      setComments(mappedComments);
      setCommentMessage(null);
    } catch (error) {
      console.error(
        "Kunde inte läsa kommentarer:",
        error
      );

      setCommentMessage(
        "Kunde inte läsa kommentarer."
      );
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleSendReply() {
    if (!replyingTo || !replyText.trim()) {
      return;
    }

    try {
      setSendingReply(true);
      setCommentMessage(null);

      const { data, error } =
        await supabase.rpc(
          "create_training_comment",
          {
            p_training_session_id:
              replyingTo.training_session_id,

            p_athlete_id:
              replyingTo.athlete_id,

            p_message:
              replyText.trim(),
          }
        );

      if (error) {
        console.error(
          "Kunde inte skicka svar:",
          error
        );

        setCommentMessage(
          `Kunde inte skicka: ${error.message}`
        );

        return;
      }

      if (!data) {
        setCommentMessage(
          "Svaret kunde inte skickas."
        );

        return;
      }

      const newComment =
        data as TrainingComment;

      const newCommentWithContext: CommentWithContext =
        {
          ...newComment,

          athleteName:
            replyingTo.athleteName,

          sessionTitle:
            replyingTo.sessionTitle,

          sessionDate:
            replyingTo.sessionDate,
        };

      setComments((current) => [
        newCommentWithContext,
        ...current,
      ]);

      setReplyText("");
      setReplyingTo(null);

      setCommentMessage(
        "Svaret är skickat ✓"
      );
    } catch (error) {
      console.error(
        "Kunde inte skicka svar:",
        error
      );

      setCommentMessage(
        error instanceof Error
          ? error.message
          : "Något gick fel när svaret skulle skickas."
      );
    } finally {
      setSendingReply(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleImportEric() {
    setImportMessage(null);
    setImporting(true);

    try {
      const sessions =
        await importEricTrainingPlan();

      setImportMessage(
        `Klart! ${
          sessions?.length ?? 0
        } träningspass importerades för Eric.`
      );
    } catch (error) {
      console.error(
        "Importfel:",
        error
      );

      setImportMessage(
        "Importen misslyckades. Kontrollera konsolen."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <SectionLabel>
            COACH
          </SectionLabel>

          <Pressable
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <BodyText
              style={styles.logoutText}
            >
              Logga ut
            </BodyText>
          </Pressable>
        </View>

        <Metric>
          Träningsöversikt
        </Metric>

        <BodyText style={styles.subtitle}>
          Välj en adept för att planera och
          följa träningen.
        </BodyText>
      </View>

      <SectionLabel>
        ADEPTER
      </SectionLabel>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />

          <BodyText
            style={styles.loadingText}
          >
            Hämtar adepter...
          </BodyText>
        </View>
      ) : (
        athletes.map((athlete) => (
          <Pressable
            key={athlete.id}
            onPress={() =>
              router.push(
                `/coach/athlete/${athlete.id}`
              )
            }
          >
            <Card>
              <View style={styles.topRow}>
                <BodyText
                  style={styles.name}
                >
                  {athlete.name}
                </BodyText>

                <BodyText
                  style={styles.score}
                >
                  {athlete.score > 0
                    ? athlete.score.toFixed(1)
                    : "–"}
                </BodyText>
              </View>

              <BodyText
                style={styles.status}
              >
                {getStatusIcon(
                  athlete.status
                )}{" "}
                {athlete.statusText}
              </BodyText>

              <BodyText
                style={styles.training}
              >
                Nästa:{" "}
                {athlete.nextKeySession}
              </BodyText>

              <BodyText
                style={styles.link}
              >
                Planera träning →
              </BodyText>
            </Card>
          </Pressable>
        ))
      )}

      <View style={styles.commentsSection}>
        <View
          style={styles.sectionHeaderRow}
        >
          <SectionLabel>
            DIALOG MED ADEPTER
          </SectionLabel>

          <Pressable
            onPress={loadComments}
            disabled={loadingComments}
            style={styles.refreshButton}
          >
            <BodyText
              style={styles.refreshText}
            >
              {loadingComments
                ? "Laddar..."
                : "Uppdatera"}
            </BodyText>
          </Pressable>
        </View>

        {commentMessage && (
          <BodyText
            style={styles.commentMessage}
          >
            {commentMessage}
          </BodyText>
        )}

        {loadingComments ? (
          <View
            style={styles.commentsLoading}
          >
            <ActivityIndicator />

            <BodyText
              style={styles.loadingText}
            >
              Hämtar meddelanden...
            </BodyText>
          </View>
        ) : comments.length === 0 ? (
          <Card>
            <BodyText
              style={styles.emptyComments}
            >
              Inga meddelanden ännu.
            </BodyText>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <View
                style={styles.commentHeader}
              >
                <View
                  style={
                    styles.commentHeaderText
                  }
                >
                  <BodyText
                    style={
                      styles.athleteName
                    }
                  >
                    {comment.athleteName}
                  </BodyText>

                  <BodyText
                    style={
                      styles.sessionInfo
                    }
                  >
                    {comment.sessionTitle}

                    {comment.sessionDate
                      ? ` · ${formatDate(
                          comment.sessionDate
                        )}`
                      : ""}
                  </BodyText>
                </View>

                <BodyText
                  style={styles.commentDate}
                >
                  {formatCommentDate(
                    comment.created_at
                  )}
                </BodyText>
              </View>

              <View
                style={[
                  styles.commentBubble,
                  comment.author_role ===
                  "coach"
                    ? styles.coachBubble
                    : styles.athleteBubble,
                ]}
              >
                <BodyText
                  style={
                    styles.commentAuthor
                  }
                >
                  {comment.author_role ===
                  "coach"
                    ? "Du"
                    : "Adept"}
                </BodyText>

                <BodyText
                  style={styles.commentText}
                >
                  {comment.message}
                </BodyText>
              </View>

              {comment.author_role ===
                "athlete" && (
                <>
                  {replyingTo?.id ===
                  comment.id ? (
                    <View
                      style={
                        styles.inlineReply
                      }
                    >
                      <View
                        style={
                          styles.replyHeader
                        }
                      >
                        <View
                          style={
                            styles.replyHeaderText
                          }
                        >
                          <BodyText
                            style={
                              styles.replyLabel
                            }
                          >
                            SVAR TILL{" "}
                            {comment.athleteName.toUpperCase()}
                          </BodyText>
                        </View>

                        <Pressable
                          onPress={() => {
                            setReplyingTo(
                              null
                            );
                            setReplyText("");
                          }}
                          style={
                            styles.closeReplyButton
                          }
                        >
                          <BodyText
                            style={
                              styles.closeReplyText
                            }
                          >
                            ×
                          </BodyText>
                        </Pressable>
                      </View>

                      <TextInput
                        value={replyText}
                        onChangeText={
                          setReplyText
                        }
                        placeholder="Skriv ett svar..."
                        placeholderTextColor="#8A94A6"
                        style={
                          styles.replyInput
                        }
                        multiline
                        textAlignVertical="top"
                      />

                      <Pressable
                        onPress={
                          handleSendReply
                        }
                        disabled={
                          sendingReply ||
                          !replyText.trim()
                        }
                        style={[
                          styles.sendButton,
                          (sendingReply ||
                            !replyText.trim()) &&
                            styles.sendButtonDisabled,
                        ]}
                      >
                        <BodyText
                          style={
                            styles.sendButtonText
                          }
                        >
                          {sendingReply
                            ? "Skickar..."
                            : "Skicka svar"}
                        </BodyText>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setReplyingTo(
                          comment
                        );
                        setReplyText("");
                        setCommentMessage(
                          null
                        );
                      }}
                      style={
                        styles.replyButton
                      }
                    >
                      <BodyText
                        style={
                          styles.replyButtonText
                        }
                      >
                        Svara
                      </BodyText>
                    </Pressable>
                  )}
                </>
              )}
            </Card>
          ))
        )}
      </View>

      <View
        style={styles.importSection}
      >
        <SectionLabel>
          TESTVERKTYG
        </SectionLabel>

        <Pressable
          onPress={handleImportEric}
          disabled={importing}
          style={[
            styles.importButton,
            importing &&
              styles.disabledButton,
          ]}
        >
          {importing ? (
            <ActivityIndicator />
          ) : (
            <BodyText
              style={
                styles.importButtonText
              }
            >
              Importera Erics testschema
            </BodyText>
          )}
        </Pressable>

        {importMessage && (
          <BodyText
            style={styles.importMessage}
          >
            {importMessage}
          </BodyText>
        )}
      </View>
    </Screen>
  );
}

function formatDate(date: string) {
  const parsed = new Date(
    `${date}T00:00:00Z`
  );

  return parsed.toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }
  );
}

function formatCommentDate(
  value: string
) {
  return new Date(value).toLocaleString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getStatusIcon(
  status: "green" | "yellow" | "red"
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
    marginBottom: 20,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor:
      "rgba(255,255,255,0.06)",
  },

  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.65,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.7,
  },

  loading: {
    marginTop: 20,
    alignItems: "center",
    gap: 8,
  },

  commentsLoading: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    opacity: 0.7,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
  },

  score: {
    fontSize: 20,
    fontWeight: "700",
  },

  status: {
    marginTop: 8,
    fontSize: 15,
    opacity: 0.8,
  },

  training: {
    marginTop: 10,
    fontSize: 15,
    opacity: 0.7,
  },

  link: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "600",
  },

  commentsSection: {
    marginTop: 30,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor:
      "rgba(255,255,255,0.06)",
  },

  refreshText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
  },

  commentMessage: {
    marginBottom: 10,
    fontSize: 13,
    color: "#ff8f8f",
  },

  emptyComments: {
    opacity: 0.55,
  },

  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  commentHeaderText: {
    flex: 1,
  },

  athleteName: {
    fontSize: 16,
    fontWeight: "700",
  },

  sessionInfo: {
    marginTop: 3,
    fontSize: 12,
    opacity: 0.55,
  },

  commentDate: {
    fontSize: 11,
    opacity: 0.45,
  },

  commentBubble: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },

  athleteBubble: {
    backgroundColor:
      "rgba(80,200,140,0.08)",
    borderColor:
      "rgba(80,200,140,0.18)",
  },

  coachBubble: {
    backgroundColor:
      "rgba(80,130,220,0.08)",
    borderColor:
      "rgba(80,130,220,0.18)",
  },

  commentAuthor: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.55,
    marginBottom: 4,
  },

  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },

  replyButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  replyButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },

  inlineReply: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E1E7EF",
  },

  replyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  replyHeaderText: {
    flex: 1,
  },

  replyLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.55,
  },

  closeReplyButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  closeReplyText: {
    fontSize: 20,
    opacity: 0.7,
  },

  replyInput: {
    marginTop: 12,
    minHeight: 90,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE8",
    color: "#172033",
    fontSize: 14,
  },

  sendButton: {
    marginTop: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor:
      "rgba(80,200,140,0.9)",
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  sendButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  importSection: {
    marginTop: 30,
    paddingBottom: 30,
  },

  importButton: {
    marginTop: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor:
      "rgba(80,200,140,0.9)",
  },

  disabledButton: {
    opacity: 0.5,
  },

  importButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },

  importMessage: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.75,
  },
});