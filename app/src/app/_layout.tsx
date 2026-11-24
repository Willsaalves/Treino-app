import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { C } from "@/components/ui";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: C.bg },
          headerBackTitle: "Voltar",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="exercise/[id]" options={{ title: "Exercício" }} />
        <Stack.Screen name="divisao/index" options={{ title: "Minha divisão" }} />
        <Stack.Screen name="divisao/[weekday]" options={{ title: "Editar treino" }} />
        <Stack.Screen name="dieta-editar" options={{ title: "Editar plano alimentar" }} />
        <Stack.Screen name="ajustes" options={{ title: "Ajustes" }} />
      </Stack>
    </>
  );
}
