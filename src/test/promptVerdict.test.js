import { describe, it, expect } from 'vitest';
import {
  normaliser,
  contientTerme,
  graphiesRencontrees,
  evaluerRun,
  evaluerCampagne,
} from '../../scripts/lib/prompt-verdict.mjs';

// Les cas de ce fichier ne sont pas inventés : ce sont les six fausses
// vérifications rencontrées les 25 et 26 novembre 2026, transformées en
// assertions. Un moteur de verdict qui ne les attrape pas ne sert à rien,
// puisque c'est exactement ce qui a été cru à tort pendant deux jours.

const CONTEXTE = [
  "Les membres Lumeo+ reçoivent également un accès en avant-première aux",
  "nouvelles collections, généralement 48h avant le grand public, ainsi qu'une",
  "invitation aux ventes privées organisées deux fois par an.",
  "Q : Proposez-vous le paiement en plusieurs fois ? R : Oui, via Alma, en 3 ou",
  "4 fois sans frais à partir de 100€ d'achat.",
  "Une commande peut être modifiée ou annulée gratuitement dans les 2 heures",
  "suivant la validation. Passé ce délai, contactez le SAV.",
].join('\n');

describe('prompt-verdict — normalisation et frontières de mot', () => {
  it('ignore les accents dans les deux sens', () => {
    expect(normaliser('Luméo Boutique')).toBe('lumeo boutique');
    expect(contientTerme('mon téléphone bleu', 'telephone')).toBe(true);
    expect(contientTerme('mon telephone bleu', 'téléphone')).toBe(true);
    expect(contientTerme('le client Lumeo', 'Luméo')).toBe(true);
  });

  // Faux positif réel du 2026-11-26 : une recherche par inclusion simple a
  // trouvé "ral" dans "généraliste" et m'a fait croire qu'un run citait les
  // références de teintes RAL du corpus.
  it("ne trouve pas un terme à l'intérieur d'un autre mot", () => {
    expect(contientTerme('un e-commerce généraliste', 'ral')).toBe(false);
    expect(contientTerme('je consulte un almanach', 'alma')).toBe(false);
    expect(contientTerme('la pantoufle', 'pantone')).toBe(false);
  });

  it('trouve le terme quand il est bien isolé', () => {
    expect(contientTerme('paiement via Alma en 3 fois', 'alma')).toBe(true);
    expect(contientTerme('références RAL ou Pantone', 'ral')).toBe(true);
  });
});

describe('prompt-verdict — graphie des termes documentés', () => {
  // Défaut mesuré le 2026-11-26, run 4 : le modèle a écrit "Luméo+" sept fois
  // là où le corpus écrit "Lumeo+". L'accent du nom d'entreprise, posé comme
  // autorité dans les métadonnées, contamine un nom de produit documenté.
  it('relève une graphie altérée', () => {
    expect(graphiesRencontrees('le programme Luméo+ offre 5%', 'Lumeo+')).toEqual(['Luméo+']);
  });

  it('accepte la graphie exacte', () => {
    expect(graphiesRencontrees('le programme Lumeo+ offre 5%', 'Lumeo+')).toEqual(['Lumeo+']);
  });

  it('fait échouer le run quand la graphie est altérée', () => {
    const { violations } = evaluerRun({
      texte: 'En tant que membre Luméo+, je veux cumuler mon cashback.',
      contexte: CONTEXTE,
      assertions: { graphieExacte: ['Lumeo+'] },
    });
    expect(violations.map((v) => v.type)).toContain('graphie_alteree');
    expect(violations[0].message).toContain('Luméo+');
  });
});

describe('prompt-verdict — échec fermé', () => {
  // probe-generation annonçait "Sorties ecrites" après quatre échecs HTTP
  // d'affilée. Un run sans sortie est une violation, pas un run à ignorer.
  it('traite une sortie vide comme une violation', () => {
    for (const vide of [null, '', '   ']) {
      const { violations } = evaluerRun({ texte: vide, contexte: CONTEXTE });
      expect(violations.map((v) => v.type)).toEqual(['run_echoue']);
    }
  });

  // Faux vert numéro 2, moitié non corrigée : process.exitCode n'était posé que
  // si ZERO run aboutissait. Quatre échecs sur cinq passaient pour un succès.
  it('échoue quand il manque des runs, même si les autres sont propres', () => {
    const r = evaluerCampagne({
      sorties: ['une sortie propre'],
      runsDemandes: 5,
      contexte: CONTEXTE,
      assertions: {},
    });
    expect(r.succes).toBe(false);
    expect(r.violations.map((v) => v.type)).toContain('runs_manquants');
    expect(r.violations[0].message).toContain('1 run(s)');
  });
});

describe('prompt-verdict — marqueurs interdits et requis', () => {
  it('relève un marqueur interdit', () => {
    const { violations } = evaluerRun({
      texte: "le showroom de Lyon permet d'essayer les produits",
      contexte: CONTEXTE,
      assertions: { interdits: ['showroom', 'Lyon'] },
    });
    expect(violations).toHaveLength(2);
    expect(violations.every((v) => v.type === 'marqueur_interdit')).toBe(true);
  });

  // Les assertions positives manquaient entièrement à l'outillage : il ne
  // vérifiait que des interdits. Sans elles, une correction du prompt peut
  // recasser le cas qu'elle était censée débloquer avec un harnais tout vert.
  it('relève un marqueur requis absent', () => {
    const { violations } = evaluerRun({
      texte: 'En tant que client, je veux payer en plusieurs fois.',
      contexte: CONTEXTE,
      assertions: { requis: ['Luméo Boutique'] },
    });
    expect(violations.map((v) => v.type)).toEqual(['marqueur_requis_absent']);
  });

  it('ne relève rien quand tout est conforme', () => {
    const { violations } = evaluerRun({
      texte: 'En tant que client de Luméo Boutique, je veux payer via Alma.',
      contexte: CONTEXTE,
      assertions: { requis: ['Luméo Boutique'], interdits: ['showroom'], graphieExacte: ['Lumeo+'] },
    });
    expect(violations).toEqual([]);
  });
});

describe('prompt-verdict — ce qui est signalé sans faire échouer', () => {
  // Mesuré le 2026-11-26 : 85 et 150 apparaissent dans les 5 runs et sont
  // absents du corpus. Ce sont des montants d'illustration choisis de part et
  // d'autre du seuil documenté de 100€, donc exactement ce qu'un scénario
  // Gherkin doit faire. Les signaler, jamais les faire échouer.
  it('signale les chiffres absents du contexte sans échouer', () => {
    const r = evaluerRun({
      texte: 'Étant donné que mon panier contient 150€ et un autre de 85€',
      contexte: CONTEXTE,
      assertions: {},
    });
    expect(r.violations).toEqual([]);
    expect(r.aLire).toHaveLength(1);
    expect(r.aLire[0].valeurs).toEqual(expect.arrayContaining(['150', '85']));
  });

  it('ne signale pas un chiffre présent dans le contexte', () => {
    const r = evaluerRun({
      texte: 'le paiement est disponible à partir de 100€',
      contexte: CONTEXTE,
      assertions: {},
    });
    expect(r.aLire).toEqual([]);
  });

  // Le cas qui a tout motivé. Run 5 du 2026-11-26 : "les membres Lumeo+
  // accèdent à cette fonctionnalité 48h avant sa disponibilité publique".
  // Les 48h et Lumeo+ sont documentés, la règle qui les combine ne l'est pas.
  // Aucune liste de marqueurs ne peut l'attraper, puisque chaque terme
  // apparaît aussi dans les runs propres. La variance est le seul signal.
  it('signale un fait documenté employé dans un seul run sur cinq', () => {
    const propre = 'En tant que client de Luméo Boutique, je veux voir le luminaire en réalité augmentée.';
    const suspect = propre + " Les membres Lumeo+ y accèdent 48h avant le grand public.";
    const r = evaluerCampagne({
      sorties: [propre, propre, propre, propre, suspect],
      runsDemandes: 5,
      contexte: CONTEXTE,
      assertions: {},
    });
    expect(r.succes).toBe(true); // signalement, pas échec
    const variance = r.aLire.find((a) => a.type === 'faits_documentes_instables');
    expect(variance).toBeDefined();
    expect(variance.valeurs.join(' ')).toContain('48h');
  });

  it('ne signale rien quand les faits documentés sont employés partout', () => {
    const texte = 'Paiement via Alma à partir de 100€.';
    const r = evaluerCampagne({
      sorties: [texte, texte, texte],
      runsDemandes: 3,
      contexte: CONTEXTE,
      assertions: {},
    });
    expect(r.aLire.find((a) => a.type === 'faits_documentes_instables')).toBeUndefined();
  });
});

describe('prompt-verdict — campagne complète', () => {
  it('réussit sur cinq runs conformes et agrège les numéros de run', () => {
    const bon = 'En tant que client de Luméo Boutique, je veux payer via Alma à partir de 100€.';
    const r = evaluerCampagne({
      sorties: [bon, bon, bon, bon, bon],
      runsDemandes: 5,
      contexte: CONTEXTE,
      assertions: { requis: ['Luméo Boutique'], interdits: ['showroom', 'Lyon'] },
    });
    expect(r.succes).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it('identifie le run fautif dans une campagne par ailleurs propre', () => {
    const bon = 'En tant que client de Luméo Boutique, je veux payer via Alma.';
    const fautif = bon + " Le showroom de Lyon ouvrira bientôt.";
    const r = evaluerCampagne({
      sorties: [bon, bon, fautif, bon, bon],
      runsDemandes: 5,
      contexte: CONTEXTE,
      assertions: { requis: ['Luméo Boutique'], interdits: ['showroom'] },
    });
    expect(r.succes).toBe(false);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].run).toBe(3);
  });
});

describe('prompt-verdict — corrections issues des campagnes du 2026-11-26', () => {
  // Le run 4 écrivait "Luméo+" sept fois et produisait sept lignes identiques.
  it('groupe les occurrences d\'une même graphie fautive en une violation', () => {
    const texte = 'Luméo+ ici, Luméo+ là, et encore Luméo+.';
    const { violations } = evaluerRun({ texte, assertions: { graphieExacte: ['Lumeo+'] } });
    expect(violations).toHaveLength(1);
    expect(violations[0].occurrences).toBe(3);
  });

  // La première version de la variance sortait "politique (1/5), modifiee
  // (1/5), gratuitement (1/5)..." et noyait le seul terme qui comptait.
  it('limite la variance au vocabulaire factuel du contexte', () => {
    const contexte = "La politique de retour est modifiee gratuitement. Les membres Lumeo+ y accedent 48h avant.";
    const commun = 'le retour est modifiee gratuitement selon la politique';
    const factuel = commun + ' Les membres Lumeo+ y accedent 48h avant.';
    const r = evaluerCampagne({
      sorties: [commun, commun, commun, commun, factuel],
      runsDemandes: 5, contexte, assertions: {},
    });
    const variance = r.aLire.find((a) => a.type === 'faits_documentes_instables');
    const liste = variance.valeurs.join(' ');
    expect(liste).toContain('48h');
    expect(liste).toContain('lumeo+');
    expect(liste).not.toContain('gratuitement');
    expect(liste).not.toContain('politique');
  });

  // Cinq lignes répétant "150, 85" ne disent pas ce qu'une ligne agrégée dit.
  it('agrège les chiffres hors contexte avec leur fréquence', () => {
    const stable = 'un panier de 150€';
    const isole = 'un panier de 150€ et un remboursement de 999€';
    const r = evaluerCampagne({
      sorties: [stable, stable, stable, stable, isole],
      runsDemandes: 5, contexte: 'seuil de 100€', assertions: {},
    });
    const chiffres = r.aLire.filter((a) => a.type === 'chiffres_hors_contexte');
    expect(chiffres).toHaveLength(1);
    expect(chiffres[0].valeurs).toEqual(expect.arrayContaining(['999 (1/5)', '150 (5/5)']));
  });
});
