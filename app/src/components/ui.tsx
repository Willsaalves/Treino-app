import { type ReactNode } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle, RefreshControl,
} from "react-native";

export const C = {
  bg: "#0B0B0F",
  card: "#16161D",
  cardAlt: "#1E1E27",
  border: "#2A2A35",
  text: "#F2F2F5",
  muted: "#8D8D9B",
  accent: "#E63946",
  accentSoft: "#E6394622",
  green: "#2BC48A",
  greenSoft: "#2BC48A22",
  yellow: "#F4B942",
};

export function Screen({ children, refreshing, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.muted} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) { return <Text style={s.h1}>{children}</Text>; }
export function H2({ children }: { children: ReactNode }) { return <Text style={s.h2}>{children}</Text>; }
export function P({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<any> }) {
  return <Text style={[s.p, muted && { color: C.muted }, style]}>{children}</Text>;
}

export function Button({ title, onPress, variant = "primary", disabled, small, style }: {
  title: string; onPress: () => void; variant?: "primary" | "ghost" | "success" | "danger";
  disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: C.accent, ghost: C.cardAlt, success: C.green, danger: "#5A1E24" }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }, style]}
    >
      <Text style={[s.btnText, small && { fontSize: 13 }]}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4, flexShrink: 1 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={C.muted} style={[s.input, style]} {...rest} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.accent, borderColor: C.accent }]}>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: active ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );
}

export function Bar({ value, goal, color = C.accent }: { value: number; goal: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, goal ? value / goal : 0));
  return (
    <View style={s.barBg}>
      <View style={[s.barFill, { width: `${pct * 100}%`, backgroundColor: pct >= 1 ? C.green : color }]} />
    </View>
  );
}

export function Loading() {
  return <View style={{ padding: 40 }}><ActivityIndicator color={C.accent} /></View>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ borderColor: C.accent }}>
      <P>⚠️ {message}</P>
      {onRetry ? <Button title="Tentar de novo" variant="ghost" small onPress={onRetry} style={{ marginTop: 8 }} /> : null}
    </Card>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, gap: 8 },
  h1: { color: C.text, fontSize: 24, fontWeight: "800" },
  h2: { color: C.text, fontSize: 17, fontWeight: "700" },
  p: { color: C.text, fontSize: 15, lineHeight: 21 },
  label: { color: C.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  btn: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  input: { backgroundColor: C.cardAlt, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, borderWidth: 1, borderColor: C.border },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  barBg: { height: 8, borderRadius: 4, backgroundColor: C.cardAlt, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
});
