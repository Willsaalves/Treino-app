import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { addDays, api, isoDate, prettyDate, type Diet } from "@/lib/api";
import { Bar, Button, C, Card, ErrorBox, H2, Input, Loading, P, Row, Screen } from "@/components/ui";

export default function DietScreen() {
  const [date, setDate] = useState(isoDate());
  const [d, setD] = useState<Diet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraP, setExtraP] = useState("");
  const [extraK, setExtraK] = useState("");

  const load = useCallback(async () => {
    try { setError(null); setD(await api<Diet>(`/api/diet?date=${date}`)); } catch (e) { setError((e as Error).message); }
  }, [date]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patchDaily = async (patch: Record<string, unknown>) => {
    await api("/api/diet/daily", { method: "PUT", body: { date, ...patch } });
    load();
  };
  const toggleMeal = async (id: number, done: boolean) => {
    setD((prev) => prev && { ...prev, meals: prev.meals.map((m) => (m.id === id ? { ...m, done } : m)) });
    await api("/api/diet/check", { body: { date, meal_id: id, done } });
    load();
  };

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between" }}>
        <Button title="‹" variant="ghost" small onPress={() => setDate(addDays(date, -1))} />
        <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>{prettyDate(date)}</Text>
        <Button title="›" variant="ghost" small onPress={() => setDate(addDays(date, 1))} />
      </Row>

      {error ? <ErrorBox message={error} onRetry={load} /> : !d ? <Loading /> : (
        <>
          <Card>
            <Metric label="Proteína" value={d.totals.protein_g} goal={d.goals.protein_g} unit="g" />
            <Metric label="Calorias" value={d.totals.kcal} goal={d.goals.kcal} unit="kcal" />
            <Metric label="Água" value={d.daily.water_ml} goal={d.goals.water_ml} unit="ml" color="#3A86FF" />
            <Row style={{ flexWrap: "wrap" }}>
              <Button title="+250 ml" variant="ghost" small onPress={() => patchDaily({ water_ml: d.daily.water_ml + 250 })} />
              <Button title="+500 ml" variant="ghost" small onPress={() => patchDaily({ water_ml: d.daily.water_ml + 500 })} />
              <Button title={d.daily.creatine ? "Creatina ✓" : "Creatina"} variant={d.daily.creatine ? "success" : "ghost"} small
                onPress={() => patchDaily({ creatine: !d.daily.creatine })} />
              {d.daily.water_ml > 0 && <Button title="Zerar água" variant="ghost" small onPress={() => patchDaily({ water_ml: 0 })} />}
            </Row>
          </Card>

          {d.meals.map((m) => (
            <Pressable key={m.id} onPress={() => toggleMeal(m.id, !m.done)}>
              <Card style={m.done ? { borderColor: C.green, backgroundColor: C.greenSoft } : undefined}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: "700", flex: 1 }}>{m.time} · {m.name}</Text>
                  <Text style={{ fontSize: 20 }}>{m.done ? "✅" : "⬜️"}</Text>
                </Row>
                {m.items.map((it, i) => <P key={i} muted>• {it}</P>)}
                {(m.protein_g > 0 || m.kcal > 0) && <P muted style={{ fontSize: 12 }}>~{m.protein_g} g proteína · ~{m.kcal} kcal</P>}
              </Card>
            </Pressable>
          ))}

          <Card>
            <H2>Fora do plano</H2>
            <P muted>Comeu algo a mais? Some aqui para o total ficar certo.</P>
            <Row>
              <View style={{ flex: 1 }}><Input label="Proteína (g)" value={extraP} onChangeText={setExtraP} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Input label="Calorias" value={extraK} onChangeText={setExtraK} keyboardType="number-pad" /></View>
            </Row>
            <Button title="Adicionar" small onPress={async () => {
              await patchDaily({
                extra_protein_g: d.daily.extra_protein_g + (Number(extraP) || 0),
                extra_kcal: d.daily.extra_kcal + (Number(extraK) || 0),
              });
              setExtraP(""); setExtraK("");
            }} />
            {(d.daily.extra_protein_g > 0 || d.daily.extra_kcal > 0) && (
              <Row style={{ justifyContent: "space-between" }}>
                <P muted>Extras hoje: {d.daily.extra_protein_g} g · {d.daily.extra_kcal} kcal</P>
                <Button title="Zerar" variant="ghost" small onPress={() => patchDaily({ extra_protein_g: 0, extra_kcal: 0 })} />
              </Row>
            )}
          </Card>

          <Card>
            <H2>Sono da última noite</H2>
            <Row style={{ flexWrap: "wrap" }}>
              {[5, 6, 6.5, 7, 7.5, 8, 9].map((h) => (
                <Button key={h} title={`${h}h`} small variant={d.daily.sleep_h === h ? "success" : "ghost"} onPress={() => patchDaily({ sleep_h: h })} />
              ))}
            </Row>
          </Card>

          <Button title="Editar plano alimentar" variant="ghost" onPress={() => router.push("/dieta-editar")} />
        </>
      )}
    </Screen>
  );
}

function Metric({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ color: C.text, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: C.muted }}>{value} / {goal} {unit}</Text>
      </Row>
      <Bar value={value} goal={goal} color={color} />
    </View>
  );
}
