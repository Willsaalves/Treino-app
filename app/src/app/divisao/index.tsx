import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api, WEEKDAYS, type Day } from "@/lib/api";
import { C, Card, ErrorBox, Loading, P, Row, Screen } from "@/components/ui";

export default function SplitScreen() {
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setDays(await api<Day[]>("/api/days")); } catch (e) { setError((e as Error).message); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (error) return <Screen><ErrorBox message={error} onRetry={load} /></Screen>;
  if (!days) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <P muted>Toque num dia para editar exercícios, séries e repetições.</P>
      {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
        const d = days.find((x) => x.weekday === wd);
        return (
          <Pressable key={wd} onPress={() => router.push(`/divisao/${wd}`)}>
            <Card>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{WEEKDAYS[wd]}</Text>
                <Text style={{ color: d ? C.text : C.muted }}>{d ? d.name : "Descanso"} ›</Text>
              </Row>
              {d && <P muted>{d.items.map((i) => i.name).join(" · ")}</P>}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
