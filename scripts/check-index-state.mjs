// scripts/check-index-state.mjs
//
// Diagnostic EN LECTURE SEULE de l'index Pinecone : quand chaque document a
// été indexé pour la dernière fois, et si son jeu de chunks est cohérent.
// N'écrit jamais dans l'index, ne supprime rien.
//
// Usage : node --env-file=.env scripts/check-index-state.mjs
// (mêmes variables que l'app : PINECONE_API_KEY, PINECONE_INDEX_URL)
//
// Pourquoi ce script : le seuil de pertinence RAG (0.46, cf.
// api/retrieve-context.js) est calibré contre un état donné de l'index. Une
// réindexation change le découpage et donc les scores : la calibration du
// 2026-11-25 a mesuré une dérive de 0.11 point depuis août, soit 11 fois le
// bruit de mesure, sans que les documents sources de public/docs/ aient
// changé. Savoir quand l'index a réellement été construit est donc une
// information de calibration, pas une curiosité.

import { Pinecone } from "@pinecone-database/pinecone";
import { readFile } from "node:fs/promises";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";
import {
  chunkDocument,
  sourceHash,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
  EMBEDDING_MODEL,
} from "../api/_ingest.js";

const INDEX_NAME = "storyforge";
const FETCH_BATCH = 100;
const DOCS_DIR = "public/docs";

// Le decoupage vient de api/_ingest.js : ce script compare donc l'index a ce
// que la pipeline REELLE produirait aujourd'hui, et non a une copie de ses
// parametres qui pourrait diverger.

// Dates de référence du projet, pour situer la dernière indexation.
const REPERES = [
  { date: "2026-06-21", label: "commit fe5e958, ajout des 8 PDF dans public/docs/" },
  { date: "2026-08-25", label: "calibration du seuil (0.42 vers 0.45)" },
  { date: "2026-08-26", label: "correctifs d'indexation 511db12 / 3a9a6cd (chunks orphelins)" },
  { date: "2026-08-27", label: "correctif e45f860 (upsert avant suppression)" },
  { date: "2026-11-25", label: "recalibration en top-5" },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Variable d'environnement manquante : ${name}. Lancer avec node --env-file=.env scripts/check-index-state.mjs`,
    );
    process.exit(1);
  }
  return value;
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

async function fetchMetadata(index, ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += FETCH_BATCH) {
    const batch = ids.slice(i, i + FETCH_BATCH);
    const result = await index.fetch({ ids: batch });
    const records = result.records || {};
    for (const id of batch) {
      const meta = records[id]?.metadata;
      if (meta) out.push({ id, ...meta });
    }
  }
  return out;
}

function jour(iso) {
  return typeof iso === "string" ? iso.slice(0, 10) : "(absent)";
}

async function main() {
  const PINECONE_API_KEY = requireEnv("PINECONE_API_KEY");
  const PINECONE_INDEX_URL = requireEnv("PINECONE_INDEX_URL");

  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.index(INDEX_NAME, PINECONE_INDEX_URL.replace("https://", ""));

  const ids = await listAllIds(index);
  console.log(`\n${ids.length} vecteur(s) dans l'index "${INDEX_NAME}".`);
  if (ids.length === 0) {
    console.log("Index vide : rien à diagnostiquer.");
    return;
  }

  const records = await fetchMetadata(index, ids);

  // Regroupement par document.
  const parDoc = new Map();
  for (const r of records) {
    const nom = r.filename ?? "(filename absent)";
    if (!parDoc.has(nom)) parDoc.set(nom, []);
    parDoc.get(nom).push(r);
  }

  const lignes = [];
  for (const [filename, chunks] of parDoc) {
    const dates = [...new Set(chunks.map((c) => jour(c.uploadedAt)).filter((d) => d !== "(absent)"))];
    const declares = [...new Set(chunks.map((c) => c.totalChunks).filter((n) => n !== undefined))];
    const maxIndex = Math.max(...chunks.map((c) => Number(c.chunkIndex ?? -1)));
    const attendu = declares.length === 1 ? Number(declares[0]) : null;
    lignes.push({
      document: filename,
      "chunks présents": chunks.length,
      "totalChunks déclaré": declares.length === 1 ? declares[0] : declares.join(" / ") || "-",
      "chunkIndex max": maxIndex,
      cohérent: attendu === null ? "?" : attendu === chunks.length && maxIndex === attendu - 1 ? "oui" : "NON",
      "indexé le": dates.length === 1 ? dates[0] : dates.length === 0 ? "(absent)" : `MIXTE (${dates.join(", ")})`,
    });
  }

  lignes.sort((a, b) => String(a["indexé le"]).localeCompare(String(b["indexé le"])));
  console.log("");
  console.table(lignes);

  // --- L'index correspond-il aux documents actuels ? ---
  // Un compte de chunks coherent prouve seulement que l'index est coherent avec
  // LUI-MEME. Il ne dit rien de la question qui compte : les vecteurs stockes
  // correspondent-ils encore au contenu de public/docs/ ? On recalcule donc
  // l'extraction et le decoupage des fichiers actuels, et on verifie que le
  // texte du chunk 0 de chaque document existe toujours dans le fichier.
  console.log("\n=== Synchronisation index / documents actuels ===\n");
  const sync = [];
  for (const [filename, chunks] of parDoc) {
    const ligne = { document: filename, "chunks indexés": chunks.length };
    let texte;
    try {
      const buf = await readFile(`${DOCS_DIR}/${filename}`);
      if (filename.toLowerCase().endsWith(".pdf")) {
        const pdf = await getDocumentProxy(new Uint8Array(buf));
        texte = (await extractPdfText(pdf, { mergePages: true })).text;
      } else {
        texte = buf.toString("utf-8");
      }
    } catch {
      ligne["fichier source"] = "ABSENT de " + DOCS_DIR;
      ligne["chunks attendus"] = "-";
      ligne["client déclaré"] = "-";
      ligne["chunks retrouvés"] = "-";
      ligne["car. stockés"] = "-";
      sync.push(ligne);
      continue;
    }

    const attendus = (await chunkDocument(texte)).length;
    const norm = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
    const texteNorm = norm(texte);

    // On sonde CHAQUE chunk stocké, pas seulement le premier : un document
    // raccourci depuis l'indexation garde son début mais perd sa fin, et le
    // volume de texte stocké trahit alors sa longueur à l'époque.
    let retrouves = 0;
    let carStockes = 0;
    for (const c of chunks) {
      const t = norm(c.text);
      carStockes += t.length;
      const sonde = t.slice(0, 80);
      if (sonde.length > 0 && texteNorm.includes(sonde)) retrouves++;
    }

    ligne["fichier source"] = `${texte.length} car.`;
    // Identite de la pipeline telle que l'index la declare. Absente sur les
    // vecteurs anterieurs au 2026-11-25 : c'est precisement ce qui avait rendu
    // le diagnostic de la desynchronisation si long.
    const taillesDeclarees = [...new Set(chunks.map((c) => c.chunkSize).filter((v) => v !== undefined))];
    const hashsDeclares = [...new Set(chunks.map((c) => c.sourceHash).filter(Boolean))];
    const hashActuel = sourceHash(texte);

    ligne["chunks attendus"] = attendus;
    ligne["chunkSize déclaré"] =
      taillesDeclarees.length === 0 ? "(absent)" : taillesDeclarees.join(" / ");
    ligne["hash source"] =
      hashsDeclares.length === 0
        ? "(absent)"
        : hashsDeclares.length > 1
          ? "MIXTE"
          : hashsDeclares[0] === hashActuel
            ? "identique"
            : "DIFFERENT";
    // Nom du client, pose a l'indexation (--client) et porte par chaque chunk.
    // C'est ce qui permet au prompt de nommer le client meme quand le chunk
    // recupere ne le mentionne pas.
    const clients = [...new Set(chunks.map((c) => c.clientName).filter(Boolean))];
    ligne["client déclaré"] =
      clients.length === 0 ? "(absent)" : clients.length === 1 ? clients[0] : "MIXTE";
    ligne["chunks retrouvés"] = `${retrouves}/${chunks.length}`;
    ligne["car. stockés"] = carStockes;
    ligne["ratio stocké/source"] = (carStockes / Math.max(texte.length, 1)).toFixed(2);
    sync.push(ligne);
  }
  console.table(sync);

  const desync = sync.filter((l) => {
    const v = l["chunks retrouvés"];
    if (typeof v !== "string" || !v.includes("/")) return false;
    const [trouves, total] = v.split("/").map(Number);
    return trouves < total;
  });
  // Un ratio stocké/source nettement supérieur à 1 signifie que l'index
  // contient plus de texte que le document actuel n'en compte : le document a
  // été raccourci depuis l'indexation (le chevauchement seul ne peut pas
  // expliquer un facteur important).
  const plusVolumineux = sync.filter((l) => Number(l["ratio stocké/source"]) > 1.3);
  const ecarts = sync.filter(
    (l) => typeof l["chunks attendus"] === "number" && l["chunks attendus"] !== l["chunks indexés"],
  );
  const totalIndexes = sync.reduce((a, l) => a + l["chunks indexés"], 0);
  const totalAttendus = sync.reduce(
    (a, l) => a + (typeof l["chunks attendus"] === "number" ? l["chunks attendus"] : 0), 0,
  );

  console.log(
    `Chunks dans l'index : ${totalIndexes}. Chunks que les documents actuels produiraient : ${totalAttendus}.`,
  );
  console.log(
    `Pipeline actuelle (api/_ingest.js) : chunkSize ${CHUNK_SIZE}, chunkOverlap ${CHUNK_OVERLAP}, modele ${EMBEDDING_MODEL}.`,
  );

  const pipelinePerimee = sync.filter(
    (l) => l["chunkSize déclaré"] !== "(absent)" && String(l["chunkSize déclaré"]) !== String(CHUNK_SIZE),
  );
  const sansPipeline = sync.filter((l) => l["chunkSize déclaré"] === "(absent)");
  if (sansPipeline.length === sync.length && sync.length > 0) {
    console.log(
      "\nAucun vecteur ne declare sa pipeline : index anterieur a l'ajout de ces\n" +
        "metadonnees (2026-11-25). Le comparer au code actuel demande de deduire le\n" +
        "decoupage depuis le nombre de chunks. Une reindexation reglera ce point.",
    );
  } else if (pipelinePerimee.length > 0) {
    console.log(
      `\n${pipelinePerimee.length} document(s) declarent un chunkSize different du code actuel : ` +
        pipelinePerimee.map((l) => `${l.document} (${l["chunkSize déclaré"]})`).join(", ") + ".",
    );
  }
  if (ecarts.length > 0 || desync.length > 0) {
    console.log(
      `\n*** INDEX DESYNCHRONISE ***\n` +
        `${ecarts.length} document(s) sur ${sync.length} n'ont pas le nombre de chunks attendu` +
        (desync.length > 0
          ? `, ${desync.length} ont des chunks dont le texte est introuvable dans le fichier source`
          : "") +
        (plusVolumineux.length > 0
          ? `, et ${plusVolumineux.length} stockent nettement plus de texte que leur fichier actuel n'en contient ` +
            `(${plusVolumineux.map((l) => `${l.document} x${l["ratio stocké/source"]}`).join(", ")}), ` +
            `signe que ces documents ont été raccourcis depuis l'indexation`
          : "") +
        `.\nL'index ne reflete donc pas le contenu actuel de ${DOCS_DIR}. Toute mesure faite\n` +
        `contre cet index (scores de similarite, calibration de seuil) porte sur un corpus\n` +
        `qui n'est plus celui du depot. Reindexer, puis relancer npm run calibrate-threshold.`,
    );
  } else {
    console.log("\nIndex synchronise avec les documents actuels.");
  }

  // --- Verdict ---
  const toutesDates = records.map((r) => r.uploadedAt).filter(Boolean).sort();
  if (toutesDates.length === 0) {
    console.log(
      "\nAucun champ uploadedAt dans les métadonnées : l'index a été construit par une\n" +
        "version du code antérieure à ce champ. C'est en soi une information : il n'a pas\n" +
        "été reconstruit depuis son ajout.",
    );
    return;
  }

  const premiere = toutesDates[0];
  const derniere = toutesDates[toutesDates.length - 1];
  console.log(`\nPremière indexation observée : ${premiere}`);
  console.log(`Dernière indexation observée : ${derniere}`);

  const incoherents = lignes.filter((l) => l.cohérent === "NON");
  if (incoherents.length > 0) {
    console.log(
      `\n${incoherents.length} document(s) avec un compte de chunks incohérent : ` +
        `${incoherents.map((l) => l.document).join(", ")}.\n` +
        "Des chunks orphelins subsistent, symptôme du bug corrigé le 2026-08-26 : " +
        "l'index n'a donc pas été entièrement reconstruit depuis ce correctif.",
    );
  } else {
    console.log("\nTous les documents ont un compte de chunks cohérent (aucun orphelin détecté).");
  }

  const jourDerniere = jour(derniere);
  console.log("\n=== Situation par rapport aux repères du projet ===\n");
  for (const r of REPERES) {
    const position = jourDerniere < r.date ? "avant" : jourDerniere === r.date ? "le jour même" : "après";
    console.log(`  ${r.date}  ${r.label}\n      -> dernière indexation : ${position}`);
  }

  // Verdict generique : ce script sera rejoue a chaque incident, il ne doit pas
  // raconter l'enquete du 2026-11-25. Les reperes ci-dessus situent la date,
  // cette section ne dit que ce qui reste a faire.
  console.log("\n=== Lecture ===\n");
  const derniereCalibration = REPERES.filter((r) => /calibration/i.test(r.label))
    .map((r) => r.date)
    .sort()
    .pop();
  if (derniereCalibration && jourDerniere > derniereCalibration) {
    console.log(
      `L'index a ete reindexe (${jourDerniere}) apres la derniere calibration connue (${derniereCalibration}).\n` +
        "Un seuil absolu est lie a un etat d'index : relancer npm run calibrate-threshold.\n" +
        "Sauf si seules les metadonnees ont change (option --client par exemple) : le\n" +
        "decoupage etant alors identique, les scores le sont aussi.",
    );
  } else {
    console.log(
      `Index anterieur ou contemporain de la derniere calibration connue (${derniereCalibration}).\n` +
        "Rien a recalibrer de ce fait.",
    );
  }
}

main().catch((error) => {
  console.error("Erreur pendant le diagnostic :", error);
  process.exit(1);
});
