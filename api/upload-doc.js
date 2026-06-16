// api/upload-doc.js
// Reçoit un fichier (PDF, DOCX, TXT), le chunk, embed via OpenAI, stocke dans Pinecone

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

// ─── Chunking ─────────────────────────────────────────────
function chunkText(text, maxTokens = 500) {
  const sentences = text
    .replace(/\n{3,}/g, "\n\n")
    .split(/(?<=[.!?])\s+|\n\n/)
    .filter((s) => s.trim().length > 10);

  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    // Approximation : 1 token ≈ 4 caractères en français
    if ((current + " " + sentence).length / 4 > maxTokens && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ─── Text extraction ──────────────────────────────────────
async function extractText(content, filename) {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "txt") {
    return Buffer.from(content, "base64").toString("utf-8");
  }

  if (ext === "pdf") {
    const buffer = Buffer.from(content, "base64");
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const buffer = Buffer.from(content, "base64");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Format non supporté : .${ext}. Utilisez PDF, DOCX ou TXT.`);
}

// ─── Handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  // Validate env
  const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_URL } = process.env;

  if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX_URL) {
    return res.status(500).json({
      error: "Configuration serveur incomplète. Vérifiez les variables d'environnement.",
    });
  }

  try {
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({
        error: "Fichier manquant. Envoyez { filename, content (base64) }.",
      });
    }

    // 1. Extract text
    console.log(`[upload] Extracting text from ${filename}...`);
    const text = await extractText(content, filename);

    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        error: "Le document est vide ou trop court pour être indexé.",
      });
    }

    // 2. Chunk
    console.log(`[upload] Chunking text (${text.length} chars)...`);
    const chunks = chunkText(text);
    console.log(`[upload] ${chunks.length} chunks created.`);

    if (chunks.length === 0) {
      return res.status(400).json({
        error: "Impossible de découper le document en chunks.",
      });
    }

    // 3. Embed via OpenAI
    console.log(`[upload] Embedding ${chunks.length} chunks via OpenAI...`);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
      dimensions: 512,
    });

    const embeddings = embeddingResponse.data.map((d) => d.embedding);

    // 4. Upsert into Pinecone
    console.log(`[upload] Upserting into Pinecone...`);
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

    // Extract host from URL
    const indexHost = PINECONE_INDEX_URL.replace("https://", "");
    const index = pc.index("storyforge", indexHost);

    const vectors = chunks.map((chunk, i) => ({
      id: `${filename.replace(/[^a-zA-Z0-9]/g, "_")}_chunk_${i}`,
      values: embeddings[i],
      metadata: {
        text: chunk,
        filename: filename,
        chunkIndex: i,
        totalChunks: chunks.length,
        uploadedAt: new Date().toISOString(),
      },
    }));

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    console.log(`[upload] ✅ ${chunks.length} chunks indexed for ${filename}`);

    return res.status(200).json({
      success: true,
      filename,
      chunks: chunks.length,
      characters: text.length,
    });
  } catch (error) {
    console.error("[upload] Error:", error);
    return res.status(500).json({
      error: error.message || "Erreur lors de l'indexation du document.",
    });
  }
}
