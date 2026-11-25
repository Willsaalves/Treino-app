import type Database from "better-sqlite3";

type Ex = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  kind: "compound" | "isolation";
  execution: string;
  mistakes: string;
  substitutes: string[];
};

export const EXERCISES: Ex[] = [
  // ---------- COSTAS ----------
  { id: "puxada-aberta", name: "Puxada alta aberta", muscle: "Costas", equipment: "Polia", kind: "compound",
    execution: "Pegada um pouco mais larga que os ombros. Peito estufado, puxe a barra até a parte de cima do peito levando os cotovelos para baixo e para trás. Suba controlando até alongar as costas.",
    mistakes: "Jogar o tronco para trás para roubar; puxar com o braço em vez do cotovelo; descer a barra atrás da nuca.",
    substitutes: ["barra-fixa", "puxada-neutra", "pullover-polia"] },
  { id: "barra-fixa", name: "Barra fixa (ou graviton)", muscle: "Costas", equipment: "Barra / máquina", kind: "compound",
    execution: "Pegada pronada na largura dos ombros ou um pouco mais. Parta do braço estendido, puxe até o queixo passar da barra, desça controlando. No graviton, use o contrapeso mínimo que permita 6–10 reps.",
    mistakes: "Meia repetição; balançar o corpo (kipping); não estender totalmente embaixo.",
    substitutes: ["puxada-aberta", "puxada-neutra"] },
  { id: "puxada-neutra", name: "Puxada pegada neutra", muscle: "Costas", equipment: "Polia (triângulo)", kind: "compound",
    execution: "Use o triângulo ou pegador neutro. Puxe até a parte de cima do peito, cotovelos rentes ao corpo, aperte as costas e volte alongando.",
    mistakes: "Inclinar demais o tronco; encolher os ombros.",
    substitutes: ["puxada-aberta", "barra-fixa"] },
  { id: "remada-curvada", name: "Remada curvada / cavalinho", muscle: "Costas", equipment: "Barra / máquina", kind: "compound",
    execution: "Tronco inclinado ~45°, coluna neutra, joelhos levemente flexionados. Puxe a barra em direção ao umbigo, cotovelos para trás, e desça controlando.",
    mistakes: "Arredondar a lombar; levantar o tronco a cada rep; carga demais.",
    substitutes: ["remada-baixa", "remada-unilateral"] },
  { id: "remada-unilateral", name: "Remada unilateral com halter", muscle: "Costas", equipment: "Halter + banco", kind: "compound",
    execution: "Mão e joelho no banco, costas retas. Puxe o halter em direção ao quadril (não ao peito) e desça alongando bem.",
    mistakes: "Girar o tronco para subir o peso; puxar para o ombro.",
    substitutes: ["remada-baixa", "remada-curvada"] },
  { id: "remada-baixa", name: "Remada baixa", muscle: "Costas", equipment: "Polia baixa", kind: "compound",
    execution: "Sentado, peito alto, puxe o triângulo até o abdômen apertando as escápulas. Volte deixando os ombros irem à frente para alongar, sem curvar a lombar.",
    mistakes: "Balançar o tronco para frente e para trás; encolher os ombros.",
    substitutes: ["remada-unilateral", "remada-curvada"] },
  { id: "pullover-polia", name: "Pullover na polia", muscle: "Costas (dorsal)", equipment: "Polia alta (barra ou corda)", kind: "isolation",
    execution: "Em pé, leve inclinação à frente, braços quase estendidos. Leve a barra em arco da altura da cabeça até as coxas, contraindo a dorsal. Volte devagar.",
    mistakes: "Dobrar o cotovelo (vira tríceps); usar o tronco para empurrar.",
    substitutes: ["puxada-neutra"] },
  { id: "encolhimento", name: "Encolhimento", muscle: "Trapézio", equipment: "Halteres / barra", kind: "isolation",
    execution: "Braços estendidos ao lado do corpo, suba os ombros em direção às orelhas, segure 1 s e desça devagar.",
    mistakes: "Girar os ombros; dobrar os cotovelos.",
    substitutes: [] },

  // ---------- PEITO ----------
  { id: "supino-inclinado-halter", name: "Supino inclinado com halter", muscle: "Peito (superior)", equipment: "Halteres + banco 30°", kind: "compound",
    execution: "Banco a 30°. Escápulas para trás e para baixo, pés firmes. Desça os halteres até a linha do peito com cotovelos ~45° do tronco e empurre unindo levemente no topo.",
    mistakes: "Banco inclinado demais (vira ombro); abrir os cotovelos a 90°; bater os halteres no topo.",
    substitutes: ["supino-inclinado-maquina", "supino-smith-inclinado"] },
  { id: "supino-reto", name: "Supino reto", muscle: "Peito", equipment: "Barra + banco", kind: "compound",
    execution: "Escápulas retraídas, leve arco natural, pés firmes. Desça a barra até a linha dos mamilos e empurre de volta.",
    mistakes: "Quicar a barra no peito; tirar o quadril do banco; cotovelos totalmente abertos.",
    substitutes: ["chest-press", "supino-reto-halter", "supino-smith"] },
  { id: "supino-reto-halter", name: "Supino reto com halteres", muscle: "Peito", equipment: "Halteres + banco", kind: "compound",
    execution: "Mesma lógica do supino reto, com mais amplitude. Desça até sentir o peito alongar e empurre.",
    mistakes: "Descer pouco; perder o controle no fim da série.",
    substitutes: ["supino-reto", "chest-press"] },
  { id: "chest-press", name: "Supino na máquina (chest press)", muscle: "Peito", equipment: "Máquina", kind: "compound",
    execution: "Ajuste o banco para os pegadores ficarem na linha do meio do peito. Empurre sem travar o cotovelo e volte devagar até alongar.",
    mistakes: "Banco alto ou baixo demais; tirar as costas do encosto.",
    substitutes: ["supino-reto", "supino-reto-halter"] },
  { id: "supino-smith", name: "Supino no Smith", muscle: "Peito", equipment: "Smith", kind: "compound",
    execution: "Posicione o banco para a barra descer na linha dos mamilos. Movimento igual ao supino reto, guiado.",
    mistakes: "Banco mal posicionado (barra desce no pescoço ou na barriga).",
    substitutes: ["supino-reto", "chest-press"] },
  { id: "supino-inclinado-maquina", name: "Supino inclinado na máquina", muscle: "Peito (superior)", equipment: "Máquina", kind: "compound",
    execution: "Ajuste o banco para os pegadores ficarem na linha da parte alta do peito. Empurre e volte controlando.",
    mistakes: "Encolher os ombros ao empurrar.",
    substitutes: ["supino-inclinado-halter", "supino-smith-inclinado"] },
  { id: "supino-smith-inclinado", name: "Supino inclinado no Smith", muscle: "Peito (superior)", equipment: "Smith + banco 30°", kind: "compound",
    execution: "Banco a 30°, barra descendo na parte alta do peito. Empurre sem travar os cotovelos.",
    mistakes: "Banco inclinado demais.",
    substitutes: ["supino-inclinado-halter", "supino-inclinado-maquina"] },
  { id: "crucifixo-polia", name: "Crucifixo na polia", muscle: "Peito", equipment: "Polias (cross)", kind: "isolation",
    execution: "Polias na altura do ombro, um pé à frente, tronco levemente inclinado. Cotovelos levemente dobrados e FIXOS. Traga as mãos em arco até se encontrarem, aperte 1 s e volte em 2–3 s até alongar. Polia baixa → cima enfatiza o peitoral superior.",
    mistakes: "Dobrar e esticar o cotovelo (vira supino); carga demais e jogar o corpo; ombros subindo.",
    substitutes: ["crossover", "crucifixo-maquina"] },
  { id: "crossover", name: "Crossover", muscle: "Peito", equipment: "Polias altas", kind: "isolation",
    execution: "Polias altas, puxe em arco para baixo e à frente até as mãos se cruzarem na altura do umbigo. Volte devagar.",
    mistakes: "Usar o peso do corpo; cotovelo mudando de ângulo.",
    substitutes: ["crucifixo-polia", "crucifixo-maquina"] },
  { id: "crucifixo-maquina", name: "Crucifixo na máquina (peck deck)", muscle: "Peito", equipment: "Máquina", kind: "isolation",
    execution: "Pegadores na altura do peito, cotovelos levemente dobrados. Feche em arco, aperte e volte alongando.",
    mistakes: "Abrir demais atrás da linha do corpo com carga alta (estressa o ombro).",
    substitutes: ["crucifixo-polia", "crossover"] },

  // ---------- OMBRO ----------
  { id: "desenvolvimento-halter", name: "Desenvolvimento com halter", muscle: "Ombro", equipment: "Halteres + banco", kind: "compound",
    execution: "Sentado, encosto quase reto. Halteres na altura das orelhas, empurre para cima sem travar e desça até ~90° de cotovelo.",
    mistakes: "Arquear muito a lombar; descer pouco.",
    substitutes: ["desenvolvimento-maquina"] },
  { id: "desenvolvimento-maquina", name: "Desenvolvimento na máquina", muscle: "Ombro", equipment: "Máquina", kind: "compound",
    execution: "Ajuste o banco para os pegadores ficarem na altura dos ombros. Empurre e volte controlando.",
    mistakes: "Tirar as costas do encosto.",
    substitutes: ["desenvolvimento-halter"] },
  { id: "elevacao-lateral", name: "Elevação lateral", muscle: "Ombro (lateral)", equipment: "Halteres", kind: "isolation",
    execution: "Tronco levemente inclinado à frente, cotovelos levemente dobrados. Suba os braços para os lados até a altura do ombro, liderando com o cotovelo. Desça em 2–3 s. É O exercício para alargar o ombro.",
    mistakes: "Balançar o corpo; subir acima do ombro encolhendo o trapézio; carga pesada demais.",
    substitutes: ["elevacao-lateral-polia", "elevacao-lateral-maquina"] },
  { id: "elevacao-lateral-polia", name: "Elevação lateral na polia", muscle: "Ombro (lateral)", equipment: "Polia baixa", kind: "isolation",
    execution: "De lado para a polia, cabo passando pela frente do corpo. Suba o braço lateralmente até o ombro e desça devagar. Tensão constante, ótimo para o fim do treino.",
    mistakes: "Inclinar o tronco para longe da polia para roubar.",
    substitutes: ["elevacao-lateral", "elevacao-lateral-maquina"] },
  { id: "elevacao-lateral-maquina", name: "Elevação lateral na máquina", muscle: "Ombro (lateral)", equipment: "Máquina", kind: "isolation",
    execution: "Ajuste o banco para o eixo da máquina ficar alinhado ao ombro. Suba até a linha do ombro e desça controlando.",
    mistakes: "Encolher os ombros.",
    substitutes: ["elevacao-lateral", "elevacao-lateral-polia"] },
  { id: "crucifixo-inverso", name: "Crucifixo inverso (posterior)", muscle: "Ombro (posterior)", equipment: "Máquina / halteres", kind: "isolation",
    execution: "No peck deck invertido ou inclinado com halteres: abra os braços para trás com cotovelos levemente dobrados, sem juntar as escápulas no fim.",
    mistakes: "Usar as costas (juntar escápulas); carga demais.",
    substitutes: ["face-pull"] },
  { id: "face-pull", name: "Face pull", muscle: "Ombro (posterior)", equipment: "Polia alta + corda", kind: "isolation",
    execution: "Polia na altura do rosto. Puxe a corda em direção à testa abrindo as mãos para os lados, cotovelos altos.",
    mistakes: "Cotovelos baixos (vira remada).",
    substitutes: ["crucifixo-inverso"] },

  // ---------- BRAÇOS ----------
  { id: "rosca-direta", name: "Rosca direta", muscle: "Bíceps", equipment: "Barra W / reta", kind: "isolation",
    execution: "Cotovelos colados ao corpo, suba a barra sem mexer o ombro e desça em 2–3 s até estender.",
    mistakes: "Balançar o tronco; cotovelo indo para frente; meia amplitude.",
    substitutes: ["rosca-scott", "rosca-martelo"] },
  { id: "rosca-martelo", name: "Rosca martelo", muscle: "Bíceps / braquial", equipment: "Halteres", kind: "isolation",
    execution: "Pegada neutra (palmas para dentro), suba alternado ou simultâneo, sem balançar.",
    mistakes: "Usar impulso.",
    substitutes: ["rosca-direta"] },
  { id: "rosca-scott", name: "Rosca Scott", muscle: "Bíceps", equipment: "Banco Scott / máquina", kind: "isolation",
    execution: "Axilas apoiadas no banco, desça até quase estender e suba sem tirar o braço do apoio.",
    mistakes: "Não descer o suficiente; tirar o cotovelo do apoio.",
    substitutes: ["rosca-direta"] },
  { id: "triceps-corda", name: "Tríceps corda", muscle: "Tríceps", equipment: "Polia alta + corda", kind: "isolation",
    execution: "Cotovelos colados ao corpo, estenda abrindo a corda no final. Volte até ~90°.",
    mistakes: "Cotovelos se mexendo; inclinar o tronco sobre a corda.",
    substitutes: ["triceps-frances", "triceps-barra"] },
  { id: "triceps-frances", name: "Tríceps francês", muscle: "Tríceps", equipment: "Halter / polia", kind: "isolation",
    execution: "Braços acima da cabeça, cotovelos apontando para frente. Desça o peso atrás da cabeça até alongar e estenda.",
    mistakes: "Abrir os cotovelos; arquear a lombar.",
    substitutes: ["triceps-corda"] },
  { id: "triceps-barra", name: "Tríceps barra (polia)", muscle: "Tríceps", equipment: "Polia alta + barra", kind: "isolation",
    execution: "Cotovelos colados, empurre a barra até estender e volte até ~90°.",
    mistakes: "Usar o peso do corpo.",
    substitutes: ["triceps-corda"] },

  // ---------- PERNAS ----------
  { id: "agachamento", name: "Agachamento livre", muscle: "Quadríceps / glúteo", equipment: "Barra", kind: "compound",
    execution: "Barra no trapézio, pés na largura dos ombros. Desça empurrando o quadril para trás e para baixo, joelhos na direção dos pés, até pelo menos a coxa paralela. Suba empurrando o chão.",
    mistakes: "Joelhos para dentro; tirar o calcanhar do chão; arredondar a lombar no fundo.",
    substitutes: ["leg-press", "hack"] },
  { id: "leg-press", name: "Leg press 45°", muscle: "Quadríceps / glúteo", equipment: "Máquina", kind: "compound",
    execution: "Pés no meio da plataforma, desça até ~90° de joelho sem tirar o quadril do banco e empurre sem travar o joelho.",
    mistakes: "Descer demais e tirar o quadril do banco; travar o joelho no topo.",
    substitutes: ["agachamento", "hack"] },
  { id: "hack", name: "Hack squat", muscle: "Quadríceps", equipment: "Máquina", kind: "compound",
    execution: "Costas apoiadas, desça controlando até ~90° ou mais e suba.",
    mistakes: "Meia amplitude.",
    substitutes: ["leg-press", "agachamento"] },
  { id: "stiff", name: "Stiff", muscle: "Posterior / glúteo", equipment: "Barra / halteres", kind: "compound",
    execution: "Joelhos levemente flexionados, leve o quadril para trás descendo a barra rente às pernas até sentir o posterior alongar. Suba contraindo glúteo.",
    mistakes: "Arredondar as costas; flexionar demais o joelho (vira terra).",
    substitutes: ["mesa-flexora"] },
  { id: "cadeira-extensora", name: "Cadeira extensora", muscle: "Quadríceps", equipment: "Máquina", kind: "isolation",
    execution: "Eixo da máquina alinhado ao joelho. Estenda, segure 1 s em cima e desça devagar.",
    mistakes: "Chutar o peso; tirar o quadril do banco.",
    substitutes: [] },
  { id: "mesa-flexora", name: "Mesa flexora", muscle: "Posterior", equipment: "Máquina", kind: "isolation",
    execution: "Quadril colado no banco, flexione os joelhos trazendo o rolo ao glúteo e desça controlando.",
    mistakes: "Levantar o quadril.",
    substitutes: ["stiff"] },
  { id: "panturrilha", name: "Panturrilha em pé", muscle: "Panturrilha", equipment: "Máquina / step", kind: "isolation",
    execution: "Desça o calcanhar até alongar bem, pause 1 s, suba na ponta do pé e segure 1 s.",
    mistakes: "Quicar; amplitude curta.",
    substitutes: [] },

  // ---------- CORE ----------
  { id: "abdominal-polia", name: "Abdominal na polia", muscle: "Abdômen", equipment: "Polia alta + corda", kind: "isolation",
    execution: "Ajoelhado, corda atrás da cabeça. Enrole o tronco levando os cotovelos em direção aos joelhos, sem mexer o quadril.",
    mistakes: "Sentar sobre os calcanhares (vira movimento de quadril).",
    substitutes: ["elevacao-pernas"] },
  { id: "prancha", name: "Prancha", muscle: "Core", equipment: "Peso corporal", kind: "isolation",
    execution: "Antebraços no chão, corpo em linha reta, contraia abdômen e glúteo. Registre em segundos no campo de reps.",
    mistakes: "Quadril caído ou empinado.",
    substitutes: [] },
  { id: "elevacao-pernas", name: "Abdominal infra (elevação de pernas)", muscle: "Abdômen", equipment: "Paralela / banco", kind: "isolation",
    execution: "Suspenso ou deitado, eleve as pernas enrolando a pelve para cima no final. Desça sem balançar.",
    mistakes: "Usar impulso; só subir a perna sem enrolar a pelve.",
    substitutes: ["abdominal-polia"] },
];

// Divisão de 5 dias combinada no chat
export const SPLIT: { weekday: number; name: string; items: [string, number, number, number][] }[] = [
  { weekday: 1, name: "Costas + bíceps", items: [
    ["puxada-aberta", 4, 8, 12], ["remada-curvada", 3, 8, 10], ["remada-unilateral", 3, 10, 12],
    ["pullover-polia", 3, 12, 15], ["rosca-direta", 3, 8, 12], ["rosca-martelo", 3, 10, 12] ] },
  { weekday: 2, name: "Peito + ombro + tríceps", items: [
    ["supino-inclinado-halter", 4, 8, 10], ["chest-press", 3, 8, 12], ["crucifixo-polia", 3, 12, 15],
    ["desenvolvimento-halter", 3, 8, 10], ["elevacao-lateral", 4, 12, 15], ["triceps-corda", 3, 10, 12] ] },
  { weekday: 3, name: "Pernas + abdômen", items: [
    ["leg-press", 4, 8, 10], ["stiff", 3, 8, 10], ["cadeira-extensora", 3, 12, 15],
    ["mesa-flexora", 3, 10, 12], ["panturrilha", 4, 12, 15], ["abdominal-polia", 3, 12, 15], ["prancha", 3, 30, 60] ] },
  { weekday: 4, name: "Costas + ombro (foco no V)", items: [
    ["barra-fixa", 4, 6, 10], ["remada-baixa", 3, 10, 12], ["puxada-neutra", 3, 10, 12],
    ["elevacao-lateral", 4, 12, 15], ["crucifixo-inverso", 3, 12, 15], ["encolhimento", 3, 10, 12] ] },
  { weekday: 5, name: "Peito + ombro + braços", items: [
    ["supino-inclinado-maquina", 3, 8, 12], ["crossover", 3, 12, 15], ["elevacao-lateral-polia", 3, 12, 15],
    ["rosca-scott", 3, 10, 12], ["triceps-frances", 3, 10, 12], ["elevacao-pernas", 3, 12, 15] ] },
];

export const MEALS: { time: string; name: string; items: string[]; protein_g: number; kcal: number }[] = [
  { time: "06:00", name: "Ao acordar", items: ["400–500 ml de água"], protein_g: 0, kcal: 0 },
  { time: "06:30", name: "Pré-treino", items: ["1 banana", "1 dose de whey com água", "Café sem açúcar (opcional)"], protein_g: 24, kcal: 230 },
  { time: "09:00", name: "Café da manhã / pós-treino", items: ["3 ovos", "2 fatias de pão integral", "1 YoPRO", "1 fruta", "Creatina 3–5 g"], protein_g: 45, kcal: 650 },
  { time: "13:00", name: "Almoço", items: ["180 g de frango", "180 g de arroz cozido", "100 g de feijão", "Salada e legumes"], protein_g: 52, kcal: 700 },
  { time: "19:30", name: "Jantar", items: ["180 g de peixe ou frango", "Arroz ou batata", "Legumes", "1 fruta"], protein_g: 45, kcal: 650 },
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  goal_kcal: "2400",
  goal_protein_g: "155",
  goal_water_ml: "3000",
  goal_sleep_h: "7.5",
  height_cm: "178",
  objective: "Recomposição corporal: ganhar massa (ombro e costas para formar o V) e reduzir a cintura.",
  profile_notes: "",
};

export function seed(db: Database.Database) {
  const upsertEx = db.prepare(`
    INSERT INTO exercises (id, name, muscle, equipment, kind, execution, mistakes, substitutes)
    VALUES (@id, @name, @muscle, @equipment, @kind, @execution, @mistakes, @substitutes)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, muscle=excluded.muscle, equipment=excluded.equipment,
      kind=excluded.kind, execution=excluded.execution, mistakes=excluded.mistakes, substitutes=excluded.substitutes`);

  const tx = db.transaction(() => {
    // A biblioteca é sempre atualizada (não apaga exercícios que você criou)
    for (const e of EXERCISES) upsertEx.run({ ...e, substitutes: JSON.stringify(e.substitutes) });

    // Divisão, dieta e metas só na primeira execução (depois são seus)
    const hasDays = (db.prepare("SELECT COUNT(*) c FROM workout_days").get() as { c: number }).c > 0;
    if (!hasDays) {
      const insDay = db.prepare("INSERT INTO workout_days (weekday, name) VALUES (?, ?)");
      const insItem = db.prepare(
        "INSERT INTO workout_items (day_id, exercise_id, sets, rep_min, rep_max, position) VALUES (?, ?, ?, ?, ?, ?)");
      for (const d of SPLIT) {
        const { lastInsertRowid } = insDay.run(d.weekday, d.name);
        d.items.forEach(([ex, sets, min, max], i) => insItem.run(lastInsertRowid, ex, sets, min, max, i));
      }
    }
    const hasMeals = (db.prepare("SELECT COUNT(*) c FROM diet_meals").get() as { c: number }).c > 0;
    if (!hasMeals) {
      const ins = db.prepare("INSERT INTO diet_meals (time, name, items, protein_g, kcal, position) VALUES (?, ?, ?, ?, ?, ?)");
      MEALS.forEach((m, i) => ins.run(m.time, m.name, JSON.stringify(m.items), m.protein_g, m.kcal, i));
    }
    const insSet = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSet.run(k, v);
  });
  tx();
}
