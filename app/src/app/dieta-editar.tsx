import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { api, type Diet } from "@/lib/api";
import { Button, Card, Input, Loading, P, Row, Screen } from "@/components/ui";

type EditMeal = { id?: number; time: string; name: string; items: string; protein_g: string; kcal: string };

export default function EditDietScreen() {
  const [meals, setMeals] = useState<EditMeal[] | null>(null);

  useEffect(() => {
    api<Diet>("/api/diet").then((d) =>
      setMeals(d.meals.map((m) => ({ id: m.id, time: m.time, name: m.name, items: m.items.join("\n"), protein_g: String(m.protein_g), kcal: String(m.kcal) }))),
    ).catch((e) => Alert.alert("Erro", (e as Error).message));
  }, []);

  const update = (i: number, patch: Partial<EditMeal>) => setMeals((a) => a!.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const save = async () => {
    if (!meals) return;
    const sorted = [...meals].sort((a, b) => a.time.localeCompare(b.time));
    try {
      await api("/api/diet/meals", { method: "PUT", body: { meals: sorted.map((m) => ({
        id: m.id, time: m.time, name: m.name.trim() || "Refeição",
        items: m.items.split("\n").map((s) => s.trim()).filter(Boolean),
        protein_g: Number(m.protein_g) || 0, kcal: Number(m.kcal) || 0,
      })) } });
      router.back();
    } catch (e) { Alert.alert("Erro", (e as Error).message); }
  };

  if (!meals) return <Screen><Loading /></Screen>;
  const totP = meals.reduce((a, m) => a + (Number(m.protein_g) || 0), 0);
  const totK = meals.reduce((a, m) => a + (Number(m.kcal) || 0), 0);

  return (
    <Screen>
      <P muted>Total do plano: ~{totP} g de proteína · ~{totK} kcal. Um item por linha.</P>
      {meals.map((m, i) => (
        <Card key={m.id ?? `new-${i}`}>
          <Row>
            <View style={{ width: 90 }}><Input label="Horário" value={m.time} onChangeText={(v) => update(i, { time: v })} placeholder="13:00" /></View>
            <View style={{ flex: 1 }}><Input label="Nome" value={m.name} onChangeText={(v) => update(i, { name: v })} /></View>
          </Row>
          <Input label="Itens" value={m.items} onChangeText={(v) => update(i, { items: v })} multiline style={{ minHeight: 80 }} />
          <Row>
            <View style={{ flex: 1 }}><Input label="Proteína (g)" value={m.protein_g} onChangeText={(v) => update(i, { protein_g: v })} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label="kcal" value={m.kcal} onChangeText={(v) => update(i, { kcal: v })} keyboardType="number-pad" /></View>
          </Row>
          <Button title="Remover refeição" variant="danger" small onPress={() => setMeals((a) => a!.filter((_, j) => j !== i))} />
        </Card>
      ))}
      <Button title="+ Adicionar refeição" variant="ghost"
        onPress={() => setMeals((a) => [...a!, { time: "16:00", name: "Lanche", items: "", protein_g: "0", kcal: "0" }])} />
      <Button title="Salvar plano" onPress={save} />
    </Screen>
  );
}
