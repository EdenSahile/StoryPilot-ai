// Harnais de test de prompt.
//
// Rejoue des cas figés contre une génération réelle, applique le moteur de
// verdict de scripts/lib/prompt-verdict.mjs, et sort en code non nul à la
// moindre violation.
//
// Ce que ce fichier ne fait PAS, volontairement :
//   - il n'a pas d'option --markers. Les marqueurs vivent dans le fichier de
//     cas, jamais en ligne de commande. Des marqueurs passés à la main le
//     2026-11-25 ne contenaient ni "Lyon" ni "showroom", et deux runs ont été
//     déclarés propres alors que l'un fuyait. L'option n'est pas dépréciée,
//     elle n'existe pas.
//   - il ne juge rien lui-même. Tout le jugement est dans le moteur, qui est
//     testé hors ligne. Ici il n'y a que du transport et de l'affichage.
//
// Usage :
//   npm run harness -- --endpoint https://<preview>/api/generate-stories
//   npm run harness -- --case testing/prompt-cases/mixte-categorie-absente.json --endpoint <url>
//   npm run harness -- --rejouer notes-techniques/harnais-sorties/<fichier>.json
//
// Le secret de bypass Vercel est lu dans VERCEL_AUTOMATION_BYPASS_SECRET.

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { evaluerCampagne } from "./lib/prompt-verdict.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER_CAS = join(RACINE, "testing", "prompt-cases");
const DOSSIER_SORTIES = join(RACINE, "notes-techniques", "harnais-sorties");

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
  }
  return flags;
}

// Réassemble le texte depuis le flux SSE, et signale un flux interrompu.
// Un flux qui s'arrête sans son marqueur de fin a produit une user story
// tronquée : la juger comme une sortie complète donnerait un verdict sur un
// texte amputé, donc un faux vert ou un faux rouge au hasard.
function extraireTexte(morceaux) {
  let texte = "";
  let termine = false;
  let flux = false;
  for (const bloc of morceaux) {
    for (const ligne of bloc.split("\n")) {
      const t = ligne.trim();
      if (!t.startsWith("data: ")) continue;
      flux = true;
      const d = t.slice(6);
      if (d === "[DONE]") { termine = true; continue; }
      try { const p = JSON.parse(d); if (p.text) texte += p.text; } catch { /* ligne partielle */ }
    }
  }
  return { texte, termine, flux };
}

async function appeler({ endpoint, bypass, corps }) {
  const headers = { "content-type": "application/json" };
  // Pas de x-vercel-set-bypass-cookie : il fait répondre Vercel par un 307 avec
  // Set-Cookie, que fetch() suit sans conserver le cookie, d'où une boucle.
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;

  const r = await fetch(endpoint, {
    method: "POST", headers, redirect: "manual", body: JSON.stringify(corps),
  });

  if (r.status >= 300 && r.status < 400) {
    return { ok: false, detail: `Redirection ${r.status} vers ${r.headers.get("location") || "?"}. Vérifier le secret de bypass.` };
  }
  if (!r.ok || !r.body) {
    let detail = "";
    try { detail = JSON.stringify(await r.json()); } catch { detail = await r.text().catch(() => ""); }
    if (r.status === 401 && /Protected by Vercel Authentication/i.test(detail)) {
      detail = "Déploiement protégé. Renseigner VERCEL_AUTOMATION_BYPASS_SECRET dans .env.";
    }
    return { ok: false, detail: `HTTP ${r.status} ${detail}`.trim() };
  }

  const morceaux = [];
  const dec = new TextDecoder();
  for await (const m of r.body) morceaux.push(dec.decode(m, { stream: true }));
  const { texte, termine, flux } = extraireTexte(morceaux);
  // Une reponse 200 qui ne contient aucune ligne SSE n'est pas une generation
  // tronquee, c'est une autre ressource : typiquement l'index.html de
  // l'application, servi quand --endpoint pointe la racine du site au lieu de
  // la route API. Les deux cas echouent, mais les confondre coute une heure.
  if (!flux) {
    return {
      ok: false,
      detail:
        "Réponse sans flux SSE. L'URL ne pointe probablement pas vers /api/generate-stories " +
        "(une racine de site renvoie l'index.html de l'application).",
    };
  }
  if (!termine) return { ok: false, detail: "Flux interrompu avant la fin : sortie tronquée." };
  return { ok: true, texte };
}

function rapporter(cas, resultat) {
  const etat = resultat.succes ? "SUCCES" : "ECHEC";
  console.log(`\n${"=".repeat(70)}\n${cas.id} : ${etat}\n${"=".repeat(70)}`);
  if (cas.description) console.log(cas.description + "\n");

  if (resultat.violations.length === 0) {
    console.log("Violations : aucune.");
  } else {
    console.log(`Violations (${resultat.violations.length}) :`);
    for (const v of resultat.violations) console.log(`  - ${v.message}`);
  }

  if (resultat.aLire.length > 0) {
    console.log("\nA lire, sans echec :");
    for (const a of resultat.aLire) console.log(`  - ${a.message}`);
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  // Mode relecture : rejuge une campagne deja enregistree, sans appel API.
  // Sert a reprendre d'anciennes sorties apres avoir change les assertions.
  if (flags.rejouer) {
    const enregistre = JSON.parse(await readFile(flags.rejouer, "utf8"));
    const cas = enregistre.cas ?? {
      id: basename(flags.rejouer),
      description: "Campagne enregistree, assertions fournies par --case si besoin.",
      assertions: {},
    };
    const assertions = flags.case
      ? JSON.parse(await readFile(flags.case, "utf8")).assertions
      : cas.assertions;
    const contexte = (enregistre.contextChunks ?? cas.contextChunks ?? []).map((c) => c.text).join("\n");
    const sorties = enregistre.sorties ?? [];
    rapporter(cas, evaluerCampagne({ sorties, runsDemandes: sorties.length, contexte, assertions }));
    return;
  }

  const endpoint = flags.endpoint;
  if (!endpoint) {
    console.error(
      "Usage : npm run harness -- --endpoint <url de /api/generate-stories>\n" +
      "La cle ANTHROPIC_API_KEY locale est invalide : le harnais teste le code reellement deploye.\n" +
      "Relecture hors ligne : npm run harness -- --rejouer <fichier de sorties>",
    );
    process.exit(1);
  }
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  const fichiers = flags.case
    ? [flags.case]
    : (await readdir(DOSSIER_CAS)).filter((f) => f.endsWith(".json")).map((f) => join(DOSSIER_CAS, f));

  if (fichiers.length === 0) {
    console.error(`Aucun cas trouve dans ${DOSSIER_CAS}. Rien a verifier, donc rien de verifie.`);
    process.exit(1);
  }

  if (!existsSync(DOSSIER_SORTIES)) await mkdir(DOSSIER_SORTIES, { recursive: true });

  let echecs = 0;
  for (const fichier of fichiers) {
    const cas = JSON.parse(await readFile(fichier, "utf8"));
    const runs = Number(flags.runs || cas.runs || 5);
    const corps = {
      brief: cas.brief,
      contextChunks: cas.contextChunks,
      ...(cas.clientName ? { clientName: cas.clientName } : {}),
    };

    console.log(`\n[${cas.id}] ${runs} run(s) contre ${endpoint}`);
    const sorties = [];
    const incidents = [];
    for (let i = 1; i <= runs; i++) {
      const r = await appeler({ endpoint, bypass, corps });
      if (r.ok) {
        sorties.push(r.texte);
        process.stdout.write(`  run ${i}/${runs} : ${r.texte.length} caracteres\n`);
      } else {
        // Echec ferme : on enregistre une sortie vide, que le moteur compte
        // comme une violation. Jamais un run ignore.
        sorties.push("");
        incidents.push(`run ${i} : ${r.detail}`);
        process.stdout.write(`  run ${i}/${runs} : ECHEC, ${r.detail}\n`);
      }
    }

    const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
    const chemin = join(DOSSIER_SORTIES, `${cas.id}-${horodatage}.json`);
    await writeFile(chemin, JSON.stringify({ cas, sorties, incidents }, null, 2) + "\n", "utf8");

    const contexte = (cas.contextChunks ?? []).map((c) => c.text).join("\n");
    const resultat = evaluerCampagne({ sorties, runsDemandes: runs, contexte, assertions: cas.assertions ?? {} });
    rapporter(cas, resultat);
    console.log(`\nSorties brutes : ${chemin.replace(RACINE + "/", "")}`);
    console.log("Le verdict ci-dessus est calcule depuis ce fichier, pas depuis une variable en memoire.");
    if (!resultat.succes) echecs++;
  }

  console.log(`\n${"=".repeat(70)}`);
  if (echecs > 0) {
    console.error(`${echecs} cas en echec sur ${fichiers.length}.`);
    process.exit(1);
  }
  console.log(`${fichiers.length} cas, aucune violation.`);
}

main().catch((e) => { console.error("Erreur :", e); process.exit(1); });
