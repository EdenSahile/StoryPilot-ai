// api/_ingest.js
//
// Source unique de vérité de la pipeline d'ingestion RAG : découpage,
// paramètres d'embedding, identifiants de vecteurs et métadonnées.
//
// Pourquoi ce module existe. Jusqu'au 2026-11-25, ces paramètres étaient
// écrits dans api/upload-doc.js uniquement, puis dupliqués dans
// scripts/reindex-docs.mjs. Deux copies divergent toujours, et c'est
// exactement ce qui a produit l'incident documenté dans le journal technique
// (session INDEX-DESYNCHRONISE) : l'index servi en production avait été
// construit avec un découpage de ~1600 caractères alors que le code annonçait
// 500, sans que rien ne le signale pendant cinq mois.
//
// Règle : tout ce qui décide de la forme d'un vecteur vit ICI, et nulle part
// ailleurs. L'UI (api/upload-doc.js) et le batch (scripts/reindex-docs.mjs)
// ne sont que deux points d'entrée de cette même pipeline.
//
// Placé dans api/ plutôt que dans src/logic/ malgré la convention de
// CLAUDE.md : ce module dépend de node:crypto et n'a aucun sens côté
// navigateur. Même raison et même préfixe que api/_cors.js. Les tests restent
// dans src/test/ (jamais colocalisés), cf. src/test/api-ingest.test.js.

import { createHash } from "node:crypto";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// ─── Paramètres de la pipeline ────────────────────────────
// Toute modification de ces valeurs rend l'index existant obsolète : il faut
// réindexer (npm run reindex:apply) et recalibrer le seuil de pertinence
// (npm run calibrate-threshold). Les métadonnées écrites plus bas enregistrent
// ces valeurs dans chaque vecteur pour que npm run check-index puisse détecter
// l'écart automatiquement.
export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 50;
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 512;
export const SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", " ", ""];

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: SEPARATORS,
});

/**
 * Découpe un texte en chunks selon les paramètres de la pipeline.
 * @param {string} text Texte extrait du document.
 * @returns {Promise<string[]>} Les chunks, dans l'ordre.
 */
export async function chunkDocument(text) {
  return splitter.splitText(text);
}

/**
 * Empreinte courte et stable du texte source d'un document.
 * Sert à détecter qu'un document a changé depuis son indexation sans avoir à
 * comparer les textes chunk par chunk. 16 caractères hexadécimaux (64 bits)
 * suffisent très largement pour une détection de changement sur un corpus de
 * cette taille, et restent lisibles dans une console.
 * @param {string} text Texte extrait du document.
 * @returns {string} Empreinte hexadécimale de 16 caractères.
 */
export function sourceHash(text) {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

/**
 * Préfixe des identifiants de vecteurs d'un document.
 * Attention : l'assainissement n'est pas injectif ("doc!.txt" et "doc?.txt"
 * donnent le même préfixe). Les appelants doivent confirmer l'appartenance via
 * metadata.filename avant toute suppression, cf. api/upload-doc.js.
 * @param {string} filename Nom du fichier tel que stocké en métadonnée.
 * @returns {string} Préfixe, terminé par "_chunk_".
 */
export function vectorIdPrefix(filename) {
  return `${filename.replace(/[^a-zA-Z0-9]/g, "_")}_chunk_`;
}

/**
 * Construit les enregistrements Pinecone d'un document.
 * @param {object} params
 * @param {string} params.filename Nom du fichier.
 * @param {string} params.text Texte source complet, pour l'empreinte.
 * @param {string[]} params.chunks Chunks issus de chunkDocument().
 * @param {number[][]} params.embeddings Embeddings, alignés sur les chunks.
 * @param {string} [params.uploadedAt] Horodatage ISO, identique pour tous les
 *   chunks d'un même document. Calculé une seule fois par défaut : un appel
 *   par chunk produisait des horodatages légèrement différents au sein d'un
 *   même document, ce qui faisait passer le document pour indexé en plusieurs
 *   fois lors des diagnostics.
 * @returns {Array<{id: string, values: number[], metadata: object}>}
 * @throws {Error} Si chunks et embeddings n'ont pas la même longueur.
 */
export function buildVectorRecords({
  filename,
  text,
  chunks,
  embeddings,
  uploadedAt = new Date().toISOString(),
}) {
  if (!Array.isArray(chunks) || !Array.isArray(embeddings)) {
    throw new Error("chunks et embeddings doivent être des tableaux.");
  }
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Désalignement chunks/embeddings : ${chunks.length} chunk(s) pour ${embeddings.length} embedding(s).`,
    );
  }

  const prefix = vectorIdPrefix(filename);
  const hash = sourceHash(text);

  return chunks.map((chunk, i) => ({
    id: `${prefix}${i}`,
    values: embeddings[i],
    metadata: {
      text: chunk,
      filename,
      chunkIndex: i,
      totalChunks: chunks.length,
      uploadedAt,
      // Identité de la pipeline qui a produit ce vecteur. Permet à
      // npm run check-index de dire si l'index a été construit par le code
      // actuel, au lieu de devoir le déduire du nombre de chunks.
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      embeddingModel: EMBEDDING_MODEL,
      sourceHash: hash,
    },
  }));
}
