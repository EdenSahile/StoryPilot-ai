// scripts/reindex-docs.mjs
//
// Reconstruit l'index Pinecone à partir des documents de public/docs/, en
// rejouant EXACTEMENT la pipeline de api/upload-doc.js (extraction, découpage,
// embeddings, upsert, suppression des chunks orphelins).
//
// Pourquoi ce script existe : les 8 documents de la démo avaient été indexés à
// la main via l'UI le 2026-06-21, par une version du chunker jamais committée
// (logique V1 du 16 juin avec le plafond de V2, cf. session INDEX-DESYNCHRONISE
// du journal technique). L'index contenait encore 21 vecteurs là où la pipeline
// actuelle en produit 52, dont 5 documents stockés comme un vecteur unique
// couvrant tout le document. Sans script, rien ne garantissait que l'index
// corresponde au dépôt, et rien ne le vérifiait.
//
// Usage :
//   node --env-file=.env scripts/reindex-docs.mjs            → simulation, n'écrit rien
//   node --env-file=.env scripts/reindex-docs.mjs --apply    → applique
//
// Option --client "Nom du client" : inscrit ce nom dans les métadonnées de
// chaque chunk. Le prompt de génération peut alors nommer le client même quand
// le chunk récupéré ne le mentionne pas, ce qui concernait 44% des chunks et
// poussait le modèle à inventer un nom. Le nom n'est jamais déduit des
// documents : il est posé explicitement ici, ou absent.
//
// Dans les deux modes, une sauvegarde complète de l'index actuel (métadonnées
// ET vecteurs) est écrite dans notes-techniques/ avant toute modification.
// Elle permet de restaurer l'état précédent, ou de rejouer un cas de
// reproduction historique contre l'ancien index.
//
// Après application : npm run check-index puis npm run calibrate-threshold.
// Le seuil de pertinence (0.45 dans api/retrieve-context.js) a été calibré
// contre l'ancien index : il doit être rediscuté, pas repris tel quel.

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";
import {
  chunkDocument,
  buildVectorRecords,
  vectorIdPrefix,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  RELEVANCE_THRESHOLD,
} from "../api/_ingest.js";

const INDEX_NAME = "storyforge";
const DOCS_DIR = "public/docs";
// Surchargeable pour tester le script sans ecrire dans le depot.
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR || "notes-techniques";
const FETCH_BATCH = 100;
const UPSERT_BATCH = 100;

// Découpage, paramètres d'embedding et métadonnées : importés de
// api/_ingest.js, le même module que celui utilisé par l'upload de l'UI. Ce
// script ne peut donc pas produire un index différent de ce que produirait un
// upload manuel, qui était exactement le problème à résoudre.

const APPLY = process.argv.includes("--apply");
const iClient = process.argv.indexOf("--client");
const CLIENT_NAME = iClient !== -1 ? process.argv[iClient + 1] : undefined;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable d'environnement manquante : ${name}.`);
    process.exit(1);
  }
  return value;
}

async function extractDocText(path, filename) {
  const buf = await readFile(path);
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    return (await extractPdfText(pdf, { mergePages: true })).text;
  }
  if (ext === "txt") return buf.toString("utf-8");
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  throw new Error(`Format non supporté : .${ext}`);
}

async function listAllIds(index) {
  const ids = [];
  let paginationToken;
  do {
    const params = { limit: FETCH_BATCH };
    if (paginationToken) params.paginationToken = paginationToken;
    const result = await index.listPaginated(params);
    ids.push(...(result.vectors || []).map((v) => v.id));
    paginationToken = result.pagination?.next;
  } while (paginationToken);
  return ids;
}

async function fetchAll(index, ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += FETCH_BATCH) {
    const result = await index.fetch({ ids: ids.slice(i, i + FETCH_BATCH) });
    Object.assign(out, result.records || {});
  }
  return out;
}

async function main() {
  const OPENAI_API_KEY = requireEnv("OPENAI_API_KEY");
  const PINECONE_API_KEY = requireEnv("PINECONE_API_KEY");
  const PINECONE_INDEX_URL = requireEnv("PINECONE_INDEX_URL");

  console.log(APPLY ? "\nMODE APPLIQUE : l'index va etre modifie.\n" : "\nMODE SIMULATION : aucune ecriture. Ajouter --apply pour appliquer.\n");
  if (CLIENT_NAME) console.log(`Nom de client inscrit dans les metadonnees : "${CLIENT_NAME}"\n`);

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.index(INDEX_NAME, PINECONE_INDEX_URL.replace("https://", ""));

  // --- 1. Sauvegarde de l'etat actuel, avant toute modification ---
  const idsAvant = await listAllIds(index);
  const recordsAvant = await fetchAll(index, idsAvant);
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = `${SNAPSHOT_DIR}/index-snapshot-${horodatage}.json`;
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  await writeFile(
    snapshotPath,
    JSON.stringify(
      { index: INDEX_NAME, capturedAt: new Date().toISOString(), vectorCount: idsAvant.length, records: recordsAvant },
      null,
      2,
    ),
  );
  console.log(`Sauvegarde de ${idsAvant.length} vecteur(s) ecrite dans ${snapshotPath}`);

  // Repartition actuelle, par document.
  const avantParDoc = new Map();
  for (const rec of Object.values(recordsAvant)) {
    const nom = rec.metadata?.filename ?? "(inconnu)";
    avantParDoc.set(nom, (avantParDoc.get(nom) ?? 0) + 1);
  }

  // --- 2. Recalcul de ce que les documents actuels produisent ---
  const fichiers = (await readdir(DOCS_DIR))
    .filter((f) => /\.(pdf|txt|docx)$/i.test(f))
    .sort();

  if (fichiers.length === 0) {
    console.error(`Aucun document exploitable dans ${DOCS_DIR}.`);
    process.exit(1);
  }

  const plan = [];
  for (const filename of fichiers) {
    const texte = await extractDocText(`${DOCS_DIR}/${filename}`, filename);
    if (!texte || texte.trim().length < 50) {
      console.warn(`  ${filename} : texte trop court, ignore (meme regle que upload-doc.js).`);
      continue;
    }
    const chunks = await chunkDocument(texte);
    plan.push({ filename, texte, chunks });
  }

  console.log("");
  console.table(
    plan.map((p) => ({
      document: p.filename,
      "car. extraits": p.texte.length,
      "chunks actuels": avantParDoc.get(p.filename) ?? 0,
      "chunks apres": p.chunks.length,
      delta: p.chunks.length - (avantParDoc.get(p.filename) ?? 0),
    })),
  );

  const totalApres = plan.reduce((a, p) => a + p.chunks.length, 0);
  console.log(`Total : ${idsAvant.length} vecteur(s) actuellement, ${totalApres} apres reindexation.`);

  // Documents presents dans l'index mais plus dans public/docs : signales, jamais supprimes.
  const connus = new Set(plan.map((p) => p.filename));
  const orphelinsDoc = [...avantParDoc.keys()].filter((n) => !connus.has(n));
  if (orphelinsDoc.length > 0) {
    console.log(
      `\nAttention : ${orphelinsDoc.length} document(s) presents dans l'index mais absents de ${DOCS_DIR} ` +
        `(${orphelinsDoc.join(", ")}). Ce script ne les touche pas : a traiter a la main si besoin.`,
    );
  }

  if (!APPLY) {
    console.log("\nSimulation terminee. Rien n'a ete ecrit dans l'index.");
    console.log("Pour appliquer : node --env-file=.env scripts/reindex-docs.mjs --apply");
    return;
  }

  // --- 3. Application, document par document ---
  for (const { filename, texte, chunks } of plan) {
    console.log(`\n[${filename}] ${chunks.length} chunk(s)`);

    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: chunks,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    const embeddings = embeddingResponse.data.map((d) => d.embedding);

    // Memes identifiants et meme logique anti-orphelins que api/upload-doc.js :
    // on releve les ids existants de CE document, on upsert, puis on supprime
    // seulement ceux que le nouveau contenu ne reutilise pas.
    const prefix = vectorIdPrefix(filename);
    const candidats = idsAvant.filter((id) => id.startsWith(prefix));
    const existants = candidats.filter((id) => recordsAvant[id]?.metadata?.filename === filename);

    const vectors = buildVectorRecords({ filename, text: texte, chunks, embeddings, clientName: CLIENT_NAME });

    for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
      await index.upsert({ records: vectors.slice(i, i + UPSERT_BATCH) });
    }
    console.log(`  upsert OK (${vectors.length})`);

    const nouveaux = new Set(vectors.map((v) => v.id));
    const aSupprimer = existants.filter((id) => !nouveaux.has(id));
    if (aSupprimer.length > 0) {
      await index.deleteMany({ ids: aSupprimer });
      console.log(`  ${aSupprimer.length} chunk(s) orphelin(s) supprime(s)`);
    }
  }

  console.log("\nReindexation terminee.");
  console.log("Verifier avec : npm run check-index  (doit annoncer index synchronise)");
  console.log("Puis recalibrer : npm run calibrate-threshold");
  console.log(
    `Si le decoupage a change, le seuil ${RELEVANCE_THRESHOLD} a ete calibre contre l'ancien index : le rediscuter.\n` +
      "Si seules les metadonnees ont change (option --client par exemple), les scores sont inchanges.",
  );
}

main().catch((error) => {
  console.error("Erreur pendant la reindexation :", error);
  process.exit(1);
});
