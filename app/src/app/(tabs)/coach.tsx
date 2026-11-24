import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { useFocusEffect } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { api, type CoachMsg } from "@/lib/api";
import { Button, C, Chip, ErrorBox, Loading, Row } from "@/components/ui";

const QUICK = [
  "Revise minha semana de treino e diga o que ajustar",
  "Minhas calorias estão certas pelo peso e cintura?",
  "Monte um cardápio de amanhã batendo a proteína",
  "Qual exercício está estagnado e como destravar?",
  "Compare minhas fotos e diga se estou evoluindo",
];

export default function CoachScreen() {
  const [msgs, setMsgs] = useState<CoachMsg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [photos, setPhotos] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const headerHeight = useHeaderHeight();

  const load = useCallback(async () => {
    try { setError(null); setMsgs(await api<CoachMsg[]>("/api/coach/messages")); } catch (e) { setError((e as Error).message); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const send = async (message: string) => {
    if (!message.trim() || sending) return;
    const withPhotos = photos || /foto/i.test(message);
    setText("");
    setSending(true);
    setMsgs((m) => [...(m ?? []), { id: -Date.now(), role: "user", content: message, created_at: "" }]);
    try {
      await api("/api/coach", { body: { message, includePhotos: withPhotos }, timeoutMs: 120000 });
      await load();
    } catch (e) {
      Alert.alert("Coach indisponível", (e as Error).message);
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {error ? <ErrorBox message={error} onRetry={load} /> : !msgs ? <Loading /> : (
          <>
            {msgs.length === 0 && (
              <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
                Eu leio seus treinos, peso, cintura, dieta e (se você quiser) suas fotos, e sugiro ajustes. Tente uma pergunta pronta:
              </Text>
            )}
            {msgs.map((m) => (
              <View key={m.id} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%",
                backgroundColor: m.role === "user" ? C.accent : C.card, borderRadius: 14, padding: 12,
                borderWidth: m.role === "user" ? 0 : 1, borderColor: C.border,
              }}>
                <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }} selectable>{m.content}</Text>
              </View>
            ))}
            {sending && <Text style={{ color: C.muted }}>Coach analisando seus dados…</Text>}
            {msgs.length > 0 && !sending && (
              <Pressable onPress={() => Alert.alert("Limpar conversa?", "", [
                { text: "Cancelar", style: "cancel" },
                { text: "Limpar", style: "destructive", onPress: async () => { await api("/api/coach/messages", { method: "DELETE" }); load(); } },
              ])}>
                <Text style={{ color: C.muted, textAlign: "center", fontSize: 12, marginTop: 8 }}>Limpar conversa</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: C.border, padding: 10, gap: 8, backgroundColor: C.bg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {QUICK.map((q) => <Chip key={q} label={q} onPress={() => send(q)} />)}
        </ScrollView>
        <Row>
          <Text style={{ color: C.muted, fontSize: 12 }}>Enviar fotos</Text>
          <Switch value={photos} onValueChange={setPhotos} trackColor={{ true: C.accent }} />
        </Row>
        <Row>
          <TextInput value={text} onChangeText={setText} placeholder="Pergunte ao coach…" placeholderTextColor={C.muted} multiline
            style={{ flex: 1, color: C.text, backgroundColor: C.cardAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 120, fontSize: 16 }} />
          <Button title="↑" onPress={() => send(text)} disabled={sending || !text.trim()} small />
        </Row>
      </View>
    </KeyboardAvoidingView>
  );
}
