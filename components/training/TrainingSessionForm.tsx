import React, { useState } from "react";
import {
  Button,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import BodyText from "@/components/ui/BodyText";
import SectionLabel from "@/components/ui/SectionLabel";

import DatePickerCalendar from "./DatePickerCalendar";

import {
  TrainingSession,
  TrainingSlot,
  TrainingType,
} from "@/features/training-plan";

type Props = {
  date: string;
  initialSession?: TrainingSession;
  isCopying?: boolean;

  onSave: (session: {
    date: string;
    slot: TrainingSlot;
    type: TrainingType;
    title: string;
    description: string;
  }) => void;

  onDelete?: () => void;
};

const slots: {
  value: TrainingSlot;
  label: string;
  icon: string;
}[] = [
  {
    value: "morning",
    label: "Förmiddag",
    icon: "☀️",
  },
  {
    value: "afternoon",
    label: "Eftermiddag",
    icon: "🌤️",
  },
  {
    value: "evening",
    label: "Kväll",
    icon: "🌙",
  },
];

const types: {
  value: TrainingType;
  label: string;
}[] = [
  {
    value: "easy",
    label: "Lugnt / distans",
  },
  {
    value: "quality",
    label: "Kvalitet",
  },
  {
    value: "long",
    label: "Långpass",
  },
  {
    value: "rest",
    label: "Vila",
  },
];

export default function TrainingSessionForm({
  date,
  initialSession,
  isCopying = false,
  onSave,
  onDelete,
}: Props) {
  const [selectedDate, setSelectedDate] =
    useState(date);

  const [slot, setSlot] = useState<TrainingSlot>(
    initialSession?.slot ?? "morning"
  );

  const [type, setType] = useState<TrainingType>(
    initialSession?.type ?? "easy"
  );

  const [title, setTitle] = useState(
    initialSession?.title ?? ""
  );

  const [description, setDescription] =
    useState(
      initialSession?.description ?? ""
    );

  const isEditing =
    Boolean(initialSession) && !isCopying;

  function handleSave() {
    if (!title.trim()) {
      return;
    }

    onSave({
      date: selectedDate,
      slot,
      type,
      title: title.trim(),
      description: description.trim(),
    });
  }

  return (
    <View style={styles.container}>
      <SectionLabel>
        {isCopying
          ? "KOPIERA TRÄNINGSPASS"
          : isEditing
            ? "REDIGERA TRÄNINGSPASS"
            : "NYTT TRÄNINGSPASS"}
      </SectionLabel>

      {isCopying && (
        <View style={styles.calendarSection}>
          <BodyText style={styles.label}>
            Välj datum
          </BodyText>

          <DatePickerCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </View>
      )}

      {!isCopying && (
        <BodyText style={styles.date}>
          {formatDate(selectedDate)}
        </BodyText>
      )}

      <View style={styles.section}>
        <BodyText style={styles.label}>
          När?
        </BodyText>

        <View style={styles.options}>
          {slots.map((item) => (
            <Pressable
              key={item.value}
              onPress={() =>
                setSlot(item.value)
              }
              style={[
                styles.option,
                slot === item.value &&
                  styles.optionSelected,
              ]}
            >
              <BodyText
                style={[
                  styles.optionText,
                  slot === item.value &&
                    styles.optionTextSelected,
                ]}
              >
                {item.icon} {item.label}
              </BodyText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <BodyText style={styles.label}>
          Typ av pass
        </BodyText>

        <View style={styles.options}>
          {types.map((item) => (
            <Pressable
              key={item.value}
              onPress={() =>
                setType(item.value)
              }
              style={[
                styles.option,
                type === item.value &&
                  styles.optionSelected,
              ]}
            >
              <BodyText
                style={[
                  styles.optionText,
                  type === item.value &&
                    styles.optionTextSelected,
                ]}
              >
                {item.label}
              </BodyText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <BodyText style={styles.label}>
          Titel
        </BodyText>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex. 10 × 1 km"
          placeholderTextColor="#888"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <BodyText style={styles.label}>
          Instruktion
        </BodyText>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Beskriv passet och vad adepten ska tänka på..."
          placeholderTextColor="#888"
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.descriptionInput,
          ]}
        />
      </View>

      <View style={styles.saveButton}>
        <Button
          title={
            isCopying
              ? "Skapa kopia"
              : isEditing
                ? "Spara ändringar"
                : "Spara pass"
          }
          onPress={handleSave}
          disabled={!title.trim()}
        />
      </View>

      {isEditing && onDelete && (
        <View style={styles.deleteButton}>
          <Button
            title="Ta bort pass"
            onPress={onDelete}
            color="#F87171"
          />
        </View>
      )}
    </View>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },

  calendarSection: {
    marginTop: 8,
  },

  date: {
    marginTop: 8,
    fontSize: 16,
    opacity: 0.65,
  },

  section: {
    marginTop: 20,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  optionSelected: {
    backgroundColor: "#8EE3B0",
  },

  optionText: {
    fontSize: 14,
    fontWeight: "600",
  },

  optionTextSelected: {
    color: "#111",
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "white",
    fontSize: 16,
  },

  descriptionInput: {
    minHeight: 110,
    paddingTop: 12,
  },

  saveButton: {
    marginTop: 24,
  },

  deleteButton: {
    marginTop: 12,
  },
});