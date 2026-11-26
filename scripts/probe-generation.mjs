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
// Les deploiements de preview Vercel sont proteges par authentification SSO et
// renvoient 401 a tout appel automatise. Deux solutions : desactiver la
// Deployment Protection pour les previews, ou generer un secret dans Vercel
// (Settings, Deployment Protection, Protection Bypass for Automation) et le
// passer ici :
//   --bypass <secret>   ou la variable d'environnement VERCEL_AUTOMATION_BYPASS_SECRET
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

// Vocabulaire du prompt systeme et mots-cles de format : capitalises sans etre
// des noms propres.
const MOTS_IGNORES = new Set(
  `Gherkin MAXIMUM Scenario Scénario Scenarios Scénarios Titre Description
   Criteres Critères Complexite Complexité User Story Stories Etant Étant Quand Alors
   CSV JPG PNG PDF API AR UI UX SAV FAQ RGPD S M L XL Mo Go`.split(/\s+/),
);

// Articles elides : "L'avatar" n'est pas un nom propre.
const ELISIONS = /^(?:[LDSNCJMT]|Qu|Lorsqu|Jusqu|Puisqu|Quoiqu)['\u2019]/;

// Caracteres apres lesquels une majuscule est grammaticale, pas onomastique.
const FRONTIERES = /[\n.:;!?"\u00ab\u00bb\u2022*#|-]/;

// Un nom d'entreprise suit presque toujours l'un de ces mots.
const AMORCES = /\b(?:de|chez|entreprise|société|societe|client\s+de|marque|enseigne)\s+$/i;

/**
 * Repere les noms propres presents dans la sortie mais absents du contexte
 * injecte et du brief. Un nom d'entreprise invente tombe exactement la.
 *
 * Deux regles combinees :
 * 1. On ecarte toute majuscule en debut de phrase, de ligne, de puce, de titre
 *    ou apres deux-points. Elle est capitalisee par la grammaire. Sans cette
 *    regle, la sortie remonte des dizaines de faux positifs ("Creation",
 *    "Consultation", "Echec"...) et l'outil devient inutilisable.
 * 2. On retient systematiquement ce qui suit une amorce du type "client de",
 *    "chez", "l'entreprise", meme en debut de phrase.
 */
function nomsPropresHorsContexte(texte, contexte, brief, clientName = null) {
  // clientName vient des metadonnees, pas forcement du texte des chunks : sans lui
  // dans le vocabulaire connu, une mention legitime du client serait comptee comme
  // un nom invente. C'est le faux positif que ce detecteur doit eviter.
  const connu = (contexte + " " + brief + " " + (clientName || "")).toLowerCase();
  const propre = texte.replace(/\*\*/g, "");
  const suspects = new Map();
  const motif = /[A-Z\u00c0\u00c2\u00c4\u00c9\u00c8\u00ca\u00cb\u00ce\u00cf\u00d4\u00d6\u00d9\u00db\u00dc\u00c7][\wÀ-ÿ'\u2019-]{2,}(?:\s+(?:&|et)\s+[A-ZÀ-Ÿ][\wÀ-ÿ'\u2019.-]+)?/g;

  let m;
  while ((m = motif.exec(propre)) !== null) {
    const mot = m[0].trim();
    if (ELISIONS.test(mot)) continue;
    if (MOTS_IGNORES.has(mot.split(/\s+/)[0])) continue;
    if (connu.includes(mot.toLowerCase())) continue;

    const avant = propre.slice(0, m.index);
    const suitUneAmorce = AMORCES.test(avant);
    if (!suitUneAmorce) {
      // Remonte jusqu'au premier caractere non blanc qui precede.
      const precedent = avant.replace(/\s+$/, "").slice(-1);
      if (precedent === "" || FRONTIERES.test(precedent)) continue;
    }
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
    console.error('Usage : npm run probe:generate -- --probe <fichier.json de probe-brief> [--runs 3] [--markers "mot1,mot2"] [--endpoint URL] [--bypass SECRET] [--out sorties.json]');
    process.exit(1);
  }
  const runs = Number(flags.runs || 1);
  const marqueurs = (flags.markers || "").split(",").map((m) => m.trim().toLowerCase()).filter(Boolean);

  const probe = JSON.parse(await readFile(chemin, "utf-8"));
  const { brief, contextChunks, threshold, clientName = null } = probe;

  console.log(`\nBrief            : "${brief}"`);
  console.log(`Contexte injecte : ${contextChunks.length} chunk(s), issus d'une sonde au seuil ${threshold}`);
  for (const c of contextChunks) {
    console.log(`   - ${c.filename} chunk ${c.chunkIndex} (score ${c.score})`);
  }
  console.log(
    clientName
      ? `Nom de client     : "${clientName}" (transmis dans le corps de la requete)`
      : "Nom de client     : aucun, repli neutre attendu",
  );
  if (contextChunks.length === 0) {
    console.log("\nAucun contexte : la generation serait generique, ce test n'a pas d'objet.");
    return;
  }

  const endpoint = flags.endpoint;
  console.log(endpoint ? `Cible            : ${endpoint}` : "Cible            : handler local (necessite une cle valide dans .env)");

  // Appelle soit le handler local, soit un deploiement distant. Dans les deux
  // cas on recupere un flux SSE au meme format, reassemble par extraireTexte().
  let lancer;
  const bypass = flags.bypass || process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (endpoint && bypass) console.log("Bypass           : secret de contournement Vercel fourni");

  if (endpoint) {
    lancer = async (body) => {
      const headers = { "content-type": "application/json" };
      // Contourne la Deployment Protection de Vercel sur les previews.
      if (bypass) {
        headers["x-vercel-protection-bypass"] = bypass;
        // Pas de x-vercel-set-bypass-cookie : il fait repondre Vercel par un 307
        // avec Set-Cookie, et fetch() de Node suit la redirection sans conserver
        // le cookie, ce qui boucle jusqu'a "redirect count exceeded". Cet en-tete
        // sert a un navigateur qui enchaine des navigations, pas a un appel API.
      }
      // redirect: "manual" : une redirection devient un statut lisible plutot
      // qu'une boucle muette.
      const r = await fetch(endpoint, {
        method: "POST",
        headers,
        redirect: "manual",
        body: JSON.stringify(body),
      });
      if (r.status >= 300 && r.status < 400) {
        return {
          code: r.status,
          body:
            `Redirection vers ${r.headers.get("location") || "(cible inconnue)"}. ` +
            "Si le secret de bypass est correct, verifier qu'il correspond bien au projet.",
          written: [],
        };
      }
      if (!r.ok || !r.body) {
        let detail = "";
        try { detail = JSON.stringify(await r.json()); } catch { detail = await r.text().catch(() => ""); }
        if (r.status === 401 && /Protected by Vercel Authentication/i.test(detail)) {
          detail =
            "Deploiement protege par l'authentification Vercel. Relancer avec --bypass <secret> " +
            "(Vercel > Settings > Deployment Protection > Protection Bypass for Automation), " +
            "ou desactiver la protection pour les previews.";
        }
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
    const res = await lancer({ brief, contextChunks, ...(clientName ? { clientName } : {}) });
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
    const suspects = nomsPropresHorsContexte(texte, contexte, brief, clientName);
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
  await writeFile(out, JSON.stringify({ brief, threshold, clientName, contextChunks, sorties }, null, 2));
  console.log(`\nSorties completes ecrites dans ${out}`);

  // Un script qui annonce un resultat apres zero generation reussie est un faux
  // vert : il doit echouer franchement pour qu'un enchainement s'arrete dessus.
  const reussis = sorties.filter((t) => t && t.length > 0).length;
  if (reussis === 0) {
    console.error(`\nAucune generation n'a abouti (${runs} tentative(s)). Rien a juger.`);
    process.exitCode = 1;
    return;
  }
  if (reussis < runs) {
    console.log(`Attention : ${runs - reussis} run(s) sur ${runs} ont echoue.`);
  }
  console.log("A juger a la lecture : le modele rattache-t-il le brief au client, ou reste-t-il generique ?");
}

main().catch((e) => { console.error("Erreur :", e); process.exit(1); });
