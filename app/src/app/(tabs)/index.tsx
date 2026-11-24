import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { addDays, api, isoDate, prettyDate, type LoggedSet, type Workout, type WorkoutItem } from "@/lib/api";
import { Button, C, Card, ErrorBox, H1, H2, Input, Loading, P, Row, Screen } from "@/components/ui";

export default function TodayScreen() {
  const [date, setDate] = useState(isoDate());
  const [data, setData] = useState<Workout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [restEnds, setRestEnds] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api<Workout>(`/api/workout?date=${date}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const done = data?.items.reduce((a, it) => a + Math.min(it.logged.length, it.sets), 0) ?? 0;
  const total = data?.items.reduce((a, it) => a + it.sets, 0) ?? 0;

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Button title="‹" variant="ghost" small onPress={() => setDate(addDays(date, -1))} />
        <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>{prettyDate(date)}</Text>
        <Button title="›" variant="ghost" small onPress={() => setDate(addDays(date, 1))} />
      </Row>

      {restEnds ? <RestTimer endsAt={restEnds} onDone={() => setRestEnds(null)} /> : null}

      {error ? <ErrorBox message={error} onRetry={load} /> : !data ? <Loading /> : data.rest ? (
        <Card>
          <H2>Dia de descanso 😴</H2>
          <P muted>Recuperação também é treino. Foque em proteína, água e sono.</P>
          <Button title="Editar divisão" variant="ghost" small onPress={() => router.push("/divisao")} />
        </Card>
      ) : (
        <>
          <View style={{ gap: 4 }}>
            <H1>{data.name}</H1>
            <P muted>{done}/{total} séries feitas</P>
          </View>
          {data.items.map((it) => (
            <ExerciseCard key={`${date}-${it.id}`} item={it} date={date}
              onLogged={(rest) => { setRestEnds(Date.now() + rest * 1000); load(); }} />
          ))}
          <Button title="Editar divisão" variant="ghost" onPress={() => router.push("/divisao")} />
        </>
      )}
    </Screen>
  );
}

function ExerciseCard({ item, date, onLogged }: { item: WorkoutItem; date: string; onLogged: (restSec: number) => void }) {
  const s = item.suggestion;
  const rest = item.rep_max <= 10 ? 120 : 75;
  return (
    <Card>
      <Pressable onPress={() => router.push(`/exercise/${item.exercise_id}`)}>
        <Row style={{ justifyContent: "space-between" }}>
          <H2>{item.name}</H2>
          <Text style={{ color: C.muted }}>ⓘ</Text>
        </Row>
        <P muted>{item.sets} × {item.rep_min}–{item.rep_max} · {item.muscle}</P>
      </Pressable>
      <View style={{ backgroundColor: C.accentSoft, borderRadius: 10, padding: 10 }}>
        <Text style={{ color: C.text, fontSize: 13 }}>
          🎯 {s.weight != null ? `${s.weight} kg × ${s.reps}` : "Defina a carga"} — {s.reason}
        </Text>
      </View>
      {Array.from({ length: Math.max(item.sets, item.logged.length) }, (_, i) => (
        <SetRow key={i} n={i + 1} item={item} date={date}
          logged={item.logged.find((l) => l.set_number === i + 1)} onLogged={() => onLogged(rest)} />
      ))}
    </Card>
  );
}

function SetRow({ n, item, date, logged, onLogged }: { n: number; item: WorkoutItem; date: string; logged?: LoggedSet; onLogged: () => void }) {
  const prevSet = item.suggestion.last?.sets[n - 1];
  const [weight, setWeight] = useState(String(logged?.weight ?? item.suggestion.weight ?? prevSet?.weight ?? ""));
  const [reps, setReps] = useState(String(logged?.reps ?? ""));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const w = Number(weight.replace(",", ".")), r = Number(reps);
    if (!(w >= 0) || !(r > 0)) return;
    setBusy(true);
    try {
      await api("/api/logs", { body: { date, exercise_id: item.exercise_id, set_number: n, weight: w, reps: r } });
      onLogged();
    } finally { setBusy(false); }
  };

  return (
    <Row>
      <Text style={{ color: logged ? C.green : C.muted, width: 22, fontWeight: "700" }}>{n}</Text>
      <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="kg" style={{ width: 80, textAlign: "center" }} />
      <Text style={{ color: C.muted }}>×</Text>
      <Input value={reps} onChangeText={setReps} keyboardType="number-pad"
        placeholder={prevSet ? `${prevSet.reps}` : `${item.suggestion.reps}`} style={{ width: 64, textAlign: "center" }} />
      <View style={{ flex: 1 }} />
      <Button title={logged ? "✓" : "Feito"} variant={logged ? "success" : "primary"} small disabled={busy} onPress={save} />
    </Row>
  );
}

function RestTimer({ endsAt, onDone }: { endsAt: number; onDone: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((endsAt - now) / 1000));
  useEffect(() => { if (left === 0) { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); } }, [left, onDone]);
  return (
    <Card style={{ backgroundColor: left ? C.cardAlt : C.greenSoft, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>
        {left ? `⏱️ Descanso ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "✅ Bora pra próxima série!"}
      </Text>
      <Button title="Pular" variant="ghost" small onPress={onDone} />
    </Card>
  );
}
