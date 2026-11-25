// api/_ingest.js
//
// Source unique de vérité des paramètres de la pipeline RAG : découpage,
// embedding, identifiants de vecteurs, métadonnées, et seuil de pertinence
// côté retrieval.
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

// Longueur maximale du nom de client stocké en métadonnée puis injecté dans le
// prompt système. Volontairement court : ce champ vient du corps d'une requête
// HTTP, il est donc contrôlé par l'appelant. Le borner et interdire les sauts
// de ligne limite la surface d'injection de prompt.
export const CLIENT_NAME_MAX = 80;

// Seuil de pertinence applique par api/retrieve-context.js. Recalibre le
// 2026-11-25 apres reindexation (cf. session INDEX-DESYNCHRONISE du journal
// technique). Il vit ici parce qu'il en existait quatre copies dans le depot,
// et qu'une valeur dupliquee finit toujours par diverger de l'autre.
// Un seuil absolu est lie a un etat d'index : le recalibrer apres toute
// reindexation, via npm run calibrate-threshold.
export const RELEVANCE_THRESHOLD = 0.46;

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
 * Normalise un nom de client fourni par l'appelant.
 *
 * Le nom du client est une propriété du corpus, pas du brief : il est posé une
 * fois à l'indexation et voyage dans les métadonnées de chaque chunk. C'est ce
 * qui permet au prompt de nommer le client même quand le chunk récupéré ne le
 * mentionne pas, cas qui concernait 44% des chunks après le passage à un
 * découpage de 500 caractères et qui poussait le modèle à inventer un nom.
 *
 * Il n'est jamais déduit des documents : une déduction fausse deviendrait un
 * fait affirmé dans toutes les user stories.
 *
 * @param {unknown} valeur Nom brut, typiquement issu d'un corps de requête.
 * @returns {string|null} Nom normalisé, ou null si absent ou invalide.
 */
export function normalizeClientName(valeur) {
  if (typeof valeur !== "string") return null;
  // Les sauts de ligne et caractères de contrôle permettraient d'injecter des
  // instructions dans le prompt système : on les refuse plutôt que de les
  // nettoyer silencieusement.
  if (/[\u0000-\u001f\u007f]/.test(valeur)) return null;
  const nom = valeur.trim().replace(/\s+/g, " ");
  if (nom.length === 0 || nom.length > CLIENT_NAME_MAX) return null;
  return nom;
}

/**
 * Construit les enregistrements Pinecone d'un document.
 * @param {object} params
 * @param {string} params.filename Nom du fichier.
 * @param {string} params.text Texte source complet, pour l'empreinte.
 * @param {string[]} params.chunks Chunks issus de chunkDocument().
 * @param {number[][]} params.embeddings Embeddings, alignés sur les chunks.
 * @param {string} [params.clientName] Nom du client, stocké sur chaque chunk.
 *   Ignoré s'il ne passe pas normalizeClientName().
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
  clientName,
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
  const client = normalizeClientName(clientName);

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
      // Absent plutôt que vide : Pinecone n'accepte pas null en métadonnée, et
      // une clé absente se teste plus simplement côté lecture.
      ...(client ? { clientName: client } : {}),
    },
  }));
}
