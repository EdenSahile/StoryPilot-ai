// scripts/probe-brief.mjs
//
// Inspecte ce que le retrieval RAG renvoie pour un brief donné, à un seuil
// donné, sans passer par l'UI ni par la génération. Lecture seule sur l'index.
//
// Sert à répondre à « qu'est-ce que Claude reçoit réellement pour ce brief ? »,
// question qui s'est posée tout au long de la session INDEX-DESYNCHRONISE et à
// laquelle il fallait jusqu'ici répondre en lisant la console Pinecone.
//
// Usage :
//   node --env-file=.env scripts/probe-brief.mjs "<brief>" [--threshold 0.45] [--topk 5] [--out chemin.json]
//   npm run probe -- "<brief>" --threshold 0.45
//
// Le seuil par défaut suit celui de api/retrieve-context.js. Le passer
// explicitement permet de tester un brief sous un ancien seuil, par exemple
// pour vérifier que la clause d'exception du prompt rattrape bien un chunk
// hors-sujet qui passerait le filtre.

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { writeFile, mkdir } from "node:fs/promises";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, RELEVANCE_THRESHOLD } from "../api/_ingest.js";

const INDEX_NAME = "storyforge";
const DEFAULT_THRESHOLD = RELEVANCE_THRESHOLD;
const DEFAULT_TOPK = 5;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i];
    else positional.push(argv[i]);
  }
  return { brief: positional[0], flags };
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) { console.error(`Variable d'environnement manquante : ${name}.`); process.exit(1); }
  return v;
}

async function main() {
  const { brief, flags } = parseArgs(process.argv.slice(2));
  if (!brief || brief.trim().length < 10) {
    console.error('Usage : node --env-file=.env scripts/probe-brief.mjs "<brief d\'au moins 10 caractères>" [--threshold 0.45] [--topk 5] [--out fichier.json]');
    process.exit(1);
  }
  const threshold = flags.threshold !== undefined ? Number(flags.threshold) : DEFAULT_THRESHOLD;
  const topK = flags.topk !== undefined ? Number(flags.topk) : DEFAULT_TOPK;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    console.error("--threshold doit être un nombre entre 0 et 1."); process.exit(1);
  }

  const openai = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  const pc = new Pinecone({ apiKey: requireEnv("PINECONE_API_KEY") });
  const index = pc.index(INDEX_NAME, requireEnv("PINECONE_INDEX_URL").replace("https://", ""));

  const emb = await openai.embeddings.create({
    model: EMBEDDING_MODEL, input: [brief], dimensions: EMBEDDING_DIMENSIONS,
  });
  const res = await index.query({ vector: emb.data[0].embedding, topK, includeMetadata: true });
  const matches = res.matches || [];

  console.log(`\nBrief   : "${brief}"`);
  console.log(`Seuil   : ${threshold}   topK : ${topK}   modele : ${EMBEDDING_MODEL}\n`);
  console.table(matches.map((m, i) => ({
    rang: i + 1,
    score: Math.round(m.score * 10000) / 100,
    retenu: m.score > threshold ? "OUI" : "non",
    document: m.metadata?.filename ?? "?",
    chunk: m.metadata?.chunkIndex ?? "?",
    client: m.metadata?.clientName ?? "(absent)",
    extrait: String(m.metadata?.text ?? "").replace(/\s+/g, " ").slice(0, 60) + "...",
  })));

  // Exactement la forme attendue par api/generate-stories.js.
  const retenus = matches
    .filter((m) => m.score > threshold)
    .map((m) => ({
      text: m.metadata.text,
      score: Math.round(m.score * 100),
      filename: m.metadata.filename,
      chunkIndex: m.metadata.chunkIndex,
    }));

  // Meme logique d'unanimite que api/retrieve-context.js : un nom n'est propose
  // que si tous les chunks retenus s'accordent. La sonde doit reproduire la
  // production, pas inventer sa propre regle, sinon elle valide autre chose.
  const nomsClients = [
    ...new Set(
      matches
        .filter((m) => m.score > threshold)
        .map((m) => m.metadata?.clientName)
        .filter((nom) => typeof nom === "string" && nom.length > 0),
    ),
  ];
  const clientName = nomsClients.length === 1 ? nomsClients[0] : null;

  console.log(`\n${retenus.length} chunk(s) retenu(s) au seuil ${threshold}.`);
  if (clientName) {
    console.log(`Nom de client transmis a la generation : "${clientName}".`);
  } else if (nomsClients.length > 1) {
    console.log(`Noms de clients divergents (${nomsClients.join(", ")}) : aucun nom transmis, repli neutre.`);
  } else {
    console.log("Aucun nom de client dans les chunks retenus : repli neutre attendu.");
  }
  if (retenus.length === 0) {
    console.log("Aucun contexte ne serait injecte : la generation serait generique (badge \"RAG non utilise\").");
  }

  const out = flags.out || `notes-techniques/probe-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await mkdir(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  await writeFile(out, JSON.stringify({ brief, threshold, topK, matchCount: matches.length, clientName, contextChunks: retenus }, null, 2));
  console.log(`Resultat ecrit dans ${out}`);
}

main().catch((e) => { console.error("Erreur pendant la sonde :", e); process.exit(1); });
