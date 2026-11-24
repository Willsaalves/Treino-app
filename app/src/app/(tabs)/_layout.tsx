import { Redirect, router } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { Pressable, Text } from "react-native";
import { C } from "@/components/ui";
import { useConfig } from "@/lib/api";

const icon = (emoji: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

export default function TabsLayout() {
  const { ready, config } = useConfig();
  if (ready && !config.url) return <Redirect href="/ajustes" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.text,
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border },
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.muted,
        sceneStyle: { backgroundColor: C.bg },
        headerRight: () => (
          <Pressable onPress={() => router.push("/ajustes")} hitSlop={12} style={{ marginRight: 16 }}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Treino", tabBarIcon: icon("🏋️") }} />
      <Tabs.Screen name="exercicios" options={{ title: "Exercícios", tabBarIcon: icon("📚") }} />
      <Tabs.Screen name="dieta" options={{ title: "Dieta", tabBarIcon: icon("🍽️") }} />
      <Tabs.Screen name="evolucao" options={{ title: "Evolução", tabBarIcon: icon("📈") }} />
      <Tabs.Screen name="coach" options={{ title: "Coach", tabBarIcon: icon("🤖") }} />
    </Tabs>
  );
}
