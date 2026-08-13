import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hem",
        }}
      />

      <Tabs.Screen
        name="athlete"
        options={{
          title: "Min träning",
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Plan",
        }}
      />

      <Tabs.Screen
        name="athletes"
        options={{
          title: "Adepter",
        }}
      />
    </Tabs>
  );
}