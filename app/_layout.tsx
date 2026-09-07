import {
  Stack,
  usePathname,
  router,
} from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
} from "react-native";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/auth";

export default function RootLayout() {
  const pathname = usePathname();

  const [session, setSession] =
    useState<Session | null>(null);

  const [sessionLoaded, setSessionLoaded] =
    useState(false);

  const [profileLoaded, setProfileLoaded] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(session);
      setSessionLoaded(true);
    }

    loadSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!mounted) {
            return;
          }

          setSession(nextSession);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionLoaded) {
      return;
    }

    async function handleNavigation() {
      if (!session) {
        setProfileLoaded(true);

        if (pathname !== "/login") {
          router.replace("/login");
        }

        return;
      }

      try {
        const profile =
          await getCurrentProfile();

        if (!profile) {
          setProfileLoaded(true);
          return;
        }

        /*
         * COACH
         *
         * En coach ska använda coachvyn.
         * Vi skickar bara till /coach om
         * personen befinner sig på login,
         * startsidan eller en adept-route.
         */
        if (profile.role === "coach") {
          setProfileLoaded(true);

          if (
            pathname === "/login" ||
            pathname === "/" ||
            pathname.startsWith("/athlete/")
          ) {
            router.replace("/coach");
          }

          return;
        }

        /*
         * ADEPT
         *
         * En adept skickas till sin egen
         * athlete-route.
         */
        if (profile.role === "athlete") {
          if (!profile.athlete_id) {
            setProfileLoaded(true);
            return;
          }

          const athletePath =
            `/athlete/${profile.athlete_id}`;

          setProfileLoaded(true);

          if (
            pathname === "/login" ||
            pathname === "/" ||
            pathname === "/coach"
          ) {
            router.replace(athletePath);
          }

          return;
        }

        setProfileLoaded(true);
      } catch (error) {
        console.error(
          "Kunde inte läsa användarprofil:",
          error
        );

        setProfileLoaded(true);
      }
    }

    handleNavigation();
  }, [
    session,
    sessionLoaded,
    pathname,
  ]);

  if (
    !sessionLoaded ||
    !profileLoaded
  ) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#08111f",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="coach/index"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="athlete/[id]"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
          title: "Modal",
        }}
      />
    </Stack>
  );
}