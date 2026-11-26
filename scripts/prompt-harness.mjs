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

// Réassemble le texte depuis le flux SSE écrit par api/generate-stories.js.
//
// Le protocole réellement émis, lu dans le handler et non deviné :
//   data: {"text":"..."}       un fragment de texte
//   data: {"stop":true}        fin normale, sur message_stop
//   data: {"truncated":true}   le modèle a atteint max_tokens
//
// Première version fausse : elle exigeait "data: [DONE]". Ce marqueur n'est
// écrit que si le flux Anthropic amont envoie littéralement [DONE], ce qui est
// la convention d'OpenAI. Il n'arrive donc jamais, et les 15 runs de la
// première campagne réelle ont tous échoué sur une exigence inventée.
//
// L'erreur de méthode vaut d'être notée : le marqueur avait été déduit en
// lisant le consommateur (probe-generation ignorait [DONE] s'il le croisait),
// pas le producteur. Une tolérance côté lecture a été prise pour une garantie
// côté écriture.
function extraireTexte(morceaux) {
  let texte = "";
  let termine = false;
  let tronque = false;
  let flux = false;
  for (const bloc of morceaux) {
    for (const ligne of bloc.split("\n")) {
      const t = ligne.trim();
      if (!t.startsWith("data: ")) continue;
      flux = true;
      const d = t.slice(6);
      if (d === "[DONE]") { termine = true; continue; }
      try {
        const p = JSON.parse(d);
        if (p.text) texte += p.text;
        if (p.stop === true) termine = true;
        if (p.truncated === true) tronque = true;
      } catch { /* ligne partielle */ }
    }
  }
  return { texte, termine, tronque, flux };
}

async function appeler({ endpoint, bypass, corps }) {
  const headers = { "content-type": "application/json" };
  // Pas de x-vercel-set-bypass-cookie : il fait répondre Vercel par un 307 avec
  // Set-Cookie, que fetch() suit sans conserver le cookie, d'où une boucle.
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;

  // fetch leve sur DNS injoignable, connexion refusee ou coupure reseau. Sans
  // ce filet, une erreur transitoire au run 2 fait sortir tout le programme et
  // perd les runs deja effectues, alors qu'elle doit etre un run en echec parmi
  // d'autres. Une erreur n'est pas un evenement exceptionnel ici, c'est une
  // donnee de la campagne.
  let r;
  try {
    r = await fetch(endpoint, {
      method: "POST", headers, redirect: "manual", body: JSON.stringify(corps),
    });
  } catch (e) {
    return { ok: false, detail: `Appel impossible : ${e.cause?.code ?? e.name} ${e.message}` };
  }

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
  const { texte, termine, tronque, flux } = extraireTexte(morceaux);
  const brut = morceaux.join("").slice(0, 2000);
  // Une reponse 200 qui ne contient aucune ligne SSE n'est pas une generation
  // tronquee, c'est une autre ressource : typiquement l'index.html de
  // l'application, servi quand --endpoint pointe la racine du site au lieu de
  // la route API. Les deux cas echouent, mais les confondre coute une heure.
  if (!flux) {
    return {
      ok: false, brut,
      detail:
        "Réponse sans flux SSE. L'URL ne pointe probablement pas vers /api/generate-stories " +
        "(une racine de site renvoie l'index.html de l'application).",
    };
  }
  if (tronque) {
    return { ok: false, brut, detail: "Le modèle a atteint max_tokens : user story coupée en cours de rédaction." };
  }
  if (!termine) {
    return { ok: false, brut, detail: "Flux interrompu : ni marqueur de fin, ni signal de troncature." };
  }
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

  // Garde-fou sur le quota de l'API, verifie AVANT de depenser la moindre
  // generation. api/generate-stories.js limite a 10 requetes par 15 minutes et
  // par IP. La premiere campagne reelle en a demande 15 : les 10 premieres sont
  // passees, les 5 dernieres ont recu un 429, et le cas le plus interessant
  // n'a jamais ete mesure. Echouer tout de suite coute zero appel.
  const total = (await Promise.all(fichiers.map(async (f) => {
    const c = JSON.parse(await readFile(f, "utf8"));
    return Number(flags.runs || c.runs || 5);
  }))).reduce((a, b) => a + b, 0);
  const QUOTA = 10;
  if (total > QUOTA) {
    console.error(
      `Campagne refusee : ${total} generations demandees pour un quota de ${QUOTA} par 15 minutes ` +
      `(api/generate-stories.js, checkRateLimit).\n\n` +
      `Deux formes utiles :\n` +
      `  npm run harness -- --endpoint <url>                      serie courte, ${fichiers.length} cas\n` +
      `  npm run harness -- --case <un cas> --runs 10 --endpoint <url>   mesure profonde d'un seul cas\n\n` +
      `Le quota est compte par instance serverless et en memoire : il peut se reinitialiser ` +
      `a la recreation de l'instance, mais rien ne permet d'y compter.`,
    );
    process.exit(1);
  }

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
    const diagnostics = [];
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
        // La reponse brute est conservee : sans elle, le fichier de sorties
        // d'une campagne en echec ne permet pas de diagnostiquer, et il faut
        // relancer pour comprendre, ce qui redepense le quota.
        diagnostics.push({ run: i, detail: r.detail, brut: r.brut ?? null });
        process.stdout.write(`  run ${i}/${runs} : ECHEC, ${r.detail}\n`);
      }
    }

    const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
    const chemin = join(DOSSIER_SORTIES, `${cas.id}-${horodatage}.json`);
    await writeFile(chemin, JSON.stringify({ cas, sorties, incidents, diagnostics }, null, 2) + "\n", "utf8");

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
