import React, { useEffect, useState } from "react";
import { View } from "react-native";

import BodyText from "@/components/ui/BodyText";
import Screen from "@/components/ui/Screen";

import { supabase } from "@/lib/supabase";

export default function SupabaseTestScreen() {
  const [message, setMessage] =
    useState("Testar Supabase...");

  useEffect(() => {
    async function testConnection() {
      try {
        const { error } =
          await supabase.auth.getSession();

        if (error) {
          setMessage(
            `Supabase-fel: ${error.message}`
          );
          return;
        }

        setMessage(
          "✅ Supabase fungerar!"
        );
      } catch (error) {
        setMessage(
          `Kunde inte ansluta: ${String(error)}`
        );
      }
    }

    testConnection();
  }, []);

  return (
    <Screen>
      <View>
        <BodyText>
          {message}
        </BodyText>
      </View>
    </Screen>
  );
}