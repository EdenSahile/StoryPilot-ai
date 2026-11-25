// scripts/calibrate-threshold.mjs
//
// Script autonome de calibration du seuil de pertinence RAG (0.45 en dur dans
// api/retrieve-context.js, filtre sur match.score). N'est jamais appelé par l'app — exécuté
// à la main, pour recalibrer si de nouveaux documents sont ajoutés à
// public/docs/ ou si le seuil actuel est remis en question.
//
// Usage : node --env-file=.env scripts/calibrate-threshold.mjs
// (nécessite les mêmes variables d'environnement que l'app : OPENAI_API_KEY,
// PINECONE_API_KEY, PINECONE_INDEX_URL — cf. .env.example)
//
// Méthode : embedde chaque brief de test avec les mêmes paramètres que
// api/retrieve-context.js (modèle, dimensions), interroge Pinecone avec un
// topK élevé et SANS filtrer par score (pour voir la distribution complète,
// pas seulement ce qui passerait déjà le seuil actuel), puis compare la
// distribution des meilleurs scores entre briefs pertinents et hors-sujet.
//
// Mesure aussi le cout du seuil : pour chaque brief pertinent, combien de
// chunks le filtre retient dans la fenetre reelle de production (topK=5),
// sous le seuil actuel contre le seuil precedent. Un seuil trop haut ne se
// voit pas dans la separation des groupes, il se voit dans le contexte perdu
// cote pertinent.

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// Mêmes paramètres que api/retrieve-context.js — garder synchronisé.
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 512;
const QUERY_TOP_K = 20;

// Seuil de pertinence applique en production : garder synchronise avec
// api/retrieve-context.js (filtre sur match.score). Centralise ici pour que
// le script ne puisse plus afficher un seuil different de celui du code.
const CURRENT_THRESHOLD = 0.46;
// Seuil precedent, conserve pour mesurer ce que son relevement a coute.
const PREVIOUS_THRESHOLD = 0.45;
// topK reellement utilise par api/retrieve-context.js : c'est la fenetre dans
// laquelle le filtre de score s'applique en production. Mesurer le filtre sur
// une fenetre plus courte sous-estime le contexte perdu.
const PRODUCTION_TOP_K = 5;

// Étiquettes décidées à l'avance, avant tout appel — pas déduites après coup.
// On-topic : inspirés du contenu réel des 8 documents indexés dans
// public/docs/ (choix produit/couleur, livraison, retours, paiement Alma,
// SAV, programme fidélité Lumeo+, catalogue, facturation, fournisseurs).
// Off-topic : catégories sans aucun rapport avec Lumeo Boutique (déco/
// luminaires), volontairement variées pour ne pas biaiser vers une seule
// thématique hors-sujet.
const TEST_BRIEFS = [
  // --- On-topic (10) ---
  { label: "on-topic", text: "Je veux pouvoir choisir la couleur de ma suspension avant de l'ajouter au panier." },
  { label: "on-topic", text: "Je veux voir le délai de livraison estimé avant de valider ma commande de luminaires." },
  { label: "on-topic", text: "Je veux pouvoir payer ma commande en plusieurs fois via Alma." },
  { label: "on-topic", text: "Je veux retourner un article dans les 14 jours si je ne suis pas satisfait du produit reçu." },
  { label: "on-topic", text: "Je veux contacter le service client si mon luminaire arrive endommagé à la livraison." },
  { label: "on-topic", text: "Je veux suivre l'avancement d'une livraison de mobilier volumineux prévue sur rendez-vous." },
  { label: "on-topic", text: "Je veux consulter mon solde de cashback dans le programme de fidélité Lumeo+." },
  { label: "on-topic", text: "Je veux comparer les suspensions et lampes à poser disponibles par fournisseur et par prix." },
  { label: "on-topic", text: "Je veux recevoir une facture téléchargeable après chaque commande passée sur le site." },
  { label: "on-topic", text: "Je veux vérifier qu'un fournisseur respecte la charte qualité avant d'être référencé au catalogue." },

  // --- Off-topic (10), catégories variées ---
  { label: "off-topic", text: "Je veux réserver une table dans un restaurant proche de chez moi pour ce soir." },
  { label: "off-topic", text: "Je veux suivre mes calories quotidiennes dans une application de fitness." },
  { label: "off-topic", text: "Je veux réserver un vol pour mes prochaines vacances d'été." },
  { label: "off-topic", text: "Je veux consulter le solde de mon compte bancaire et faire un virement." },
  { label: "off-topic", text: "Je veux acheter une nouvelle carte graphique pour mon ordinateur de bureau." },
  { label: "off-topic", text: "Je veux essayer virtuellement des vêtements avant de les commander en ligne." },
  { label: "off-topic", text: "Je veux planifier l'entretien annuel de ma voiture chez le garagiste." },
  { label: "off-topic", text: "Je veux suivre l'évolution du prix de l'immobilier dans mon quartier." },
  { label: "off-topic", text: "Je veux apprendre une nouvelle langue avec des leçons quotidiennes personnalisées." },
  { label: "off-topic", text: "Je veux sauvegarder ma progression dans un jeu vidéo en ligne." },
  // Cas de reproduction original (PR #78) : ce brief exact a fait inventer au
  // modèle que Lumeo Boutique vend des téléphones (faux prix, faux cashback
  // Lumeo+), un seul chunk FAQ à 43% ayant passé le seuil 0.42 d'alors. Gardé
  // en permanence dans l'échantillon, pas juste un test ponctuel, pour que
  // toute recalibration future revérifie explicitement ce cas précis.
  { label: "off-topic", text: "Je souhaite pouvoir choisir la couleur de mon téléphone" },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable d'environnement manquante : ${name}. Lancer avec node --env-file=.env scripts/calibrate-threshold.mjs`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const OPENAI_API_KEY = requireEnv("OPENAI_API_KEY");
  const PINECONE_API_KEY = requireEnv("PINECONE_API_KEY");
  const PINECONE_INDEX_URL = requireEnv("PINECONE_INDEX_URL");

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const indexHost = PINECONE_INDEX_URL.replace("https://", "");
  const index = pc.index("storyforge", indexHost);

  const results = [];

  for (const brief of TEST_BRIEFS) {
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: [brief.text],
      dimensions: EMBEDDING_DIMENSIONS,
    });
    const vector = embeddingResponse.data[0].embedding;

    const queryResponse = await index.query({
      vector,
      topK: QUERY_TOP_K,
      includeMetadata: true,
    });

    const matches = queryResponse.matches || [];
    const topN = matches.slice(0, PRODUCTION_TOP_K).map((m) => ({
      score: Math.round(m.score * 10000) / 100, // pourcentage, 2 décimales
      filename: m.metadata?.filename ?? "?",
    }));

    // Nombre de chunks que le filtre retiendrait sous un seuil donne, dans la
    // fenetre de production. Comparaison des scores en 0-1, comme le code.
    const keptAt = (threshold) =>
      topN.filter((c) => c.score / 100 > threshold).length;

    results.push({
      label: brief.label,
      brief: brief.text,
      topScore: topN[0]?.score ?? 0,
      topN,
      keptPrevious: keptAt(PREVIOUS_THRESHOLD),
      keptCurrent: keptAt(CURRENT_THRESHOLD),
    });

    console.log(
      `[${brief.label}] "${brief.text.slice(0, 60)}${brief.text.length > 60 ? "..." : ""}" → meilleur score: ${topN[0]?.score ?? "N/A"}% (${topN[0]?.filename ?? "?"}), chunks retenus : ${keptAt(PREVIOUS_THRESHOLD)} à ${PREVIOUS_THRESHOLD} / ${keptAt(CURRENT_THRESHOLD)} à ${CURRENT_THRESHOLD}`,
    );
  }

  // --- Tableau détaillé ---
  console.log(
    `\n=== Détail par brief (fenêtre de production, topK=${PRODUCTION_TOP_K}) ===\n`,
  );
  console.table(
    results.map((r) => ({
      label: r.label,
      brief: r.brief.slice(0, 50) + (r.brief.length > 50 ? "..." : ""),
      "top1 score": r.topScore,
      "top1 doc": r.topN[0]?.filename ?? "?",
      "top2 score": r.topN[1]?.score ?? "-",
      "top3 score": r.topN[2]?.score ?? "-",
      "top4 score": r.topN[3]?.score ?? "-",
      "top5 score": r.topN[4]?.score ?? "-",
    })),
  );

  // --- Coût du seuil sur les briefs pertinents ---
  // La separation des groupes ne montre qu'un cote du compromis : ce qu'un
  // seuil plus haut ecarte de bruit. Cette section montre l'autre cote, le
  // contexte legitime perdu, brief par brief.
  const onTopic = results.filter((r) => r.label === "on-topic");

  console.log(
    `\n=== Coût du seuil sur les briefs pertinents (${PREVIOUS_THRESHOLD} vs ${CURRENT_THRESHOLD}) ===\n`,
  );
  console.table(
    onTopic.map((r) => ({
      brief: r.brief.slice(0, 50) + (r.brief.length > 50 ? "..." : ""),
      [`retenus > ${PREVIOUS_THRESHOLD}`]: r.keptPrevious,
      [`retenus > ${CURRENT_THRESHOLD}`]: r.keptCurrent,
      perdus: r.keptPrevious - r.keptCurrent,
      "scores écartés":
        r.topN
          .filter(
            (c) =>
              c.score / 100 > PREVIOUS_THRESHOLD &&
              c.score / 100 <= CURRENT_THRESHOLD,
          )
          .map((c) => c.score)
          .join(", ") || "-",
    })),
  );

  const keptBefore = onTopic.reduce((acc, r) => acc + r.keptPrevious, 0);
  const keptAfter = onTopic.reduce((acc, r) => acc + r.keptCurrent, 0);
  const lossPct =
    keptBefore === 0
      ? 0
      : Math.round((1000 * (keptBefore - keptAfter)) / keptBefore) / 10;

  console.log(
    `\nTotal chunks pertinents retenus : ${keptBefore} à ${PREVIOUS_THRESHOLD}, ` +
      `${keptAfter} à ${CURRENT_THRESHOLD}.\n` +
      `Perte : ${keptBefore - keptAfter} chunk(s), soit ${lossPct}% du contexte ` +
      `pertinent disponible dans la fenêtre de production.`,
  );

  // Un brief pertinent reduit a 0 ou 1 chunk genere sur un contexte quasi
  // inexistant : le seuil ne l'a pas rejete, mais il l'a affame.
  const starved = onTopic.filter((r) => r.keptCurrent <= 1);
  if (starved.length > 0) {
    console.log(
      `\nBriefs pertinents réduits à 1 chunk ou moins sous ${CURRENT_THRESHOLD} ` +
        `(qualité des stories à vérifier en génération réelle) :`,
    );
    for (const r of starved) {
      console.log(
        `  - "${r.brief.slice(0, 60)}" : ${r.keptCurrent} chunk(s), meilleur score ${r.topScore}%`,
      );
    }
  }

  // Chunks pertinents qui ne tiennent qu'a une fraction de point au-dessus du
  // seuil : une reindexation de public/docs/ peut les faire basculer.
  const fragile = [];
  for (const r of onTopic) {
    for (const c of r.topN) {
      const margin = Math.round((c.score - CURRENT_THRESHOLD * 100) * 100) / 100;
      if (margin > 0 && margin < 1) {
        fragile.push({ brief: r.brief.slice(0, 50), score: c.score, margin });
      }
    }
  }
  if (fragile.length > 0) {
    console.log(
      `\nChunks pertinents à moins d'1 point au-dessus du seuil (fragiles) :`,
    );
    for (const f of fragile) {
      console.log(`  - "${f.brief}" : ${f.score}% (+${f.margin} pt)`);
    }
  }

  // --- Statistiques par groupe ---
  const onTopicScores = results.filter((r) => r.label === "on-topic").map((r) => r.topScore);
  const offTopicScores = results.filter((r) => r.label === "off-topic").map((r) => r.topScore);

  const stats = (arr) => ({
    count: arr.length,
    mean: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100,
    min: Math.min(...arr),
    max: Math.max(...arr),
  });

  const onTopicStats = stats(onTopicScores);
  const offTopicStats = stats(offTopicScores);

  console.log("\n=== Statistiques (score du meilleur match, en %) ===\n");
  console.log(`On-topic  (n=${onTopicStats.count}) : moyenne ${onTopicStats.mean}%, min ${onTopicStats.min}%, max ${onTopicStats.max}%`);
  console.log(`Off-topic (n=${offTopicStats.count}) : moyenne ${offTopicStats.mean}%, min ${offTopicStats.min}%, max ${offTopicStats.max}%`);

  console.log("\n=== Séparation des groupes ===\n");
  if (offTopicStats.max < onTopicStats.min) {
    const suggestedThreshold = Math.round(((offTopicStats.max + onTopicStats.min) / 2) * 100) / 100;
    console.log(
      `Séparation nette : max off-topic (${offTopicStats.max}%) < min on-topic (${onTopicStats.min}%).\n` +
        `Seuil médian suggéré : ${suggestedThreshold}% (soit ${(suggestedThreshold / 100).toFixed(4)} sur l'échelle 0-1 utilisée dans le code).\n` +
        `Seuil actuel en dur : ${CURRENT_THRESHOLD * 100}% (${CURRENT_THRESHOLD}).\n` +
        `Exposition réelle du seuil : ${Math.round((CURRENT_THRESHOLD * 100 - offTopicStats.max) * 100) / 100} point au-dessus du pire hors-sujet ` +
        `(à ne pas confondre avec l'écart de séparation ci-dessus).`,
    );
  } else {
    console.log(
      `Pas de séparation nette : les deux groupes se chevauchent ` +
        `(max off-topic ${offTopicStats.max}% >= min on-topic ${onTopicStats.min}%).\n` +
        `Aucun seuil unique ne sépare proprement les deux groupes sur cet échantillon — ` +
        `ne pas forcer une conclusion que les données ne permettent pas.`,
    );
  }
}

main().catch((error) => {
  console.error("Erreur pendant la calibration :", error);
  process.exit(1);
});
