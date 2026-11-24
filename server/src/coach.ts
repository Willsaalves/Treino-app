import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { db, getSettings, today, UPLOAD_DIR } from "./db.js";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5";

const SYSTEM = `Você é o coach de treino e nutrição pessoal do usuário, dentro de um app que ele mesmo hospeda.
Responda em português do Brasil, direto e prático, como um bom personal: curto no celular (até ~200 palavras,
a menos que ele peça mais), com listas quando ajudar.

Regras:
- Baseie-se nos DADOS fornecidos (treinos registrados, peso, cintura, dieta). Cite números concretos.
- Para ajustar calorias: use a média semanal de peso e a cintura, não pesagens isoladas. Recomposição saudável:
  perder ~0,25–0,5% do peso por semana mantendo/subindo as cargas. Ajustes de 100–200 kcal por vez.
- Para ajustar treino: progressão de carga/reps, volume por grupo, troca de exercícios por substitutos da biblioteca.
- Quando sugerir mudanças na divisão ou na dieta, liste exatamente o que mudar (exercício, séries, reps, alimento, gramas)
  para o usuário editar no app.
- Seja honesto: se os dados forem poucos para concluir algo, diga isso.
- Você não é médico. Sintomas como dor no peito, palpitação, tontura ou dor articular forte → parar e procurar um médico.
  Não recomende remédios, hormônios nem estimulantes.`;

function avg(nums: number[]) {
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
}

export function buildContext(): string {
  const s = getSettings();
  const t = today();

  const metrics = db.prepare(
    "SELECT date, weight, waist FROM body_metrics WHERE date >= date(?, '-42 days') ORDER BY date").all(t) as
    { date: string; weight: number | null; waist: number | null }[];

  // médias semanais (últimas 6 semanas)
  const weeks: string[] = [];
  for (let w = 5; w >= 0; w--) {
    const end = new Date(t); end.setDate(end.getDate() - w * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const inWeek = metrics.filter((m) => m.date >= iso(start) && m.date <= iso(end));
    const wAvg = avg(inWeek.map((m) => m.weight).filter((x): x is number => x != null));
    const waist = inWeek.map((m) => m.waist).filter((x): x is number => x != null).at(-1) ?? null;
    if (wAvg != null || waist != null) weeks.push(`- semana até ${iso(end)}: peso médio ${wAvg ?? "—"} kg, cintura ${waist ?? "—"} cm`);
  }

  const workouts = db.prepare(`
    SELECT l.date, e.name, GROUP_CONCAT(l.weight || 'kg×' || l.reps, ', ') AS sets
    FROM set_logs l JOIN exercises e ON e.id = l.exercise_id
    WHERE l.date >= date(?, '-21 days')
    GROUP BY l.date, l.exercise_id ORDER BY l.date, e.name`).all(t) as { date: string; name: string; sets: string }[];

  const split = db.prepare(`
    SELECT d.weekday, d.name AS day, e.name, i.sets, i.rep_min, i.rep_max
    FROM workout_days d JOIN workout_items i ON i.day_id = d.id JOIN exercises e ON e.id = i.exercise_id
    ORDER BY d.weekday, i.position`).all() as { weekday: number; day: string; name: string; sets: number; rep_min: number; rep_max: number }[];
  const dayNames = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const splitTxt: string[] = [];
  let cur = -1;
  for (const r of split) {
    if (r.weekday !== cur) { splitTxt.push(`${dayNames[r.weekday]} — ${r.day}`); cur = r.weekday; }
    splitTxt.push(`  • ${r.name}: ${r.sets}×${r.rep_min}–${r.rep_max}`);
  }

  const meals = db.prepare("SELECT id, time, name, items, protein_g, kcal FROM diet_meals ORDER BY position").all() as
    { id: number; time: string; name: string; items: string; protein_g: number; kcal: number }[];
  const adherence = db.prepare(`
    SELECT d.date, COUNT(c.meal_id) AS done, IFNULL(dl.water_ml,0) AS water, IFNULL(dl.creatine,0) AS creatine, dl.sleep_h
    FROM (SELECT DISTINCT date FROM diet_checks WHERE date >= date(?, '-6 days')
          UNION SELECT date FROM daily_log WHERE date >= date(?, '-6 days')) d
    LEFT JOIN diet_checks c ON c.date = d.date
    LEFT JOIN daily_log dl ON dl.date = d.date
    GROUP BY d.date ORDER BY d.date`).all(t, t) as { date: string; done: number; water: number; creatine: number; sleep_h: number | null }[];

  return [
    `Hoje: ${t}`,
    `Altura: ${s.height_cm} cm. Objetivo: ${s.objective}`,
    s.profile_notes ? `Observações do usuário: ${s.profile_notes}` : "",
    `Metas: ${s.goal_kcal} kcal, ${s.goal_protein_g} g proteína, ${s.goal_water_ml} ml água, ${s.goal_sleep_h} h sono.`,
    "",
    "## Peso e cintura (médias semanais)",
    weeks.length ? weeks.join("\n") : "Sem registros ainda.",
    "",
    "## Divisão atual",
    splitTxt.join("\n"),
    "",
    "## Treinos registrados (últimos 21 dias)",
    workouts.length ? workouts.map((w) => `- ${w.date} ${w.name}: ${w.sets}`).join("\n") : "Nenhum registro ainda.",
    "",
    "## Plano alimentar",
    meals.map((m) => `- ${m.time} ${m.name} (~${m.protein_g} g prot, ~${m.kcal} kcal): ${JSON.parse(m.items).join(", ")}`).join("\n"),
    "",
    `## Adesão últimos 7 dias (de ${meals.length} refeições)`,
    adherence.length
      ? adherence.map((a) => `- ${a.date}: ${a.done}/${meals.length} refeições, água ${a.water} ml, creatina ${a.creatine ? "sim" : "não"}, sono ${a.sleep_h ?? "—"} h`).join("\n")
      : "Sem registros ainda.",
  ].filter((l) => l !== null).join("\n");
}

function photoBlock(filename: string): Anthropic.ImageBlockParam | null {
  const p = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(filename).toLowerCase();
  const media_type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { type: "image", source: { type: "base64", media_type, data: fs.readFileSync(p).toString("base64") } };
}

export async function askCoach(message: string, includePhotos: boolean): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no arquivo server/.env");
  }
  const client = new Anthropic();

  const history = (db.prepare("SELECT role, content FROM coach_messages ORDER BY id DESC LIMIT 12").all() as
    { role: "user" | "assistant"; content: string }[]).reverse();

  const content: Anthropic.ContentBlockParam[] = [];
  if (includePhotos) {
    const first = db.prepare("SELECT date, pose, filename FROM photos ORDER BY date ASC, id ASC LIMIT 1").get() as
      { date: string; pose: string; filename: string } | undefined;
    const latest = db.prepare("SELECT date, pose, filename FROM photos ORDER BY date DESC, id DESC LIMIT 2").all() as
      { date: string; pose: string; filename: string }[];
    const pics = [first, ...latest].filter((p, i, arr) => p && arr.findIndex((q) => q?.filename === p.filename) === i) as
      { date: string; pose: string; filename: string }[];
    for (const p of pics) {
      const img = photoBlock(p.filename);
      if (img) { content.push({ type: "text", text: `Foto de ${p.date} (${p.pose}):` }); content.push(img); }
    }
  }
  content.push({ type: "text", text: `<dados_atuais>\n${buildContext()}\n</dados_atuais>\n\n${message}` });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [...history.map((h) => ({ role: h.role, content: h.content })), { role: "user", content }],
  });

  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();

  const ins = db.prepare("INSERT INTO coach_messages (role, content) VALUES (?, ?)");
  ins.run("user", message);
  ins.run("assistant", text);
  return text;
}
