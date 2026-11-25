// api/retrieve-context.js
// Embed le brief → recherche Pinecone → retourne les chunks pertinents

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { applyCors } from "./_cors.js";
import { RELEVANCE_THRESHOLD } from "./_ingest.js";

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: "POST, OPTIONS" })) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_URL } = process.env;

  if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX_URL) {
    return res.status(500).json({
      error: "Configuration serveur incomplète.",
    });
  }

  try {
    const { brief, topK = 5 } = req.body;

    if (!brief || brief.trim().length < 10) {
      return res.status(400).json({
        error: "Brief trop court pour la recherche contextuelle.",
      });
    }

    if (
      req.body.topK !== undefined &&
      (typeof req.body.topK !== "number" ||
        !Number.isInteger(req.body.topK) ||
        req.body.topK < 1 ||
        req.body.topK > 20)
    ) {
      return res.status(400).json({
        error: "topK doit être un entier entre 1 et 20.",
      });
    }

    // 1. Embed the brief
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: [brief],
      dimensions: 512,
    });

    const briefVector = embeddingResponse.data[0].embedding;

    // 2. Query Pinecone
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const indexHost = PINECONE_INDEX_URL.replace("https://", "");
    const index = pc.index("storyforge", indexHost);

    const queryResponse = await index.query({
      vector: briefVector,
      topK: topK,
      includeMetadata: true,
    });

    // 3. Format results
    const chunks = queryResponse.matches
      // Seuil minimal de pertinence, recalibré le 2026-11-25 après la
      // réindexation complète de l'index (21 vers 52 vecteurs, cf. session
      // INDEX-DESYNCHRONISE du journal technique), via
      // scripts/calibrate-threshold.mjs sur 21 briefs pré-étiquetés :
      // sépare les pertinents (min observé 46.93%) des hors-sujet (max
      // observé 45.24%, brief "essayer virtuellement des vêtements"). Le cas
      // de reproduction original "téléphone" de PR #78 score 44.36%, soit
      // 1.64 pt sous le seuil. L'ancien 0.45, calibré avant réindexation,
      // laissait passer le brief "vêtements" (45.24% > 0.45).
      // Un seuil absolu est lié à un état d'index : recalibrer après TOUTE
      // réindexation, pas seulement quand public/docs/ change.
      .filter((match) => match.score > RELEVANCE_THRESHOLD)
      .map((match) => ({
        text: match.metadata.text,
        score: Math.round(match.score * 100),
        filename: match.metadata.filename,
        chunkIndex: match.metadata.chunkIndex,
      }));

    // Nom du client, lu dans les metadonnees des chunks retenus. Renvoye
    // uniquement si tous s'accordent : des chunks de clients differents, cas
    // possible le jour ou l'index sera multi-tenant, ne doivent pas produire un
    // nom arbitraire. Absent, la generation retombe sur une formulation neutre.
    const nomsClients = [
      ...new Set(
        queryResponse.matches
          .filter((match) => match.score > RELEVANCE_THRESHOLD)
          .map((match) => match.metadata?.clientName)
          .filter((nom) => typeof nom === "string" && nom.length > 0),
      ),
    ];
    const clientName = nomsClients.length === 1 ? nomsClients[0] : null;

    return res.status(200).json({
      success: true,
      chunks,
      clientName,
      totalMatches: queryResponse.matches.length,
    });
  } catch (error) {
    console.error("[retrieve] Error:", error);
    return res.status(500).json({
      error: "Erreur lors de la recherche contextuelle.",
    });
  }
}
