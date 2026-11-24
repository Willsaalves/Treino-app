import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { db, getSettings, today, UPLOAD_DIR } from "./db.js";
import { suggest } from "./progression.js";
import { askCoach } from "./coach.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------- Token opcional (recomendado: suas fotos ficam aqui) ----------
const TOKEN = process.env.APP_TOKEN?.trim();
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!TOKEN || req.path === "/api/health") return next();
  if (req.header("x-app-token") === TOKEN) return next();
  res.status(401).json({ error: "Token inválido. Configure o mesmo APP_TOKEN no app (Ajustes)." });
});

const wrap = (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const weekdayOf = (date: string) => { const d = new Date(date + "T12:00:00"); return d.getDay() === 0 ? 7 : d.getDay(); };

app.get("/api/health", (_req, res) => res.json({ ok: true, auth: !!TOKEN, today: today() }));

// ======================= EXERCÍCIOS =======================
type ExRow = { id: string; name: string; muscle: string; equipment: string; kind: string; execution: string; mistakes: string; substitutes: string };
const parseEx = (e: ExRow) => ({ ...e, substitutes: JSON.parse(e.substitutes) as string[] });

app.get("/api/exercises", (req, res) => {
  const q = `%${(req.query.q as string | undefined)?.trim() ?? ""}%`;
  const rows = db.prepare("SELECT * FROM exercises WHERE name LIKE ? OR muscle LIKE ? ORDER BY muscle, name").all(q, q) as ExRow[];
  res.json(rows.map(parseEx));
});

app.get("/api/exercises/:id", (req, res) => {
  const e = db.prepare("SELECT * FROM exercises WHERE id = ?").get(req.params.id) as ExRow | undefined;
  if (!e) return res.status(404).json({ error: "Exercício não encontrado" });
  const ex = parseEx(e);
  const subs = ex.substitutes.length
    ? db.prepare(`SELECT id, name, equipment FROM exercises WHERE id IN (${ex.substitutes.map(() => "?").join(",")})`).all(...ex.substitutes)
    : [];
  const history = db.prepare(`
    SELECT date, MAX(weight) AS top_weight, MAX(reps) AS best_reps, COUNT(*) AS sets,
           ROUND(MAX(weight * (1 + reps / 30.0)), 1) AS e1rm
    FROM set_logs WHERE exercise_id = ? GROUP BY date ORDER BY date DESC LIMIT 20`).all(ex.id);
  res.json({ ...ex, substitutesInfo: subs, history });
});

app.post("/api/exercises", (req, res) => {
  const { name, muscle, equipment = "", kind = "isolation", execution = "", mistakes = "", substitutes = [] } = req.body ?? {};
  if (!name || !muscle) return res.status(400).json({ error: "name e muscle são obrigatórios" });
  const id = String(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    + "-" + crypto.randomBytes(2).toString("hex");
  db.prepare(`INSERT INTO exercises (id, name, muscle, equipment, kind, execution, mistakes, substitutes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name, muscle, equipment, kind === "compound" ? "compound" : "isolation", execution, mistakes, JSON.stringify(substitutes));
  res.status(201).json({ id });
});

// ======================= DIVISÃO / TREINO =======================
type ItemRow = { id: number; exercise_id: string; name: string; muscle: string; sets: number; rep_min: number; rep_max: number; position: number; notes: string | null };

function dayWithItems(weekday: number) {
  const day = db.prepare("SELECT * FROM workout_days WHERE weekday = ?").get(weekday) as { id: number; weekday: number; name: string } | undefined;
  if (!day) return null;
  const items = db.prepare(`
    SELECT i.id, i.exercise_id, e.name, e.muscle, i.sets, i.rep_min, i.rep_max, i.position, i.notes
    FROM workout_items i JOIN exercises e ON e.id = i.exercise_id WHERE i.day_id = ? ORDER BY i.position`).all(day.id) as ItemRow[];
  return { ...day, items };
}

app.get("/api/days", (_req, res) => {
  const days = (db.prepare("SELECT weekday FROM workout_days ORDER BY weekday").all() as { weekday: number }[])
    .map((d) => dayWithItems(d.weekday));
  res.json(days);
});

// Cria/substitui o treino de um dia da semana
app.put("/api/days/:weekday", (req, res) => {
  const weekday = Number(req.params.weekday);
  const { name, items } = req.body ?? {};
  if (!(weekday >= 1 && weekday <= 7) || !name || !Array.isArray(items))
    return res.status(400).json({ error: "weekday 1–7, name e items[] são obrigatórios" });
  const tx = db.transaction(() => {
    const existing = db.prepare("SELECT id FROM workout_days WHERE weekday = ?").get(weekday) as { id: number } | undefined;
    const dayId = existing
      ? (db.prepare("UPDATE workout_days SET name = ? WHERE id = ?").run(name, existing.id), existing.id)
      : Number(db.prepare("INSERT INTO workout_days (weekday, name) VALUES (?, ?)").run(weekday, name).lastInsertRowid);
    db.prepare("DELETE FROM workout_items WHERE day_id = ?").run(dayId);
    const ins = db.prepare("INSERT INTO workout_items (day_id, exercise_id, sets, rep_min, rep_max, position, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");
    items.forEach((it: { exercise_id: string; sets: number; rep_min: number; rep_max: number; notes?: string }, i: number) =>
      ins.run(dayId, it.exercise_id, it.sets, it.rep_min, it.rep_max, i, it.notes ?? null));
  });
  tx();
  res.json(dayWithItems(weekday));
});

app.delete("/api/days/:weekday", (req, res) => {
  db.prepare("DELETE FROM workout_days WHERE weekday = ?").run(Number(req.params.weekday));
  res.json({ ok: true });
});

// Treino de uma data (padrão: hoje) com sugestão de carga e séries já registradas
app.get("/api/workout", (req, res) => {
  const date = isDate(req.query.date) ? req.query.date : today();
  const weekday = req.query.weekday ? Number(req.query.weekday) : weekdayOf(date);
  const day = dayWithItems(weekday);
  if (!day) return res.json({ date, weekday, rest: true, items: [] });
  const logsStmt = db.prepare("SELECT id, set_number, weight, reps FROM set_logs WHERE exercise_id = ? AND date = ? ORDER BY set_number");
  res.json({
    date, weekday, rest: false, name: day.name,
    items: day.items.map((it) => ({
      ...it,
      suggestion: suggest(it.exercise_id, it.sets, it.rep_min, it.rep_max, date),
      logged: logsStmt.all(it.exercise_id, date),
    })),
  });
});

// Registra (ou corrige) uma série
app.post("/api/logs", (req, res) => {
  const { date = today(), exercise_id, set_number, weight, reps } = req.body ?? {};
  if (!isDate(date) || !exercise_id || !(set_number >= 1) || !(weight >= 0) || !(reps >= 0))
    return res.status(400).json({ error: "date, exercise_id, set_number, weight e reps são obrigatórios" });
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM set_logs WHERE date = ? AND exercise_id = ? AND set_number = ?").run(date, exercise_id, set_number);
    return db.prepare("INSERT INTO set_logs (date, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?)")
      .run(date, exercise_id, set_number, weight, reps).lastInsertRowid;
  });
  res.status(201).json({ id: Number(tx()) });
});

app.delete("/api/logs/:id", (req, res) => {
  db.prepare("DELETE FROM set_logs WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

// ======================= DIETA =======================
type MealRow = { id: number; time: string; name: string; items: string; protein_g: number; kcal: number; position: number };

app.get("/api/diet", (req, res) => {
  const date = isDate(req.query.date) ? req.query.date : today();
  const s = getSettings();
  const meals = (db.prepare("SELECT * FROM diet_meals ORDER BY position").all() as MealRow[]).map((m) => ({ ...m, items: JSON.parse(m.items) as string[] }));
  const done = new Set((db.prepare("SELECT meal_id FROM diet_checks WHERE date = ?").all(date) as { meal_id: number }[]).map((r) => r.meal_id));
  const daily = (db.prepare("SELECT * FROM daily_log WHERE date = ?").get(date) as Record<string, number> | undefined)
    ?? { date, water_ml: 0, creatine: 0, sleep_h: null, extra_protein_g: 0, extra_kcal: 0 };
  const eaten = meals.filter((m) => done.has(m.id));
  res.json({
    date,
    meals: meals.map((m) => ({ ...m, done: done.has(m.id) })),
    daily,
    totals: {
      protein_g: eaten.reduce((a, m) => a + m.protein_g, 0) + (daily.extra_protein_g ?? 0),
      kcal: eaten.reduce((a, m) => a + m.kcal, 0) + (daily.extra_kcal ?? 0),
    },
    goals: { kcal: Number(s.goal_kcal), protein_g: Number(s.goal_protein_g), water_ml: Number(s.goal_water_ml), sleep_h: Number(s.goal_sleep_h) },
  });
});

app.post("/api/diet/check", (req, res) => {
  const { date = today(), meal_id, done } = req.body ?? {};
  if (!isDate(date) || !meal_id) return res.status(400).json({ error: "date e meal_id são obrigatórios" });
  if (done) db.prepare("INSERT OR IGNORE INTO diet_checks (date, meal_id) VALUES (?, ?)").run(date, meal_id);
  else db.prepare("DELETE FROM diet_checks WHERE date = ? AND meal_id = ?").run(date, meal_id);
  res.json({ ok: true });
});

app.put("/api/diet/daily", (req, res) => {
  const { date = today(), ...patch } = req.body ?? {};
  if (!isDate(date)) return res.status(400).json({ error: "date inválida" });
  const allowed = ["water_ml", "creatine", "sleep_h", "extra_protein_g", "extra_kcal"] as const;
  db.prepare("INSERT OR IGNORE INTO daily_log (date) VALUES (?)").run(date);
  for (const k of allowed) {
    if (k in patch) db.prepare(`UPDATE daily_log SET ${k} = ? WHERE date = ?`).run(k === "creatine" ? (patch[k] ? 1 : 0) : patch[k], date);
  }
  res.json(db.prepare("SELECT * FROM daily_log WHERE date = ?").get(date));
});

// Substitui o plano alimentar inteiro
app.put("/api/diet/meals", (req, res) => {
  const meals = req.body?.meals;
  if (!Array.isArray(meals)) return res.status(400).json({ error: "meals[] obrigatório" });
  const tx = db.transaction(() => {
    const keep = meals.filter((m: { id?: number }) => m.id).map((m: { id: number }) => m.id);
    db.prepare(`DELETE FROM diet_meals ${keep.length ? `WHERE id NOT IN (${keep.map(() => "?").join(",")})` : ""}`).run(...keep);
    meals.forEach((m: { id?: number; time: string; name: string; items: string[]; protein_g: number; kcal: number }, i: number) => {
      if (m.id) db.prepare("UPDATE diet_meals SET time=?, name=?, items=?, protein_g=?, kcal=?, position=? WHERE id=?")
        .run(m.time, m.name, JSON.stringify(m.items), m.protein_g, m.kcal, i, m.id);
      else db.prepare("INSERT INTO diet_meals (time, name, items, protein_g, kcal, position) VALUES (?, ?, ?, ?, ?, ?)")
        .run(m.time, m.name, JSON.stringify(m.items), m.protein_g, m.kcal, i);
    });
  });
  tx();
  res.json({ ok: true });
});

// ======================= EVOLUÇÃO =======================
app.get("/api/progress", (_req, res) => {
  const metrics = db.prepare("SELECT * FROM body_metrics ORDER BY date DESC, id DESC LIMIT 120").all();
  // semana começando na segunda-feira
  const weekly = db.prepare(`
    SELECT date(date, 'weekday 0', '-6 days') AS week,
           ROUND(AVG(weight), 1) AS avg_weight, COUNT(weight) AS weigh_ins,
           (SELECT waist FROM body_metrics b2 WHERE b2.waist IS NOT NULL
              AND date(b2.date, 'weekday 0', '-6 days') = date(b1.date, 'weekday 0', '-6 days')
              ORDER BY b2.date DESC LIMIT 1) AS waist
    FROM body_metrics b1 GROUP BY week ORDER BY week DESC LIMIT 16`).all();
  const photos = db.prepare("SELECT * FROM photos ORDER BY date DESC, id DESC").all();
  res.json({ metrics, weekly, photos });
});

app.post("/api/metrics", (req, res) => {
  const { date = today(), weight = null, waist = null } = req.body ?? {};
  if (!isDate(date) || (weight == null && waist == null)) return res.status(400).json({ error: "Informe peso e/ou cintura" });
  const id = db.prepare("INSERT INTO body_metrics (date, weight, waist) VALUES (?, ?, ?)").run(date, weight, waist).lastInsertRowid;
  res.status(201).json({ id: Number(id) });
});

app.delete("/api/metrics/:id", (req, res) => {
  db.prepare("DELETE FROM body_metrics WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(file.originalname).toLowerCase() || ".jpg"}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|heic)$/.test(file.mimetype)),
});

app.post("/api/photos", upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Envie uma imagem (jpeg/png/webp)" });
  const date = isDate(req.body.date) ? req.body.date : today();
  const pose = ["frente", "lado", "costas"].includes(req.body.pose) ? req.body.pose : "frente";
  const id = db.prepare("INSERT INTO photos (date, pose, filename) VALUES (?, ?, ?)").run(date, pose, req.file.filename).lastInsertRowid;
  res.status(201).json({ id: Number(id), filename: req.file.filename });
});

app.delete("/api/photos/:id", (req, res) => {
  const p = db.prepare("SELECT filename FROM photos WHERE id = ?").get(Number(req.params.id)) as { filename: string } | undefined;
  if (p) { fs.rmSync(path.join(UPLOAD_DIR, p.filename), { force: true }); db.prepare("DELETE FROM photos WHERE id = ?").run(Number(req.params.id)); }
  res.json({ ok: true });
});

app.use("/photos", express.static(UPLOAD_DIR, { fallthrough: false }));

// ======================= AJUSTES =======================
app.get("/api/settings", (_req, res) => res.json(getSettings()));
app.put("/api/settings", (req, res) => {
  const up = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const [k, v] of Object.entries(req.body ?? {})) up.run(k, String(v));
  res.json(getSettings());
});

// ======================= COACH (Claude) =======================
app.get("/api/coach/messages", (_req, res) => {
  res.json(db.prepare("SELECT * FROM coach_messages ORDER BY id DESC LIMIT 50").all().reverse());
});
app.delete("/api/coach/messages", (_req, res) => {
  db.prepare("DELETE FROM coach_messages").run();
  res.json({ ok: true });
});
app.post("/api/coach", wrap(async (req, res) => {
  const { message, includePhotos = false } = req.body ?? {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "message obrigatório" });
  const reply = await askCoach(message, !!includePhotos);
  res.json({ reply });
}));

// ---------- erros ----------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Erro interno" });
});

const PORT = Number(process.env.PORT ?? 3333);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🏋️  Servidor do Treino rodando em http://0.0.0.0:${PORT}`);
  console.log(TOKEN ? "🔒 APP_TOKEN ativo" : "⚠️  Sem APP_TOKEN: qualquer aparelho na sua rede/tailnet pode acessar");
});
