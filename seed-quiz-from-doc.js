#!/usr/bin/env node
/**
 * Bulk quiz seeder for questions defined in src/app/admin/quiz.doc
 *
 * Usage:
 *   node seed-quiz-from-doc.js [--status active|draft]
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *     (falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY if service key is missing).
 */

let SUPABASE_REST = "";
let BASE_HEADERS = {};
let QUIZ_STATUS = "draft";

const VALID_STATUSES = new Set(["draft", "active", "closed"]);

async function resolveStatus(flagStatus) {
  if (flagStatus) {
    const normalized = flagStatus.toLowerCase();
    if (VALID_STATUSES.has(normalized)) {
      return normalized;
    }
    console.warn(
      `⚠️  Ignoring invalid --status value "${flagStatus}". Please enter draft, active, or closed.`
    );
  }

  if (!process.stdin.isTTY) {
    console.warn(
      "⚠️  No interactive terminal detected. Defaulting quiz status to 'draft'."
    );
    return "draft";
  }

  const readline = await import("node:readline/promises");
  const { stdin, stdout } = process;
  const rl = readline.createInterface({ input: stdin, output: stdout });

  let status = "";
  while (!VALID_STATUSES.has(status)) {
    const answer = await rl.question(
      "Select quiz status (draft / active / closed): "
    );
    status = answer.trim().toLowerCase();
    if (!VALID_STATUSES.has(status)) {
      console.log("Please enter exactly: draft, active, or closed.");
    }
  }

  rl.close();
  return status;
}

async function loadEnvFile() {
  const fs = await import("node:fs");
  const path = await import("node:path");

  const envPath = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(
      "❌ .env.local file not found. Please create it before running this script."
    );
    process.exit(1);
  }

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim();
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

const QUIZ_DATA = [
  {
    question: "Quelle planète est la plus proche du Soleil ?",
    options: ["Mars", "Vénus", "Mercure"],
    correctIndex: 2,
  },
  {
    question: "Quelle scientifique a découvert le polonium et le radium ?",
    options: ["Lise Meitner", "Marie Curie", "Rosalind Franklin"],
    correctIndex: 1,
  },
  {
    question: "Quelle unité mesure la puissance électrique ?",
    options: ["Watt", "Volt", "Ampère"],
    correctIndex: 0,
  },
  {
    question: "Qui a inventé l’ampoule électrique ?",
    options: ["Nikola Tesla", "Thomas Edison", "Benjamin Franklin"],
    correctIndex: 1,
  },
  {
    question: "Quelle est la formule chimique de l’eau ?",
    options: ["CO₂", "H₂O", "O₂"],
    correctIndex: 1,
  },
  {
    question: "Qui a formulé la théorie de la relativité ?",
    options: ["Albert Einstein", "Isaac Newton", "Stephen Hawking"],
    correctIndex: 0,
  },
  {
    question: "Qui a découvert la pénicilline ?",
    options: ["Louis Pasteur", "Alexander Fleming", "Gregor Mendel"],
    correctIndex: 1,
  },
  {
    question: "Quel organe du corps humain consomme le plus d’énergie ?",
    options: ["Le cœur", "Le cerveau", "Le foie"],
    correctIndex: 1,
  },
  {
    question:
      "Quelle vitamine est principalement produite par la peau sous l’effet du soleil ?",
    options: ["Vitamine D", "Vitamine C", "Vitamine B12"],
    correctIndex: 0,
  },
  {
    question:
      "Quelle femme scientifique a contribué à la découverte de la structure de l’ADN ?",
    options: ["Rosalind Franklin", "Katherine Johnson", "Ada Lovelace"],
    correctIndex: 0,
  },
  {
    question:
      "Quelle est la constante de Planck, utilisée en mécanique quantique ?",
    options: ["6,626 × 10⁻³⁴ J·s", "9,81 m/s²", "3 × 10⁸ m/s"],
    correctIndex: 0,
  },
  {
    question:
      "Dans une réaction nucléaire, qu’est-ce que l’énergie libérée par la fission provient principalement de ?",
    options: [
      "De la chaleur",
      "De la perte de masse convertie en énergie",
      "De la désintégration radioactive",
    ],
    correctIndex: 1,
  },
  {
    question:
      "Quel scientifique a formulé la loi de la conservation de la masse ?",
    options: ["Lavoisier", "Dalton", "Avogadro"],
    correctIndex: 0,
  },
  {
    question:
      "Quelle invention d’Alan Turing a été cruciale pendant la Seconde Guerre mondiale ?",
    options: ["Le radar", "La machine Enigma", "Le premier ordinateur"],
    correctIndex: 1,
  },
  {
    question:
      "Dans un moteur à réaction, quel principe physique explique la poussée ?",
    options: [
      "L’effet Doppler",
      "La troisième loi de Newton",
      "La loi de Bernoulli",
    ],
    correctIndex: 1,
  },
];

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText} → ${body}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

async function upsertQuiz(question) {
  const queryUrl = `${SUPABASE_REST}/quizzes?question=eq.${encodeURIComponent(
    question
  )}&select=id`;
  const existing = await fetchJson(queryUrl, { headers: BASE_HEADERS });

  if (existing.length > 0) {
    const quizId = existing[0].id;
    await fetchJson(`${SUPABASE_REST}/quizzes?id=eq.${quizId}`, {
      method: "PATCH",
      headers: { ...BASE_HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({
        kind: "quiz",
        status: QUIZ_STATUS,
        starts_at: null,
        ends_at: null,
      }),
    });
    return quizId;
  }

  const inserted = await fetchJson(`${SUPABASE_REST}/quizzes`, {
    method: "POST",
    headers: { ...BASE_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify([
      {
        question,
        kind: "quiz",
        status: QUIZ_STATUS,
        starts_at: null,
        ends_at: null,
      },
    ]),
  });

  return inserted[0].id;
}

async function replaceOptions(quizId, options, correctIndex) {
  await fetchJson(`${SUPABASE_REST}/options?quiz_id=eq.${quizId}`, {
    method: "DELETE",
    headers: BASE_HEADERS,
  });

  const payload = options.map((text, index) => ({
    quiz_id: quizId,
    text,
    order_index: index,
    is_correct: index === correctIndex,
  }));

  await fetchJson(`${SUPABASE_REST}/options`, {
    method: "POST",
    headers: { ...BASE_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
}

async function main() {
  console.log(
    `🚀 Seeding ${QUIZ_DATA.length} quiz questions (status="${QUIZ_STATUS}")`
  );

  for (const [idx, quiz] of QUIZ_DATA.entries()) {
    try {
      console.log(`\n[${idx + 1}/${QUIZ_DATA.length}] ${quiz.question}`);
      const quizId = await upsertQuiz(quiz.question);
      await replaceOptions(quizId, quiz.options, quiz.correctIndex);
      console.log(`✅ Synced quiz ${quizId}`);
    } catch (error) {
      console.error(`❌ Failed on question: ${quiz.question}`);
      console.error(error.message || error);
      process.exitCode = 1;
      break;
    }
  }

  console.log("\nDone.");
}

async function bootstrap() {
  const ARG_STATUS_INDEX = process.argv.indexOf("--status");
  const flagStatus =
    ARG_STATUS_INDEX !== -1 && process.argv[ARG_STATUS_INDEX + 1]
      ? process.argv[ARG_STATUS_INDEX + 1]
      : null;

  await loadEnvFile();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "❌ Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
    );
    process.exit(1);
  }

  SUPABASE_REST = `${supabaseUrl}/rest/v1`;
  BASE_HEADERS = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  QUIZ_STATUS = await resolveStatus(flagStatus);

  await main();
}

bootstrap().catch((error) => {
  console.error("❌ Seeder failed:", error);
  process.exit(1);
});
