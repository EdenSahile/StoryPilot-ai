// scripts/probe-generation.mjs
//
// Lance une génération réelle via api/generate-stories.js avec un contexte
// documentaire choisi, et affiche la sortie brute plus quelques signaux pour
// juger si le modèle a inventé un rattachement métier.
//
// Compagnon de scripts/probe-brief.mjs : celui-ci montre CE QUI EST RÉCUPÉRÉ,
// celui-là montre CE QUE LE MODÈLE EN FAIT.
//
// À quoi ça sert concrètement : le prompt système contient une clause
// d'exception anti-hallucination (cf. session HALLUCINATION-RAG-PARSING du
// journal technique), validée en août sur le brief "téléphone" sous le seuil
// 0.42. Elle n'a jamais été testée sur le brief "essayer virtuellement des
// vêtements", devenu le pire cas hors-sujet après la réindexation du
// 2026-11-25. Ce script permet de rejouer ce genre de vérification sans
// passer par l'UI, en forçant un contexte qui ne passerait plus le seuil
// actuel.
//
// Usage :
//   npm run probe:generate -- --probe notes-techniques/probe-vetements-045.json --runs 3
//
// Par defaut, le handler api/generate-stories.js est importe et execute en
// local : il faut donc une ANTHROPIC_API_KEY valide dans .env. Avec --endpoint,
// la requete part vers un deploiement distant a la place, ce qui permet de
// tester sans clé locale valide :
//   npm run probe:generate -- --probe <fichier> --endpoint https://<domaine>/api/generate-stories
//
// Le modèle étant non déterministe, lancer plusieurs fois : en août, il avait
// fallu plusieurs appels pour reproduire le bug d'origine.
//
// Note réseau : si fetch échoue en EAI_AGAIN derrière un proxy, préfixer la
// commande par NODE_USE_ENV_PROXY=1.

import { readFile, writeFile } from "node:fs/promises";

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i];
  }
  return flags;
}

function mockRes() {
  const r = { written: [], code: undefined, body: undefined };
  r.setHeader = () => r;
  r.flushHeaders = () => r;
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.write = (s) => { r.written.push(s); return true; };
  r.end = () => { r.ended = true; return r; };
  return r;
}

// Mots qui commencent une phrase, un titre ou une ligne Gherkin : capitalises
// sans etre des noms propres. Sans ce filtre, la detection ci-dessous est noyee.
const MOTS_COURANTS = new Set(`Etant Étant Quand Alors Et Mais Donc Or Ni Car Si Lorsque Apres Après Avant Afin Ainsi Ensuite Enfin Scenario Scénario Scenarios Scénarios Titre Description Criteres Critères Complexite Complexité User Story Stories Le La Les Un Une Du De Des Dans Sur Sous Entre Par Avec Sans Au Aux Pour Cette Cet Ce Ces Chaque Il Elle Ils Elles Je Tu Nous Vous On Son Sa Ses Leur Leurs Mon Ma Mes Notre Nos Votre Vos Tout Toute Tous Toutes Plusieurs Aucun Aucune Limite Acces Accès Ajout Consulter Generer Générer Exporter Ouvrir Fermer Navigation Comparaison Essayage Visualiser Analyser Renseigner Produit Client Systeme Système Back Front Mo Go CSV JPG PNG PDF API UI UX SAV FAQ RGPD S M L XL`.split(/\s+/));

/**
 * Reperes les noms propres presents dans la sortie mais absents du contexte
 * injecte et du brief. Un nom d'entreprise invente tombe exactement la.
 * Heuristique volontairement large : a lire, pas a automatiser aveuglement.
 */
function nomsPropresHorsContexte(texte, contexte, brief) {
  const connu = (contexte + " " + brief).toLowerCase();
  const candidats = texte.match(/\b[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ'’-]{2,}(?:\s+(?:&|et)\s+[A-ZÀ-Ÿ][\wÀ-ÿ'’.-]+)?/g) || [];
  const suspects = new Map();
  for (const brut of candidats) {
    const mot = brut.trim();
    if (MOTS_COURANTS.has(mot.split(/\s+/)[0])) continue;
    if (connu.includes(mot.toLowerCase())) continue;
    suspects.set(mot, (suspects.get(mot) || 0) + 1);
  }
  return [...suspects.entries()].sort((a, b) => b[1] - a[1]);
}

// Reassemble le texte depuis le flux SSE ecrit par le handler.
function extraireTexte(res) {
  let out = "";
  for (const bloc of res.written) {
    for (const ligne of bloc.split("\n")) {
      const t = ligne.trim();
      if (!t.startsWith("data: ")) continue;
      const d = t.slice(6);
      if (d === "[DONE]") continue;
      try { const p = JSON.parse(d); if (p.text) out += p.text; } catch { /* ligne partielle */ }
    }
  }
  return out;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const chemin = flags.probe;
  if (!chemin) {
    console.error('Usage : npm run probe:generate -- --probe <fichier.json de probe-brief> [--runs 3] [--markers "mot1,mot2"] [--out sorties.json]');
    process.exit(1);
  }
  const runs = Number(flags.runs || 1);
  const marqueurs = (flags.markers || "").split(",").map((m) => m.trim().toLowerCase()).filter(Boolean);

  const probe = JSON.parse(await readFile(chemin, "utf-8"));
  const { brief, contextChunks, threshold } = probe;

  console.log(`\nBrief            : "${brief}"`);
  console.log(`Contexte injecte : ${contextChunks.length} chunk(s), issus d'une sonde au seuil ${threshold}`);
  for (const c of contextChunks) {
    console.log(`   - ${c.filename} chunk ${c.chunkIndex} (score ${c.score})`);
  }
  if (contextChunks.length === 0) {
    console.log("\nAucun contexte : la generation serait generique, ce test n'a pas d'objet.");
    return;
  }

  const endpoint = flags.endpoint;
  console.log(endpoint ? `Cible            : ${endpoint}` : "Cible            : handler local (necessite une cle valide dans .env)");

  // Appelle soit le handler local, soit un deploiement distant. Dans les deux
  // cas on recupere un flux SSE au meme format, reassemble par extraireTexte().
  let lancer;
  if (endpoint) {
    lancer = async (body) => {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok || !r.body) {
        let detail = "";
        try { detail = JSON.stringify(await r.json()); } catch { detail = await r.text().catch(() => ""); }
        return { code: r.status, body: detail, written: [] };
      }
      const written = [];
      const dec = new TextDecoder();
      for await (const morceau of r.body) written.push(dec.decode(morceau, { stream: true }));
      return { code: r.status, written };
    };
  } else {
    const { default: handler } = await import("../api/generate-stories.js");
    lancer = async (body) => {
      const req = {
        method: "POST",
        headers: { origin: process.env.PROBE_ORIGIN || "http://localhost:5173" },
        socket: { remoteAddress: "127.0.0.1" },
        body,
      };
      const res = mockRes();
      await handler(req, res);
      return res;
    };
  }

  const sorties = [];

  for (let i = 1; i <= runs; i++) {
    const res = await lancer({ brief, contextChunks });
    const texte = extraireTexte(res);
    sorties.push(texte);

    console.log(`\n================= RUN ${i}/${runs} =================`);
    if (!texte) {
      console.log(`Echec : HTTP ${res.code} ${JSON.stringify(res.body)}`);
      continue;
    }
    const bas = texte.toLowerCase();
    const trouves = marqueurs.filter((m) => bas.includes(m));
    console.log(`Caracteres generes : ${texte.length}`);
    if (marqueurs.length > 0) {
      console.log(`Marqueurs hors-sujet detectes : ${trouves.length ? trouves.join(", ") : "AUCUN"}`);
    }
    const contexte = contextChunks.map((c) => c.text).join(" ");
    const suspects = nomsPropresHorsContexte(texte, contexte, brief);
    console.log(
      `Noms propres absents du contexte : ${suspects.length ? suspects.map(([m, n]) => `${m} (x${n})`).join(", ") : "AUCUN"}`,
    );
    if (suspects.length) {
      console.log("  ^ un nom d'entreprise invente apparait ici. A verifier a la lecture.");
    }
    console.log("\n--- SORTIE BRUTE ---\n");
    console.log(texte);
  }

  const out = flags.out || chemin.replace(/\.json$/, "") + "-generation.json";
  await writeFile(out, JSON.stringify({ brief, threshold, contextChunks, sorties }, null, 2));
  console.log(`\nSorties completes ecrites dans ${out}`);
  console.log("A juger a la lecture : le modele rattache-t-il le brief au client, ou reste-t-il generique ?");
}

main().catch((e) => { console.error("Erreur :", e); process.exit(1); });
