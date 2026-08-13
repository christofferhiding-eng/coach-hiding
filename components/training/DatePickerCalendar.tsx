import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import BodyText from "@/components/ui/BodyText";

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

const WEEKDAYS = [
  "Mån",
  "Tis",
  "Ons",
  "Tor",
  "Fre",
  "Lör",
  "Sön",
];

export default function DatePickerCalendar({
  selectedDate,
  onSelectDate,
}: Props) {
  const initialDate = new Date(selectedDate);

  const [month, setMonth] = useState(
    initialDate.getMonth()
  );

  const [year, setYear] = useState(
    initialDate.getFullYear()
  );

  const days = useMemo(
    () => createCalendarDays(year, month),
    [year, month]
  );

  function previousMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((current) => current - 1);
    } else {
      setMonth((current) => current - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((current) => current + 1);
    } else {
      setMonth((current) => current + 1);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <Pressable
          onPress={previousMonth}
          style={styles.arrowButton}
        >
          <BodyText style={styles.arrow}>
            ←
          </BodyText>
        </Pressable>

        <BodyText style={styles.monthTitle}>
          {formatMonth(month, year)}
        </BodyText>

        <Pressable
          onPress={nextMonth}
          style={styles.arrowButton}
        >
          <BodyText style={styles.arrow}>
            →
          </BodyText>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((weekday) => (
          <View
            key={weekday}
            style={styles.weekday}
          >
            <BodyText style={styles.weekdayText}>
              {weekday}
            </BodyText>
          </View>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {days.map((day, index) => {
          if (!day) {
            return (
              <View
                key={`empty-${index}`}
                style={styles.dayCell}
              />
            );
          }

          const isSelected =
            day === selectedDate;

          return (
            <Pressable
              key={day}
              onPress={() => onSelectDate(day)}
              style={[
                styles.dayCell,
                isSelected &&
                  styles.selectedDayCell,
              ]}
            >
              <BodyText
                style={[
                  styles.dayText,
                  isSelected &&
                    styles.selectedDayText,
                ]}
              >
                {Number(day.slice(8, 10))}
              </BodyText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectedDateBox}>
        <BodyText style={styles.selectedLabel}>
          VALT DATUM
        </BodyText>

        <BodyText style={styles.selectedDate}>
          {formatSelectedDate(selectedDate)}
        </BodyText>
      </View>
    </View>
  );
}

function createCalendarDays(
  year: number,
  month: number
): (string | null)[] {
  const firstDay = new Date(
    year,
    month,
    1
  );

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const jsDay = firstDay.getDay();

  const mondayOffset =
    jsDay === 0 ? 6 : jsDay - 1;

  const days: (string | null)[] = [];

  for (let i = 0; i < mondayOffset; i++) {
    days.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const date = new Date(
      year,
      month,
      day
    );

    days.push(formatISODate(date));
  }

  return days;
}

function formatMonth(
  month: number,
  year: number
) {
  const date = new Date(
    year,
    month,
    1
  );

  return date.toLocaleDateString(
    "sv-SE",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function formatSelectedDate(
  date: string
) {
  return new Date(date).toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatISODate(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
    container: {
      marginTop: 8,
    },
  
    monthHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
  
    monthTitle: {
      fontSize: 16,
      fontWeight: "700",
      textTransform: "capitalize",
    },
  
    arrowButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },
  
    arrow: {
      fontSize: 18,
      fontWeight: "600",
    },
  
    weekdayRow: {
      flexDirection: "row",
      marginBottom: 2,
    },
  
    weekday: {
      flex: 1,
      alignItems: "center",
    },
  
    weekdayText: {
      fontSize: 11,
      fontWeight: "600",
      opacity: 0.45,
    },
  
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
  
    dayCell: {
      width: "14.2857%",
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
  
    selectedDayCell: {
      backgroundColor: "#8EE3B0",
    },
  
    dayText: {
      fontSize: 13,
      fontWeight: "600",
    },
  
    selectedDayText: {
      color: "#111",
    },
  
    selectedDateBox: {
      marginTop: 8,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },
  
    selectedLabel: {
      fontSize: 9,
      fontWeight: "700",
      opacity: 0.45,
    },
  
    selectedDate: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "600",
      textTransform: "capitalize",
    },
  });