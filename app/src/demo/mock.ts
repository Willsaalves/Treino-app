/**
 * Modo demonstração: simula o servidor inteiro no próprio app (em memória),
 * com dados de exemplo. Ativado com EXPO_PUBLIC_DEMO=1 (usado no build web de preview).
 */
import seed from "./seed.json";

type Ex = (typeof seed.exercises)[number];
type Log = { id: number; date: string; exercise_id: string; set_number: number; weight: number; reps: number };

let nextId = 1000;
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => iso(new Date());
const addDays = (date: string, n: number) => { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const weekdayOf = (date: string) => { const d = new Date(date + "T12:00:00").getDay(); return d === 0 ? 7 : d; };
const mondayOf = (date: string) => addDays(date, -(weekdayOf(date) - 1));

// ---------------- Estado ----------------
const exercises: Ex[] = seed.exercises.map((e) => ({ ...e }));
let days = seed.split.map((d, i) => ({
  id: i + 1, weekday: d.weekday, name: d.name,
  items: (d.items as [string, number, number, number][]).map(([exercise_id, sets, rep_min, rep_max], j) =>
    ({ id: i * 100 + j, exercise_id, sets, rep_min, rep_max, notes: null as string | null })),
}));
let meals = seed.meals.map((m, i) => ({ id: i + 1, ...m }));
const settings: Record<string, string> = { ...seed.settings, profile_notes: "Treino às 07h30. (dados de demonstração)" };
const logs: Log[] = [];
const metrics: { id: number; date: string; weight: number | null; waist: number | null }[] = [];
const photos: { id: number; date: string; pose: string; filename: string }[] = [];
const checks = new Set<string>();
const daily: Record<string, { water_ml: number; creatine: number; sleep_h: number | null; extra_protein_g: number; extra_kcal: number }> = {};
let coach: { id: number; role: "user" | "assistant"; content: string; created_at: string }[] = [];

// ---------------- Dados de exemplo (3 semanas de treino, 5 de peso) ----------------
const START: Record<string, number> = {
  "puxada-aberta": 50, "remada-curvada": 40, "remada-unilateral": 22, "pullover-polia": 20, "rosca-direta": 20, "rosca-martelo": 12,
  "supino-inclinado-halter": 22, "chest-press": 45, "crucifixo-polia": 10, "desenvolvimento-halter": 16, "elevacao-lateral": 8, "triceps-corda": 20,
  "leg-press": 160, "stiff": 50, "cadeira-extensora": 45, "mesa-flexora": 35, "panturrilha": 60, "abdominal-polia": 30, "prancha": 0,
  "barra-fixa": 0, "remada-baixa": 50, "puxada-neutra": 50, "crucifixo-inverso": 25, "encolhimento": 24,
  "supino-inclinado-maquina": 40, "crossover": 10, "elevacao-lateral-polia": 5, "rosca-scott": 20, "triceps-frances": 14, "elevacao-pernas": 0,
};
(function generate() {
  const t = today();
  for (let back = 21; back >= 1; back--) {
    const date = addDays(t, -back);
    const day = days.find((d) => d.weekday === weekdayOf(date));
    if (!day) continue;
    const week = Math.floor((21 - back) / 7); // 0,1,2
    for (const it of day.items) {
      const base = START[it.exercise_id] ?? 20;
      const stalled = it.exercise_id === "desenvolvimento-halter"; // um exercício estagnado para o coach comentar
      const w = stalled ? base : base + week * (base >= 40 ? 2.5 : base >= 10 ? 2 : 1);
      for (let s = 1; s <= it.sets; s++) {
        const reps = it.exercise_id === "prancha" ? 40 + week * 10 : stalled ? it.rep_min - (s > 2 ? 1 : 0)
          : Math.min(it.rep_max, it.rep_min + week + (s === 1 ? 1 : 0));
        logs.push({ id: nextId++, date, exercise_id: it.exercise_id, set_number: s, weight: w, reps });
      }
    }
  }
  const weights = [79.1, 78.9, 79.0, 78.7, 78.6, 78.6, 78.4, 78.2, 78.3, 78.0, 77.9, 78.0, 77.7, 77.6, 77.6];
  const waists = [89.5, 89, 88.5, 88, 87.5];
  let k = 0;
  for (let w = 4; w >= 0; w--) {
    const mon = addDays(mondayOf(t), -7 * w);
    [0, 2, 4].forEach((off, j) => {
      const date = addDays(mon, off);
      if (date > t) return;
      metrics.push({ id: nextId++, date, weight: weights[k++] ?? null, waist: j === 0 ? waists[4 - w] : null });
    });
  }
  for (let b = 6; b >= 1; b--) {
    const date = addDays(t, -b);
    meals.forEach((m) => { if (Math.random() > 0.2) checks.add(`${date}|${m.id}`); });
    daily[date] = { water_ml: 2250 + (b % 3) * 500, creatine: b % 4 ? 1 : 0, sleep_h: [6, 6.5, 7, 7.5, 6.5, 7][b - 1], extra_protein_g: 0, extra_kcal: 0 };
  }
})();

// ---------------- Progressão (mesma lógica do servidor) ----------------
function suggest(exerciseId: string, sets: number, repMin: number, repMax: number, before: string) {
  const ex = exercises.find((e) => e.id === exerciseId);
  const inc = ex?.equipment.toLowerCase().startsWith("halter") ? 2 : ex?.kind === "compound" ? 2.5 : 1;
  const dates = [...new Set(logs.filter((l) => l.exercise_id === exerciseId && l.date < before).map((l) => l.date))].sort().reverse();
  if (!dates.length) return { weight: null, reps: repMin, reason: `Primeira vez: escolha uma carga em que você chegue a ${repMin}–${repMax} reps deixando 1–2 no tanque.`, last: null };
  const load = (d: string) => logs.filter((l) => l.exercise_id === exerciseId && l.date === d).sort((a, b) => a.set_number - b.set_number).map(({ weight, reps }) => ({ weight, reps }));
  const last = load(dates[0]);
  const top = Math.max(...last.map((s) => s.weight));
  const working = last.filter((s) => s.weight === top);
  const r = (n: number) => Math.round(n * 2) / 2;
  if (working.length >= sets && working.every((s) => s.reps >= repMax))
    return { weight: r(top + inc), reps: repMin, reason: `Bateu ${repMax} reps em todas as séries com ${top} kg → sobe para ${r(top + inc)} kg.`, last: { date: dates[0], sets: last } };
  const below = (arr: { weight: number; reps: number }[]) => arr.some((s) => s.weight === top && s.reps < repMin);
  if (dates[1] && below(working) && below(load(dates[1])))
    return { weight: r(top * 0.95), reps: repMin, reason: `Ficou abaixo de ${repMin} reps duas sessões seguidas com ${top} kg → reduz para ${r(top * 0.95)} kg e reconstrói.`, last: { date: dates[0], sets: last } };
  const best = Math.max(...working.map((s) => s.reps));
  return { weight: top, reps: Math.min(best + 1, repMax), reason: `Mantém ${top} kg e tenta +1 rep nas séries até chegar a ${repMax} em todas.`, last: { date: dates[0], sets: last } };
}

const dayView = (d: (typeof days)[number]) => ({
  ...d, items: d.items.map((i) => { const e = exercises.find((x) => x.id === i.exercise_id)!; return { ...i, name: e.name, muscle: e.muscle }; }),
});

function weekly() {
  const by = new Map<string, typeof metrics>();
  for (const m of metrics) { const w = mondayOf(m.date); by.set(w, [...(by.get(w) ?? []), m]); }
  return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([week, arr]) => {
    const ws = arr.map((m) => m.weight).filter((x): x is number => x != null);
    const waist = arr.filter((m) => m.waist != null).sort((a, b) => b.date.localeCompare(a.date))[0]?.waist ?? null;
    return { week, avg_weight: ws.length ? Math.round((ws.reduce((a, b) => a + b, 0) / ws.length) * 10) / 10 : null, weigh_ins: ws.length, waist };
  });
}

function coachReply(message: string) {
  const w = weekly().filter((x) => x.avg_weight != null);
  const d = w.length >= 2 ? w[0].avg_weight! - w[1].avg_weight! : null;
  const waist = weekly().filter((x) => x.waist != null);
  return [
    "🧪 Modo demonstração: no app de verdade, quem responde é o Claude, lendo seus dados reais.",
    "",
    `Sobre "${message.slice(0, 60)}${message.length > 60 ? "…" : ""}", com os dados de exemplo eu diria:`,
    d != null ? `• Peso médio ${d <= 0 ? "caiu" : "subiu"} ${Math.abs(d).toFixed(1).replace(".", ",")} kg na última semana (${w[0].avg_weight} kg).${d <= 0 ? " Ritmo bom para recomposição, mantenha as 2.400 kcal." : ""}` : "",
    waist.length >= 2 ? `• Cintura: ${waist[waist.length - 1].waist} → ${waist[0].waist} cm. Está funcionando.` : "",
    "• Desenvolvimento com halter está estagnado em 16 kg há 3 semanas. Troque por desenvolvimento na máquina por 4 semanas ou faça 4×6–8.",
    "• Elevação lateral e costas estão progredindo bem, continue.",
    "• Água ficou abaixo da meta na maioria dos dias: tente chegar a 3 L.",
  ].filter((l) => l !== "").join("\n");
}

// ---------------- Roteador ----------------
type Opts = { method?: string; body?: unknown; form?: FormData };

export async function mockApi(path: string, opts: Opts): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 120));
  const [p, qs] = path.split("?");
  const q = new URLSearchParams(qs ?? "");
  const method = opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET");
  const b = (opts.body ?? {}) as Record<string, any>;
  const seg = p.split("/").filter(Boolean); // ["api", ...]
  const key = `${method} /${seg.slice(0, 3).join("/")}`;

  switch (true) {
    case key === "GET /api/health": return { ok: true, auth: false, today: today() };
    case key === "GET /api/settings": return settings;
    case key === "PUT /api/settings": Object.assign(settings, Object.fromEntries(Object.entries(b).map(([k, v]) => [k, String(v)]))); return settings;

    case key === "GET /api/workout": {
      const date = q.get("date") ?? today();
      const weekday = weekdayOf(date);
      const d = days.find((x) => x.weekday === weekday);
      if (!d) return { date, weekday, rest: true, items: [] };
      return { date, weekday, rest: false, name: d.name, items: dayView(d).items.map((it) => ({
        ...it, suggestion: suggest(it.exercise_id, it.sets, it.rep_min, it.rep_max, date),
        logged: logs.filter((l) => l.exercise_id === it.exercise_id && l.date === date).sort((a, c) => a.set_number - c.set_number),
      })) };
    }
    case key === "POST /api/logs": {
      const date = b.date ?? today();
      for (let i = logs.length - 1; i >= 0; i--) if (logs[i].date === date && logs[i].exercise_id === b.exercise_id && logs[i].set_number === b.set_number) logs.splice(i, 1);
      const id = nextId++; logs.push({ id, date, exercise_id: b.exercise_id, set_number: b.set_number, weight: b.weight, reps: b.reps });
      return { id };
    }

    case key === "GET /api/days": return [...days].sort((a, c) => a.weekday - c.weekday).map(dayView);
    case method === "PUT" && seg[1] === "days": {
      const wd = Number(seg[2]);
      const items = (b.items as any[]).map((it, j) => ({ id: nextId++ + j, exercise_id: it.exercise_id, sets: it.sets, rep_min: it.rep_min, rep_max: it.rep_max, notes: null }));
      const ex = days.find((d) => d.weekday === wd);
      if (ex) { ex.name = b.name; ex.items = items; } else days.push({ id: nextId++, weekday: wd, name: b.name, items });
      return dayView(days.find((d) => d.weekday === wd)!);
    }
    case method === "DELETE" && seg[1] === "days": days = days.filter((d) => d.weekday !== Number(seg[2])); return { ok: true };

    case key === "GET /api/exercises" && seg.length === 2: {
      const s = (q.get("q") ?? "").toLowerCase();
      return exercises.filter((e) => !s || `${e.name} ${e.muscle}`.toLowerCase().includes(s));
    }
    case method === "GET" && seg[1] === "exercises": {
      const e = exercises.find((x) => x.id === seg[2]);
      if (!e) throw new Error("Exercício não encontrado");
      const byDate = new Map<string, Log[]>();
      logs.filter((l) => l.exercise_id === e.id).forEach((l) => byDate.set(l.date, [...(byDate.get(l.date) ?? []), l]));
      const history = [...byDate.entries()].sort((a, c) => c[0].localeCompare(a[0])).slice(0, 20).map(([date, ls]) => ({
        date, top_weight: Math.max(...ls.map((l) => l.weight)), best_reps: Math.max(...ls.map((l) => l.reps)), sets: ls.length,
        e1rm: Math.round(Math.max(...ls.map((l) => l.weight * (1 + l.reps / 30))) * 10) / 10,
      }));
      return { ...e, substitutesInfo: e.substitutes.map((id) => exercises.find((x) => x.id === id)).filter(Boolean)
        .map((x) => ({ id: x!.id, name: x!.name, equipment: x!.equipment })), history };
    }

    case key === "GET /api/diet": {
      const date = q.get("date") ?? today();
      const dl = daily[date] ?? { water_ml: 0, creatine: 0, sleep_h: null, extra_protein_g: 0, extra_kcal: 0 };
      const view = meals.map((m) => ({ ...m, done: checks.has(`${date}|${m.id}`) }));
      const eaten = view.filter((m) => m.done);
      return { date, meals: view, daily: dl,
        totals: { protein_g: eaten.reduce((a, m) => a + m.protein_g, 0) + dl.extra_protein_g, kcal: eaten.reduce((a, m) => a + m.kcal, 0) + dl.extra_kcal },
        goals: { kcal: Number(settings.goal_kcal), protein_g: Number(settings.goal_protein_g), water_ml: Number(settings.goal_water_ml), sleep_h: Number(settings.goal_sleep_h) } };
    }
    case key === "POST /api/diet/check": { const k = `${b.date ?? today()}|${b.meal_id}`; if (b.done) checks.add(k); else checks.delete(k); return { ok: true }; }
    case key === "PUT /api/diet/daily": {
      const date = b.date ?? today();
      const cur = daily[date] ?? { water_ml: 0, creatine: 0, sleep_h: null, extra_protein_g: 0, extra_kcal: 0 };
      for (const k of ["water_ml", "creatine", "sleep_h", "extra_protein_g", "extra_kcal"] as const)
        if (k in b) (cur as any)[k] = k === "creatine" ? (b[k] ? 1 : 0) : b[k];
      daily[date] = cur; return cur;
    }
    case key === "PUT /api/diet/meals": meals = (b.meals as any[]).map((m) => ({ ...m, id: m.id ?? nextId++ })); return { ok: true };

    case key === "GET /api/progress":
      return { metrics: [...metrics].sort((a, c) => c.date.localeCompare(a.date) || c.id - a.id), weekly: weekly(),
        photos: [...photos].sort((a, c) => c.date.localeCompare(a.date) || c.id - a.id) };
    case key === "POST /api/metrics": { const id = nextId++; metrics.push({ id, date: b.date ?? today(), weight: b.weight ?? null, waist: b.waist ?? null }); return { id }; }
    case method === "DELETE" && seg[1] === "metrics": { const i = metrics.findIndex((m) => m.id === Number(seg[2])); if (i >= 0) metrics.splice(i, 1); return { ok: true }; }
    case key === "POST /api/photos": {
      const file = opts.form?.get("photo");
      if (!(file instanceof Blob)) throw new Error("Envie uma imagem");
      const id = nextId++;
      photos.push({ id, date: String(opts.form!.get("date") ?? today()), pose: String(opts.form!.get("pose") ?? "frente"), filename: URL.createObjectURL(file) });
      return { id };
    }
    case method === "DELETE" && seg[1] === "photos": { const i = photos.findIndex((x) => x.id === Number(seg[2])); if (i >= 0) photos.splice(i, 1); return { ok: true }; }

    case key === "GET /api/coach/messages": return coach;
    case key === "DELETE /api/coach/messages": coach = []; return { ok: true };
    case key === "POST /api/coach": {
      await new Promise((r) => setTimeout(r, 900));
      const now = new Date().toISOString();
      coach.push({ id: nextId++, role: "user", content: b.message, created_at: now });
      const reply = coachReply(b.message);
      coach.push({ id: nextId++, role: "assistant", content: reply, created_at: now });
      return { reply };
    }
  }
  throw new Error(`Rota não simulada no modo demo: ${method} ${p}`);
}
