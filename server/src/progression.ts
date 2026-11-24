import { db } from "./db.js";

export type Suggestion = {
  weight: number | null;
  reps: number;
  reason: string;
  last: { date: string; sets: { weight: number; reps: number }[] } | null;
};

/**
 * Dupla progressão:
 * - Se na última sessão TODAS as séries prescritas bateram o topo da faixa com a mesma carga → sobe a carga
 *   (+2 kg halteres / +2,5 kg compostos / +1 kg isolados) e volta para o mínimo da faixa.
 * - Se alguma série ficou abaixo do mínimo duas sessões seguidas → reduz ~5%.
 * - Caso contrário → mesma carga, buscar +1 repetição.
 */
export function suggest(exerciseId: string, sets: number, repMin: number, repMax: number, beforeDate?: string): Suggestion {
  const ex = db.prepare("SELECT kind, equipment FROM exercises WHERE id = ?").get(exerciseId) as
    { kind: string; equipment: string } | undefined;
  // halteres costumam ir de 2 em 2 kg; barra/máquina composto +2,5; isolados +1
  const increment = ex?.equipment.toLowerCase().startsWith("halter") ? 2 : ex?.kind === "compound" ? 2.5 : 1;

  const dates = db
    .prepare(
      `SELECT DISTINCT date FROM set_logs WHERE exercise_id = ? ${beforeDate ? "AND date < ?" : ""}
       ORDER BY date DESC LIMIT 2`)
    .all(...(beforeDate ? [exerciseId, beforeDate] : [exerciseId])) as { date: string }[];

  if (dates.length === 0) {
    return { weight: null, reps: repMin, reason: "Primeira vez: escolha uma carga em que você chegue a " +
      `${repMin}–${repMax} reps deixando 1–2 no tanque.`, last: null };
  }

  const load = (date: string) =>
    db.prepare("SELECT weight, reps FROM set_logs WHERE exercise_id = ? AND date = ? ORDER BY set_number")
      .all(exerciseId, date) as { weight: number; reps: number }[];

  const last = load(dates[0].date);
  const topWeight = Math.max(...last.map((s) => s.weight));
  const working = last.filter((s) => s.weight === topWeight);

  const hitTop = working.length >= sets && working.every((s) => s.reps >= repMax);
  if (hitTop) {
    return { weight: round(topWeight + increment), reps: repMin,
      reason: `Bateu ${repMax} reps em todas as séries com ${topWeight} kg → sobe para ${round(topWeight + increment)} kg.`,
      last: { date: dates[0].date, sets: last } };
  }

  const belowMin = (arr: { weight: number; reps: number }[], w: number) =>
    arr.some((s) => s.weight === w && s.reps < repMin);
  if (dates[1] && belowMin(working, topWeight) && belowMin(load(dates[1].date), topWeight)) {
    const w = round(topWeight * 0.95);
    return { weight: w, reps: repMin,
      reason: `Ficou abaixo de ${repMin} reps duas sessões seguidas com ${topWeight} kg → reduz para ${w} kg e reconstrói.`,
      last: { date: dates[0].date, sets: last } };
  }

  const bestReps = Math.max(...working.map((s) => s.reps));
  return { weight: topWeight, reps: Math.min(bestReps + 1, repMax),
    reason: `Mantém ${topWeight} kg e tenta +1 rep nas séries até chegar a ${repMax} em todas.`,
    last: { date: dates[0].date, sets: last } };
}

function round(n: number) {
  return Math.round(n * 2) / 2; // múltiplos de 0,5 kg
}
