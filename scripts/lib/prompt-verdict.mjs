// Moteur de verdict du harnais de test de prompt.
//
// Logique pure : ni réseau, ni système de fichiers, ni horloge. Tout ce qui
// décide d'un échec vit ici et est testé dans src/test/promptVerdict.test.js.
// Le transport (appel à la preview) vit ailleurs, parce que ce n'est pas lui
// qui a menti : en deux jours, les six fausses vérifications venaient toutes du
// jugement, jamais de l'appel HTTP.
//
// Placé dans scripts/lib/ et non dans src/logic/ malgré la convention du
// CLAUDE.md : c'est de l'outillage de test, pas de la logique produit, et il
// n'a rien à faire dans le bundle client. Les tests restent dans src/test/,
// jamais colocalisés, conformément à la règle.
//
// Deux niveaux de sortie, et la distinction est le coeur du moteur :
//   violations : échec franc, code de sortie non nul. Décidable sans jugement.
//   aLire      : signalements qui ramènent 30 000 caractères de génération à
//                une poignée de pointeurs. Ne font jamais échouer, parce que
//                les trier demande un humain (un montant d'illustration dans un
//                scénario Gherkin et une règle métier fabriquée ont la même
//                forme pour une machine).

const MOTS_VIDES = new Set([
  "dans", "pour", "avec", "sans", "sous", "chez", "vers", "cette", "cet",
  "mais", "donc", "alors", "quand", "etant", "donne", "puis", "leur", "leurs",
  "tout", "tous", "toute", "toutes", "plus", "moins", "tres", "bien", "aussi",
  "comme", "entre", "apres", "avant", "depuis", "pendant", "selon", "ainsi",
  "doit", "peut", "faire", "etre", "avoir", "sont", "ete", "soit", "ses",
  "des", "les", "une", "aux", "par", "que", "qui", "est", "sur", "pas",
  "client", "clients", "systeme", "produit", "produits", "commande",
  "scenario", "titre", "description", "criteres", "acceptation", "story",
  "stories", "user", "veux", "afin", "quand", "alors",
]);

/**
 * Supprime les accents et passe en minuscules.
 *
 * Indispensable, pas cosmétique : le corpus extrait des PDF écrit "Lumeo" et
 * le modèle écrit "Luméo". Un marqueur interdit "Luméo" comparé sans
 * normalisation ne voit pas la fuite qu'il cherche.
 *
 * @param {string} texte
 * @returns {string}
 */
export function normaliser(texte) {
  return String(texte ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function echapper(terme) {
  return terme.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cherche un terme avec des frontières de mot, accents et casse ignorés.
 *
 * Les frontières ne sont pas un raffinement. Une recherche par inclusion simple
 * a produit deux faux positifs le 2026-11-26 : "ral" trouvé dans "généraliste",
 * et "telephone" trouvé dans les coordonnées du SAV où le mot désigne le canal
 * de contact et non le produit.
 *
 * @param {string} texte
 * @param {string} terme
 * @returns {boolean}
 */
export function contientTerme(texte, terme) {
  if (!terme) return false;
  // Les espaces du terme deviennent \s+ : un terme en plusieurs mots peut etre
  // coupe par un retour a la ligne dans la sortie du modele, et une recherche
  // litterale le manquerait sans rien signaler.
  const corps = echapper(normaliser(terme)).replace(/\\?\s+/g, "\\s+");
  const motif = new RegExp(`(?<![\\p{L}\\p{N}])${corps}(?![\\p{L}\\p{N}])`, "u");
  return motif.test(normaliser(texte));
}

/**
 * Occurrences brutes d'un terme, accents et casse ignorés pour la recherche
 * mais graphie d'origine conservée dans le résultat.
 *
 * Sert à vérifier qu'un terme documenté est reproduit à l'identique. Le modèle
 * a écrit "Luméo+" là où le corpus écrit "Lumeo+" : l'accent du nom
 * d'entreprise, posé comme autorité dans les métadonnées, contamine les termes
 * documentés qui partagent sa racine.
 *
 * @param {string} texte
 * @param {string} terme
 * @returns {string[]} graphies rencontrées
 */
export function graphiesRencontrees(texte, terme) {
  if (!terme) return [];
  const cible = normaliser(terme);
  // On découpe le texte BRUT en jetons, puis on normalise chaque jeton pour le
  // comparer. Première version abandonnée : elle cherchait sur le texte
  // normalisé puis relisait le texte brut au même index. La normalisation NFD
  // peut changer la longueur de la chaîne, donc les index ne correspondent pas
  // toujours, et la graphie rapportée aurait été décalée d'un caractère sans
  // que rien ne le signale. Un outil de détection qui se trompe en silence est
  // exactement ce que ce fichier existe pour éviter.
  //
  // Limite assumée : ne traite que les termes d'un seul jeton (pas d'espace).
  // Les noms de produits documentés, seul usage réel ici, en sont.
  const jetons = String(texte ?? "").match(/[\p{L}\p{N}+]+/gu) ?? [];
  return jetons.filter((jeton) => normaliser(jeton) === cible);
}

function motsSignificatifs(texte) {
  return new Set(
    normaliser(texte)
      .split(/[^\p{L}\p{N}+]+/u)
      // Seuil à 3 et non à 4 : le cas qui a motivé cette fonction est "48h",
      // le délai documenté que le run 5 a appliqué à une fonctionnalité
      // inexistante. Un seuil à 4 l'aurait écarté, et le seul signal
      // automatisable capable de le remonter aurait été perdu.
      .filter((m) => m.length >= 3 && !MOTS_VIDES.has(m)),
  );
}

/**
 * Vocabulaire factuel du contexte : nombres, termes contenant un chiffre, et
 * termes qui apparaissent capitalisés dans les documents.
 *
 * Première version de la variance abandonnée : elle comparait tout le
 * vocabulaire commun et sortait "politique (1/5), modifiee (1/5),
 * gratuitement (1/5)...", noyant le seul terme qui comptait. Une règle métier
 * fabriquée se construit à partir de faits nommés, et la clause du prompt les
 * énumère elle-même : ni chiffre, ni délai, ni partenaire, ni programme. Ce
 * sont des nombres et des noms propres, pas des adjectifs.
 *
 * @param {string} contexte
 * @returns {Set<string>} termes normalisés
 */
function vocabulaireFactuel(contexte) {
  const jetons = String(contexte ?? "").match(/[\p{L}\p{N}+]+/gu) ?? [];
  const factuels = new Set();
  for (const jeton of jetons) {
    const n = normaliser(jeton);
    if (n.length < 3 || MOTS_VIDES.has(n)) continue;
    const aChiffre = /\d/.test(jeton);
    const capitalise = /^\p{Lu}/u.test(jeton);
    if (aChiffre || capitalise) factuels.add(n);
  }
  return factuels;
}

function chiffres(texte) {
  return new Set(String(texte ?? "").match(/\d+(?:[.,]\d+)?/g) ?? []);
}


// Longueur de l'en-tete d'une user story : ligne "En tant que", titre, et
// debut de la description.
//
// Mesure du 2026-11-26 sur les 5 runs de la campagne "categorie absente" :
// un selecteur applique a ces 300 caracteres designe exactement une story par
// run, la bonne, y compris aux runs 2 et 5 ou le titre ne contient pas le mot
// cherche. Applique au corps entier, le meme selecteur en designe deux au run
// 3, la seconde etant une story de paiement qui mentionne "telephone" comme
// canal de contact du SAV. Le choix de 300 n'est donc pas une intuition.
const ENTETE_CARACTERES = 300;

/**
 * Decoupe une generation en user stories.
 *
 * @param {string} texte
 * @returns {Array<{numero: number, texte: string, entete: string}>}
 */
export function decouperStories(texte) {
  const morceaux = String(texte ?? "")
    .split(/(?=\*\*User Story)/)
    .filter((m) => m.includes("**User Story"));
  return morceaux.map((m, i) => ({
    numero: i + 1,
    texte: m,
    entete: m.slice(0, ENTETE_CARACTERES),
  }));
}

/**
 * Applique un jeu d'assertions aux stories designees par un selecteur.
 *
 * Le selecteur est le point faible de toute verification sur une sortie
 * stochastique : le modele reformule, et un selecteur qui cesse de designer
 * quoi que ce soit ferait passer la regle pour satisfaite. C'est pourquoi
 * "aucune story designee" est une violation et non un succes silencieux.
 */
function evaluerParStory({ texte, regles, numero }) {
  const violations = [];
  const aLire = [];
  const stories = decouperStories(texte);

  for (const regle of regles) {
    const cibles = stories.filter((st) => contientTerme(st.entete, regle.si));
    const libelle = regle.libelle ?? `stories designees par "${regle.si}"`;

    if (cibles.length === 0) {
      violations.push({
        type: "selecteur_sans_cible", run: numero, selecteur: regle.si,
        message:
          `Run ${numero} : aucune story ne correspond au selecteur "${regle.si}" (${libelle}). ` +
          `La regle n'a donc ete verifiee sur rien, ce qui est un echec et non un succes.`,
      });
      continue;
    }

    // `requis` vaut pour l'ensemble des stories designees, pas pour chacune.
    //
    // Mesure du 2026-11-26 sur 10 runs : exiger le nom du client dans CHAQUE
    // story designee comptait 3 manquements, alors que la story principale de
    // la fonctionnalite le portait dans 9 runs sur 10. Les deux signalements
    // supplementaires visaient une story secondaire, et la clause n'exige pas
    // que chaque story liee repete le nom : elle exige que la fonctionnalite
    // soit rattachee au client, ce qu'une mention satisfait.
    //
    // Cette assertion trop stricte faisait passer le taux de 1/10 a 3/10, et
    // aurait fait conclure a une regression du correctif de prompt qui n'a pas
    // eu lieu.
    for (const terme of regle.requis ?? []) {
      if (!cibles.some((c) => contientTerme(c.texte, terme))) {
        violations.push({
          type: "marqueur_requis_absent", run: numero, terme, selecteur: regle.si,
          message:
            `Run ${numero} : le terme requis "${terme}" n'apparait dans aucune des ` +
            `${cibles.length} story(s) ${libelle}.`,
        });
      }
    }

    for (const cible of cibles) {
      const r = evaluerRun({
        texte: cible.texte, contexte: "", numero,
        assertions: {
          interdits: regle.interdits, graphieExacte: regle.graphieExacte,
        },
      });
      for (const v of r.violations) {
        violations.push({
          ...v, story: cible.numero, selecteur: regle.si,
          message: v.message.replace(`Run ${numero} :`, `Run ${numero}, story ${cible.numero} (${libelle}) :`),
        });
      }

      // `surveiller` : termes dont la presence merite une lecture sans etre
      // decidable par machine.
      //
      // Mesure du 2026-11-26 sur 10 runs : interdire toute mention du
      // programme de fidelite dans la story de nouvelle fonctionnalite donnait
      // un faux positif sur trois. Deux runs l'inventaient (un acces
      // privilegie aux nouvelles fonctionnalites, une fonctionnalite reservee
      // aux membres), un le citait exactement comme justification metier, ce
      // qui est legitime.
      //
      // La distinction entre les deux est semantique, donc hors de portee
      // d'une assertion. Et elle est fondee dans la clause du prompt
      // elle-meme : sur une categorie de produits absente, AUCUN fait
      // documente n'a sa place, donc l'interdiction est decidable ; sur une
      // nouvelle fonctionnalite portant sur des produits documentes, les faits
      // documentes sont au contraire attendus, et seule leur extension a ce
      // qui n'existe pas est fautive.
      for (const terme of regle.surveiller ?? []) {
        if (contientTerme(cible.texte, terme)) {
          aLire.push({
            type: "terme_a_surveiller", run: numero, story: cible.numero, terme, selecteur: regle.si,
            message:
              `Run ${numero}, story ${cible.numero} (${libelle}) : "${terme}" apparait. ` +
              `Verifier qu'il est cite tel que les documents l'enoncent, et non etendu a cette fonctionnalite.`,
          });
        }
      }
    }
  }
  return { violations, aLire };
}

/**
 * Évalue une génération isolée.
 *
 * @param {object} p
 * @param {string|null} p.texte sortie du modèle, null ou vide si le run a échoué
 * @param {string} p.contexte concaténation des chunks injectés
 * @param {object} p.assertions
 * @param {string[]} [p.assertions.interdits] ne doivent jamais apparaître
 * @param {string[]} [p.assertions.requis] doivent apparaître dans chaque run
 * @param {string[]} [p.assertions.graphieExacte] termes documentés à reproduire à l'identique
 * @param {number} [p.numero] numéro du run, pour les messages
 * @returns {{violations: object[], aLire: object[]}}
 */
export function evaluerRun({ texte, contexte = "", assertions = {}, numero = 1 }) {
  const violations = [];
  const aLire = [];

  // Échec fermé. Un run sans sortie n'est pas un run à ignorer, c'est une
  // violation : probe-generation annonçait "Sorties ecrites" après quatre
  // échecs HTTP d'affilée, et sortait malgré tout en code 0.
  if (!texte || String(texte).trim().length === 0) {
    violations.push({ type: "run_echoue", run: numero, message: `Run ${numero} : aucune sortie.` });
    return { violations, aLire };
  }

  for (const terme of assertions.interdits ?? []) {
    if (contientTerme(texte, terme)) {
      violations.push({
        type: "marqueur_interdit", run: numero, terme,
        message: `Run ${numero} : le terme interdit "${terme}" apparaît.`,
      });
    }
  }

  for (const terme of assertions.requis ?? []) {
    if (!contientTerme(texte, terme)) {
      violations.push({
        type: "marqueur_requis_absent", run: numero, terme,
        message: `Run ${numero} : le terme requis "${terme}" est absent.`,
      });
    }
  }

  for (const terme of assertions.graphieExacte ?? []) {
    // Une violation par graphie fautive, pas une par occurrence : le run 4 du
    // 2026-11-26 écrivait "Luméo+" sept fois et produisait sept lignes
    // identiques, ce qui noie le rapport sans rien ajouter.
    const fautives = new Map();
    for (const graphie of graphiesRencontrees(texte, terme)) {
      if (graphie !== terme) fautives.set(graphie, (fautives.get(graphie) ?? 0) + 1);
    }
    for (const [graphie, occurrences] of fautives) {
      violations.push({
        type: "graphie_alteree", run: numero, terme, graphie, occurrences,
        message:
          `Run ${numero} : "${terme}" est écrit "${graphie}" (${occurrences} fois), ` +
          `graphie absente des documents.`,
      });
    }
  }

  if ((assertions.parStory ?? []).length > 0) {
    const r = evaluerParStory({ texte, regles: assertions.parStory, numero });
    violations.push(...r.violations);
    aLire.push(...r.aLire);
  }

  const horsContexte = [...chiffres(texte)].filter((n) => !chiffres(contexte).has(n));
  if (horsContexte.length > 0) {
    aLire.push({
      type: "chiffres_hors_contexte", run: numero, valeurs: horsContexte,
      message:
        `Run ${numero} : chiffres absents du contexte (${horsContexte.join(", ")}). ` +
        `Un montant d'illustration dans un scénario Gherkin est légitime, une règle métier chiffrée ne l'est pas.`,
    });
  }

  return { violations, aLire };
}

/**
 * Évalue une campagne complète.
 *
 * @param {object} p
 * @param {Array<string|null>} p.sorties générations, dans l'ordre
 * @param {number} p.runsDemandes nombre de runs demandés
 * @param {string} p.contexte concaténation des chunks injectés
 * @param {object} p.assertions voir evaluerRun
 * @returns {{violations: object[], aLire: object[], succes: boolean}}
 */
export function evaluerCampagne({ sorties = [], runsDemandes, contexte = "", assertions = {} }) {
  const violations = [];
  const aLire = [];

  // Le nombre de runs effectués doit égaler le nombre demandé. Sans cette
  // assertion, quatre échecs sur cinq passaient pour un succès assorti d'une
  // ligne d'avertissement noyée dans la sortie.
  if (sorties.length !== runsDemandes) {
    violations.push({
      type: "runs_manquants",
      message: `${sorties.length} run(s) enregistré(s) pour ${runsDemandes} demandé(s).`,
    });
  }

  const chiffresParRun = new Map();
  sorties.forEach((texte, i) => {
    const r = evaluerRun({ texte, contexte, assertions, numero: i + 1 });
    violations.push(...r.violations);
    for (const signalement of r.aLire) {
      // Les chiffres sont agrégés plus bas : cinq lignes répétant "150, 85"
      // ne disent pas ce qu'une ligne "150 (5/5), 250 (1/5)" dit tout de suite.
      if (signalement.type === "chiffres_hors_contexte") {
        for (const v of signalement.valeurs) chiffresParRun.set(v, (chiffresParRun.get(v) ?? 0) + 1);
      } else {
        aLire.push(signalement);
      }
    }
  });

  if (chiffresParRun.size > 0) {
    const n = sorties.filter((t) => t && t.trim().length > 0).length;
    const liste = [...chiffresParRun.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([v, c]) => `${v} (${c}/${n})`);
    aLire.push({
      type: "chiffres_hors_contexte", valeurs: liste,
      message:
        `Chiffres absents du contexte : ${liste.join(", ")}. ` +
        `Un montant stable sur tous les runs est en général une valeur d'illustration ; ` +
        `un chiffre qui n'apparaît qu'une fois mérite une lecture.`,
    });
  }

  // Variance entre runs, sur les termes du contexte uniquement.
  //
  // Ce n'est pas un verdict, et la formulation d'origine ("ce qui varie est
  // inventé") est fausse dans les deux sens : mesuré le 2026-11-26, quatre
  // termes variables étaient documentés, et deux montants stables sur 5 runs
  // étaient absents du corpus. Mais la variance reste le seul signal
  // automatisable qui aurait fait remonter le run 5, où une règle documentée
  // ailleurs (accès 48h avant pour les membres du programme) a été appliquée à
  // une fonctionnalité qui n'existe pas. Un fait documenté réellement pertinent
  // tend à revenir dans la plupart des runs ; celui qui n'apparaît qu'une fois
  // est souvent celui qu'on étire.
  const valides = sorties.filter((t) => t && t.trim().length > 0);
  if (valides.length >= 2) {
    const termesContexte = vocabulaireFactuel(contexte);
    const comptes = new Map();
    for (const texte of valides) {
      for (const mot of motsSignificatifs(texte)) {
        if (termesContexte.has(mot)) comptes.set(mot, (comptes.get(mot) ?? 0) + 1);
      }
    }
    const instables = [...comptes.entries()]
      .filter(([, n]) => n < valides.length)
      .sort((a, b) => a[1] - b[1])
      .map(([mot, n]) => `${mot} (${n}/${valides.length})`);
    if (instables.length > 0) {
      aLire.push({
        type: "faits_documentes_instables", valeurs: instables,
        message:
          `Faits documentés employés dans une partie des runs seulement : ${instables.join(", ")}. ` +
          `Vérifier qu'aucun n'est appliqué à ce que les documents ne couvrent pas.`,
      });
    }
  }

  return { violations, aLire, succes: violations.length === 0 };
}
