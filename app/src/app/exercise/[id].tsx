import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api, type ExerciseDetail } from "@/lib/api";
import { LineChart } from "@/components/LineChart";
import { C, Card, ErrorBox, H1, H2, Loading, P, Row, Screen } from "@/components/ui";

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ex, setEx] = useState<ExerciseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setEx(await api<ExerciseDetail>(`/api/exercises/${id}`)); } catch (e) { setError((e as Error).message); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (error) return <Screen><ErrorBox message={error} onRetry={load} /></Screen>;
  if (!ex) return <Screen><Loading /></Screen>;

  const hist = [...ex.history].reverse();
  return (
    <Screen>
      <Stack.Screen options={{ title: ex.name }} />
      <View style={{ gap: 2 }}>
        <H1>{ex.name}</H1>
        <P muted>{ex.muscle} · {ex.equipment} · {ex.kind === "compound" ? "composto" : "isolado"}</P>
      </View>

      <Card>
        <H2>Como fazer</H2>
        <P>{ex.execution}</P>
      </Card>
      <Card>
        <H2>Erros comuns</H2>
        <P>{ex.mistakes}</P>
      </Card>

      {ex.substitutesInfo.length > 0 && (
        <Card>
          <H2>Substitutos</H2>
          <P muted>Aparelho ocupado? Qualquer um destes faz o mesmo papel.</P>
          {ex.substitutesInfo.map((s) => (
            <Pressable key={s.id} onPress={() => router.push(`/exercise/${s.id}`)}>
              <Row style={{ justifyContent: "space-between", paddingVertical: 6 }}>
                <Text style={{ color: C.text, fontSize: 15 }}>{s.name}</Text>
                <Text style={{ color: C.muted }}>{s.equipment} ›</Text>
              </Row>
            </Pressable>
          ))}
        </Card>
      )}

      <Card>
        <H2>Sua evolução</H2>
        {hist.length === 0 ? <P muted>Nenhum registro ainda.</P> : (
          <>
            <P muted>Força estimada (1RM) por sessão</P>
            <LineChart unit="kg" points={hist.map((h) => ({ label: h.date.slice(5).split("-").reverse().join("/"), value: h.e1rm }))} />
            {ex.history.slice(0, 6).map((h) => (
              <Row key={h.date} style={{ justifyContent: "space-between" }}>
                <Text style={{ color: C.muted }}>{h.date.split("-").reverse().join("/")}</Text>
                <Text style={{ color: C.text }}>{h.top_weight} kg · melhor {h.best_reps} reps · {h.sets} séries</Text>
              </Row>
            ))}
          </>
        )}
      </Card>
    </Screen>
  );
}
