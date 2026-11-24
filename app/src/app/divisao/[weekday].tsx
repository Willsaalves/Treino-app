import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, WEEKDAYS, type Day, type Exercise } from "@/lib/api";
import { Button, C, Card, Input, Loading, P, Row, Screen } from "@/components/ui";

type Item = { exercise_id: string; name: string; sets: string; rep_min: string; rep_max: string };

export default function EditDayScreen() {
  const weekday = Number(useLocalSearchParams<{ weekday: string }>().weekday);
  const [name, setName] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [picker, setPicker] = useState<{ index: number | null } | null>(null); // null index = adicionar
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([api<Day[]>("/api/days"), api<Exercise[]>("/api/exercises")]).then(([days, exs]) => {
      const d = days.find((x) => x.weekday === weekday);
      setName(d?.name ?? "");
      setItems(d?.items.map((i) => ({ exercise_id: i.exercise_id, name: i.name, sets: String(i.sets), rep_min: String(i.rep_min), rep_max: String(i.rep_max) })) ?? []);
      setExercises(exs);
    }).catch((e) => Alert.alert("Erro", (e as Error).message));
  }, [weekday]);

  const update = (i: number, patch: Partial<Item>) => setItems((arr) => arr!.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => setItems((arr) => {
    const a = [...arr!]; const j = i + dir;
    if (j < 0 || j >= a.length) return a;
    [a[i], a[j]] = [a[j], a[i]]; return a;
  });

  const pick = (ex: Exercise) => {
    if (picker?.index == null) setItems((a) => [...a!, { exercise_id: ex.id, name: ex.name, sets: "3", rep_min: "8", rep_max: "12" }]);
    else update(picker.index, { exercise_id: ex.id, name: ex.name });
    setPicker(null); setQ("");
  };

  const save = async () => {
    if (!items) return;
    try {
      if (items.length === 0) {
        await api(`/api/days/${weekday}`, { method: "DELETE" });
      } else {
        await api(`/api/days/${weekday}`, { method: "PUT", body: {
          name: name.trim() || "Treino",
          items: items.map((i) => ({ exercise_id: i.exercise_id, sets: Number(i.sets) || 3, rep_min: Number(i.rep_min) || 8, rep_max: Number(i.rep_max) || 12 })),
        } });
      }
      router.back();
    } catch (e) { Alert.alert("Erro", (e as Error).message); }
  };

  if (!items) return <Screen><Loading /></Screen>;
  const filtered = exercises.filter((e) => !q || `${e.name} ${e.muscle}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen>
      <Stack.Screen options={{ title: WEEKDAYS[weekday] }} />
      <Input label="Nome do treino" value={name} onChangeText={setName} placeholder="Ex.: Costas + bíceps" />
      {items.length === 0 && <P muted>Sem exercícios = dia de descanso.</P>}

      {items.map((it, i) => (
        <Card key={`${it.exercise_id}-${i}`}>
          <Row style={{ justifyContent: "space-between" }}>
            <Pressable onPress={() => setPicker({ index: i })} style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{it.name} <Text style={{ color: C.muted, fontSize: 13 }}>trocar</Text></Text>
            </Pressable>
            <Row>
              <Button title="↑" variant="ghost" small onPress={() => move(i, -1)} />
              <Button title="↓" variant="ghost" small onPress={() => move(i, 1)} />
              <Button title="✕" variant="danger" small onPress={() => setItems((a) => a!.filter((_, j) => j !== i))} />
            </Row>
          </Row>
          <Row>
            <View style={{ flex: 1 }}><Input label="Séries" value={it.sets} onChangeText={(v) => update(i, { sets: v })} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label="Reps mín" value={it.rep_min} onChangeText={(v) => update(i, { rep_min: v })} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label="Reps máx" value={it.rep_max} onChangeText={(v) => update(i, { rep_max: v })} keyboardType="number-pad" /></View>
          </Row>
        </Card>
      ))}

      <Button title="+ Adicionar exercício" variant="ghost" onPress={() => setPicker({ index: null })} />
      <Button title="Salvar" onPress={save} />

      <Modal visible={!!picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(null)}>
        <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, gap: 10 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>Escolher exercício</Text>
            <Button title="Fechar" variant="ghost" small onPress={() => setPicker(null)} />
          </Row>
          <Input value={q} onChangeText={setQ} placeholder="Buscar…" autoFocus />
          <ScrollView contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
            {filtered.map((e) => (
              <Pressable key={e.id} onPress={() => pick(e)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ color: C.text, fontSize: 15 }}>{e.name}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{e.muscle} · {e.equipment}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
