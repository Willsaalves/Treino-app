import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { api, loadConfig, saveConfig } from "@/lib/api";
import { Button, Card, H2, Input, P, Row, Screen } from "@/components/ui";

const GOAL_FIELDS: [key: string, label: string][] = [
  ["goal_kcal", "Calorias/dia"], ["goal_protein_g", "Proteína (g)"], ["goal_water_ml", "Água (ml)"], ["goal_sleep_h", "Sono (h)"],
];

export default function SettingsScreen() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    loadConfig().then((c) => {
      setUrl(c.url); setToken(c.token);
      if (c.url) api<Record<string, string>>("/api/settings").then(setSettings).catch(() => {});
    });
  }, []);

  const connect = async () => {
    setStatus("Testando…");
    await saveConfig({ url, token });
    try {
      await api<{ ok: boolean }>("/api/health");
      setSettings(await api<Record<string, string>>("/api/settings"));
      setStatus("✅ Conectado!");
    } catch (e) {
      setStatus(`❌ ${(e as Error).message}`);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    try {
      setSettings(await api<Record<string, string>>("/api/settings", { method: "PUT", body: settings }));
      Alert.alert("Salvo", "Metas e perfil atualizados.");
    } catch (e) { Alert.alert("Erro", (e as Error).message); }
  };

  const set = (k: string) => (v: string) => setSettings((s) => ({ ...(s ?? {}), [k]: v }));

  return (
    <Screen>
      <Card>
        <H2>Servidor</H2>
        <P muted>Endereço do seu PC no Tailscale. Ex.: https://meu-pc.tailXXXX.ts.net ou http://100.x.y.z:3333</P>
        <Input label="Endereço" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url"
          placeholder="https://meu-pc.tail1234.ts.net" />
        <Input label="Senha (APP_TOKEN)" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} secureTextEntry
          placeholder="a mesma do server/.env" />
        <Button title="Salvar e testar" onPress={connect} />
        {status ? <P>{status}</P> : null}
        {status?.startsWith("✅") && <Button title="Ir para o treino" variant="success" onPress={() => router.replace("/")} />}
      </Card>

      {settings && (
        <>
          <Card>
            <H2>Metas diárias</H2>
            <Row style={{ flexWrap: "wrap" }}>
              {GOAL_FIELDS.map(([k, label]) => (
                <View key={k} style={{ width: "47%" }}>
                  <Input label={label} value={settings[k] ?? ""} onChangeText={set(k)} keyboardType="decimal-pad" />
                </View>
              ))}
            </Row>
          </Card>
          <Card>
            <H2>Perfil para o coach</H2>
            <Input label="Altura (cm)" value={settings.height_cm ?? ""} onChangeText={set("height_cm")} keyboardType="number-pad" />
            <Input label="Objetivo" value={settings.objective ?? ""} onChangeText={set("objective")} multiline />
            <Input label="Observações (rotina, restrições, o que o coach deve saber)" value={settings.profile_notes ?? ""}
              onChangeText={set("profile_notes")} multiline placeholder="Ex.: treino 07h30, acordo 06h…" />
          </Card>
          <Button title="Salvar metas e perfil" onPress={saveSettings} />
        </>
      )}
    </Screen>
  );
}
