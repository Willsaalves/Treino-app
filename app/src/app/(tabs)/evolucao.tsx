import { useCallback, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { api, isoDate, photoSource, type Progress } from "@/lib/api";
import { LineChart } from "@/components/LineChart";
import { Button, C, Card, Chip, ErrorBox, H2, Input, Loading, P, Row, Screen } from "@/components/ui";

const fmt = (d: string) => d.slice(5).split("-").reverse().join("/");

export default function ProgressScreen() {
  const [p, setP] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [pose, setPose] = useState<"frente" | "lado" | "costas">("frente");
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState(false);

  const load = useCallback(async () => {
    try { setError(null); setP(await api<Progress>("/api/progress")); } catch (e) { setError((e as Error).message); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveMetric = async () => {
    const w = weight ? Number(weight.replace(",", ".")) : null;
    const c = waist ? Number(waist.replace(",", ".")) : null;
    if (w == null && c == null) return;
    await api("/api/metrics", { body: { date: isoDate(), weight: w, waist: c } });
    setWeight(""); setWaist("");
    load();
  };

  const addPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permissão negada", "Libere o acesso nas configurações do celular.");
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7 };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    const form = new FormData();
    if (Platform.OS === "web") {
      // No navegador o FormData precisa de um Blob de verdade
      form.append("photo", await (await fetch(asset.uri)).blob(), asset.fileName ?? "foto.jpg");
    } else {
      // React Native aceita { uri, name, type } como arquivo no FormData
      form.append("photo", { uri: asset.uri, name: asset.fileName ?? "foto.jpg", type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
    }
    form.append("date", isoDate());
    form.append("pose", pose);
    setUploading(true);
    try { await api("/api/photos", { form, timeoutMs: 60000 }); load(); }
    catch (e) { Alert.alert("Erro", (e as Error).message); }
    finally { setUploading(false); }
  };

  const removePhoto = (id: number) => Alert.alert("Apagar foto?", "", [
    { text: "Cancelar", style: "cancel" },
    { text: "Apagar", style: "destructive", onPress: async () => { await api(`/api/photos/${id}`, { method: "DELETE" }); load(); } },
  ]);

  if (error) return <Screen><ErrorBox message={error} onRetry={load} /></Screen>;
  if (!p) return <Screen><Loading /></Screen>;

  const weekly = [...p.weekly].reverse();
  const wPoints = weekly.filter((w) => w.avg_weight != null).map((w) => ({ label: fmt(w.week), value: w.avg_weight! }));
  const cPoints = weekly.filter((w) => w.waist != null).map((w) => ({ label: fmt(w.week), value: w.waist! }));
  const lastTwo = p.weekly.filter((w) => w.avg_weight != null).slice(0, 2);
  const delta = lastTwo.length === 2 ? lastTwo[0].avg_weight! - lastTwo[1].avg_weight! : null;

  const byPose = p.photos.filter((ph) => ph.pose === pose);
  const first = byPose[byPose.length - 1], latest = byPose[0];

  return (
    <Screen>
      <Card>
        <H2>Registrar hoje</H2>
        <P muted>Peso: 3×/semana ao acordar, depois do banheiro. Cintura: 1×/semana na altura do umbigo.</P>
        <Row>
          <View style={{ flex: 1 }}><Input label="Peso (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="77,8" /></View>
          <View style={{ flex: 1 }}><Input label="Cintura (cm)" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="88" /></View>
        </Row>
        <Button title="Salvar" onPress={saveMetric} />
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <H2>Peso (média semanal)</H2>
          {delta != null && (
            <Text style={{ color: delta <= 0 ? C.green : C.yellow, fontWeight: "700" }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)} kg</Text>
          )}
        </Row>
        <LineChart points={wPoints} unit="kg" />
      </Card>

      <Card>
        <H2>Cintura</H2>
        <LineChart points={cPoints} unit="cm" />
      </Card>

      <Card>
        <H2>Fotos</H2>
        <P muted>Mesmo lugar, mesma luz, de manhã. A cada 2–3 semanas.</P>
        <Row>
          {(["frente", "lado", "costas"] as const).map((x) => <Chip key={x} label={x} active={pose === x} onPress={() => setPose(x)} />)}
        </Row>
        <Row>
          <Button title="📷 Câmera" small onPress={() => addPhoto(true)} disabled={uploading} style={{ flex: 1 }} />
          <Button title="🖼️ Galeria" small variant="ghost" onPress={() => addPhoto(false)} disabled={uploading} style={{ flex: 1 }} />
        </Row>
        {uploading && <Loading />}

        {first && latest && first.id !== latest.id && (
          <Button title={compare ? "Ver todas" : "Comparar primeira × última"} variant="ghost" small onPress={() => setCompare(!compare)} />
        )}

        {compare && first && latest ? (
          <Row style={{ alignItems: "flex-start" }}>
            {[first, latest].map((ph) => (
              <View key={ph.id} style={{ flex: 1, gap: 4 }}>
                <Image source={photoSource(ph.filename)} style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 10 }} />
                <Text style={{ color: C.muted, textAlign: "center" }}>{fmt(ph.date)}</Text>
              </View>
            ))}
          </Row>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {byPose.map((ph) => (
              <Pressable key={ph.id} onLongPress={() => removePhoto(ph.id)} style={{ gap: 4 }}>
                <Image source={photoSource(ph.filename)} style={{ width: 120, height: 160, borderRadius: 10, backgroundColor: C.cardAlt }} />
                <Text style={{ color: C.muted, textAlign: "center", fontSize: 12 }}>{fmt(ph.date)}</Text>
              </Pressable>
            ))}
            {byPose.length === 0 && <P muted>Nenhuma foto de {pose} ainda.</P>}
          </ScrollView>
        )}
        {byPose.length > 0 && <P muted style={{ fontSize: 12 }}>Segure uma foto para apagar.</P>}
      </Card>

      {p.metrics.length > 0 && (
        <Card>
          <H2>Últimos registros</H2>
          {p.metrics.slice(0, 10).map((m) => (
            <Row key={m.id} style={{ justifyContent: "space-between" }}>
              <Text style={{ color: C.muted }}>{m.date.split("-").reverse().join("/")}</Text>
              <Text style={{ color: C.text }}>{m.weight != null ? `${m.weight} kg` : ""}{m.weight != null && m.waist != null ? " · " : ""}{m.waist != null ? `${m.waist} cm` : ""}</Text>
              <Pressable onPress={async () => { await api(`/api/metrics/${m.id}`, { method: "DELETE" }); load(); }} hitSlop={10}>
                <Text style={{ color: C.muted }}>✕</Text>
              </Pressable>
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}
