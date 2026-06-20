// api/delete-doc.js
// Supprime tous les chunks d'un document depuis Pinecone

import { Pinecone } from "@pinecone-database/pinecone";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { PINECONE_API_KEY, PINECONE_INDEX_URL } = process.env;

  if (!PINECONE_API_KEY || !PINECONE_INDEX_URL) {
    return res.status(500).json({
      error: "Configuration serveur incomplète.",
    });
  }

  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: "Nom de fichier manquant." });
    }

    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const indexHost = PINECONE_INDEX_URL.replace("https://", "");
    const index = pc.index("storyforge", indexHost);

    // Pinecone deleteMany avec filtre sur metadata
    await index.deleteMany({
      filename: { $eq: filename },
    });

    console.log(`[delete] Removed all chunks for ${filename}`);

    return res.status(200).json({ success: true, filename });
  } catch (error) {
    console.error("[delete] Error:", error);
    return res.status(500).json({
      error: error.message || "Erreur lors de la suppression.",
    });
  }
}
