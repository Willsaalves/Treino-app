import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { mockApi } from "@/demo/mock";

/** Build de demonstração (preview web): tudo simulado no próprio app, sem servidor. */
export const DEMO = process.env.EXPO_PUBLIC_DEMO === "1";

// ---------------- Configuração do servidor ----------------
type Config = { url: string; token: string };
let config: Config = { url: "", token: "" };
let loaded = false;
const listeners = new Set<(c: Config) => void>();

export async function loadConfig(): Promise<Config> {
  if (DEMO) { config = { url: "demo", token: "" }; loaded = true; }
  if (!loaded) {
    const raw = await AsyncStorage.getItem("server-config");
    if (raw) config = JSON.parse(raw);
    loaded = true;
  }
  return config;
}

export async function saveConfig(next: Config) {
  config = { url: next.url.trim().replace(/\/+$/, ""), token: next.token.trim() };
  await AsyncStorage.setItem("server-config", JSON.stringify(config));
  listeners.forEach((l) => l(config));
}

export function useConfig() {
  const [state, setState] = useState<{ ready: boolean; config: Config }>({ ready: loaded, config });
  useEffect(() => {
    const l = (c: Config) => setState({ ready: true, config: c });
    listeners.add(l);
    loadConfig().then(l);
    return () => { listeners.delete(l); };
  }, []);
  return state;
}

// ---------------- Cliente HTTP ----------------
export class ApiError extends Error {}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; timeoutMs?: number } = {},
): Promise<T> {
  if (DEMO) {
    try { return (await mockApi(path, opts)) as T; } catch (e) { throw new ApiError((e as Error).message); }
  }
  const { url, token } = await loadConfig();
  if (!url) throw new ApiError("Configure o endereço do servidor em Ajustes.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  try {
    const headers: Record<string, string> = {};
    if (token) headers["x-app-token"] = token;
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(url + path, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Erro ${res.status}`);
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === "AbortError") throw new ApiError("Servidor não respondeu. O PC está ligado e o Tailscale conectado?");
    throw new ApiError("Sem conexão com o servidor. Confira o endereço em Ajustes e o Tailscale.");
  } finally {
    clearTimeout(timer);
  }
}

export function photoSource(filename: string) {
  if (DEMO) return { uri: filename };
  return { uri: `${config.url}/photos/${filename}`, headers: config.token ? { "x-app-token": config.token } : undefined };
}

// ---------------- Datas ----------------
export function isoDate(d = new Date()) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function prettyDate(date: string) {
  const d = new Date(date + "T12:00:00");
  const t = isoDate();
  const label = date === t ? "Hoje" : date === addDays(t, -1) ? "Ontem" : date === addDays(t, 1) ? "Amanhã" : WD[d.getDay()];
  return `${label}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export const WEEKDAYS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

// ---------------- Tipos da API ----------------
export type Suggestion = { weight: number | null; reps: number; reason: string; last: { date: string; sets: { weight: number; reps: number }[] } | null };
export type LoggedSet = { id: number; set_number: number; weight: number; reps: number };
export type WorkoutItem = {
  id: number; exercise_id: string; name: string; muscle: string; sets: number; rep_min: number; rep_max: number;
  notes: string | null; suggestion: Suggestion; logged: LoggedSet[];
};
export type Workout = { date: string; weekday: number; rest: boolean; name?: string; items: WorkoutItem[] };
export type Exercise = { id: string; name: string; muscle: string; equipment: string; kind: "compound" | "isolation"; execution: string; mistakes: string; substitutes: string[] };
export type ExerciseDetail = Exercise & {
  substitutesInfo: { id: string; name: string; equipment: string }[];
  history: { date: string; top_weight: number; best_reps: number; sets: number; e1rm: number }[];
};
export type Day = { id: number; weekday: number; name: string; items: { id: number; exercise_id: string; name: string; muscle: string; sets: number; rep_min: number; rep_max: number; notes: string | null }[] };
export type Meal = { id: number; time: string; name: string; items: string[]; protein_g: number; kcal: number; done?: boolean };
export type Diet = {
  date: string; meals: Meal[];
  daily: { water_ml: number; creatine: number; sleep_h: number | null; extra_protein_g: number; extra_kcal: number };
  totals: { protein_g: number; kcal: number };
  goals: { kcal: number; protein_g: number; water_ml: number; sleep_h: number };
};
export type Progress = {
  metrics: { id: number; date: string; weight: number | null; waist: number | null }[];
  weekly: { week: string; avg_weight: number | null; weigh_ins: number; waist: number | null }[];
  photos: { id: number; date: string; pose: string; filename: string }[];
};
export type CoachMsg = { id: number; role: "user" | "assistant"; content: string; created_at: string };
