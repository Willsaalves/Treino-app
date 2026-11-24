import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api, type Exercise } from "@/lib/api";
import { C, Card, Chip, ErrorBox, Input, Loading, P, Row, Screen } from "@/components/ui";

export default function ExercisesScreen() {
  const [all, setAll] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setAll(await api<Exercise[]>("/api/exercises")); } catch (e) { setError((e as Error).message); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const groups = useMemo(() => [...new Set((all ?? []).map((e) => e.muscle.split(" (")[0]))], [all]);
  const list = (all ?? []).filter((e) =>
    (!group || e.muscle.startsWith(group)) &&
    (!q || `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <Screen>
      <Input value={q} onChangeText={setQ} placeholder="Buscar exercício, músculo ou aparelho…" />
      <Row style={{ flexWrap: "wrap" }}>
        <Chip label="Todos" active={!group} onPress={() => setGroup(null)} />
        {groups.map((g) => <Chip key={g} label={g} active={group === g} onPress={() => setGroup(group === g ? null : g)} />)}
      </Row>
      {error ? <ErrorBox message={error} onRetry={load} /> : !all ? <Loading /> : list.map((e) => (
        <Pressable key={e.id} onPress={() => router.push(`/exercise/${e.id}`)}>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{e.name}</Text>
                <P muted>{e.muscle} · {e.equipment}</P>
              </View>
              <Text style={{ color: C.muted, fontSize: 20 }}>›</Text>
            </Row>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
