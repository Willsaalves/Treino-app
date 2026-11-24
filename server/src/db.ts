import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seed } from "./seed.js";

export const DATA_DIR = process.env.DATA_DIR ?? path.resolve("data");
export const UPLOAD_DIR = path.join(DATA_DIR, "photos");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "treino.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle TEXT NOT NULL,
  equipment TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('compound','isolation')),
  execution TEXT NOT NULL,
  mistakes TEXT NOT NULL,
  substitutes TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS workout_days (
  id INTEGER PRIMARY KEY,
  weekday INTEGER NOT NULL UNIQUE,      -- 1=seg ... 7=dom
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workout_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  sets INTEGER NOT NULL,
  rep_min INTEGER NOT NULL,
  rep_max INTEGER NOT NULL,
  position INTEGER NOT NULL,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS set_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  weight REAL NOT NULL,
  reps INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_set_logs_ex_date ON set_logs(exercise_id, date);
CREATE TABLE IF NOT EXISTS body_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  weight REAL,
  waist REAL
);
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  pose TEXT NOT NULL DEFAULT 'frente',
  filename TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS diet_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL,
  name TEXT NOT NULL,
  items TEXT NOT NULL,                 -- JSON string[]
  protein_g INTEGER NOT NULL DEFAULT 0,
  kcal INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS diet_checks (
  date TEXT NOT NULL,
  meal_id INTEGER NOT NULL REFERENCES diet_meals(id) ON DELETE CASCADE,
  PRIMARY KEY (date, meal_id)
);
CREATE TABLE IF NOT EXISTS daily_log (
  date TEXT PRIMARY KEY,
  water_ml INTEGER NOT NULL DEFAULT 0,
  creatine INTEGER NOT NULL DEFAULT 0,
  sleep_h REAL,
  extra_protein_g INTEGER NOT NULL DEFAULT 0,
  extra_kcal INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coach_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

seed(db);

export function getSettings(): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function today(): string {
  // Data local (YYYY-MM-DD) no fuso da máquina
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
