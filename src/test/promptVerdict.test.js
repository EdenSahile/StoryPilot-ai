import { describe, it, expect } from 'vitest';
import {
  normaliser,
  decouperStories,
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

describe('prompt-verdict — assertions portées par story', () => {
  // Fixture realiste : dans les generations reelles une story fait 1 500 a
  // 2 500 caracteres, et les coordonnees du SAV apparaissent dans les criteres
  // d'acceptation, bien au-dela de l'en-tete. Une premiere version de cette
  // fixture faisait 200 caracteres, ce qui placait la mention du SAV dans
  // l'en-tete et faisait echouer le test. C'est la limite de l'heuristique,
  // documentee par le dernier test de ce bloc.
  const STORY_PAIEMENT = [
    '**User Story 1** En tant que client de Luméo Boutique, je veux payer via Alma.',
    '**Titre :** Paiement fractionné',
    '**Description :** Luméo Boutique propose le paiement en plusieurs fois sans frais via le partenaire Alma, disponible en 3 ou 4 fois a partir de 100 euros d achat. Cette fonctionnalite doit etre clairement visible lors du tunnel de commande, et le client doit pouvoir visualiser le montant de chaque echeance avant de valider son panier.',
    '**Criteres :**',
    '- Le montant de chaque echeance est affiche avant validation',
    "- Passé ce délai, contactez le SAV par chat ou téléphone.",
  ].join('\n');
  const STORY_TELEPHONE = [
    '**User Story 2** En tant que client achetant un téléphone, je veux choisir sa couleur.',
    '**Titre :** Sélectionner la couleur',
    '**Description :** Le client doit pouvoir choisir parmi les coloris.',
  ].join('\n');

  it('découpe une génération en user stories', () => {
    const stories = decouperStories(STORY_PAIEMENT + '\n\n' + STORY_TELEPHONE);
    expect(stories).toHaveLength(2);
    expect(stories[1].entete).toContain('téléphone');
  });

  // Le selecteur s'applique a l'en-tete et non au corps entier. Mesure du
  // 2026-11-26 : sur le corps entier, une story de paiement qui mentionne
  // "telephone" comme canal de contact du SAV etait designee a tort.
  it('ne désigne pas une story qui mentionne le terme hors de son en-tête', () => {
    const { violations } = evaluerRun({
      texte: STORY_PAIEMENT + '\n\n' + STORY_TELEPHONE,
      assertions: {
        parStory: [{ si: 'téléphone', libelle: 'categorie absente', interdits: ['Luméo Boutique'] }],
      },
    });
    // La story 1 nomme le client mais n'est pas designee ; la story 2 est
    // designee et ne le nomme pas. Aucune violation.
    expect(violations).toEqual([]);
  });

  it('relève un terme interdit dans la story désignée, en la nommant', () => {
    const fautive = STORY_TELEPHONE + "\nLes membres Lumeo+ y accèdent 48h avant.";
    const { violations } = evaluerRun({
      texte: STORY_PAIEMENT + '\n\n' + fautive,
      assertions: {
        parStory: [{ si: 'téléphone', libelle: 'categorie absente', interdits: ['Lumeo+', '48h'] }],
      },
    });
    expect(violations).toHaveLength(2);
    expect(violations[0].story).toBe(2);
    expect(violations[0].message).toContain('story 2');
    expect(violations[0].message).toContain('categorie absente');
  });

  // Le point faible de toute verification sur une sortie stochastique : le
  // modele reformule et le selecteur cesse de designer quoi que ce soit. Une
  // regle verifiee sur rien doit echouer, jamais reussir en silence.
  it('échoue quand le sélecteur ne désigne aucune story', () => {
    const { violations } = evaluerRun({
      texte: STORY_PAIEMENT,
      assertions: { parStory: [{ si: 'réalité augmentée', interdits: ['Lumeo+'] }] },
    });
    expect(violations.map((v) => v.type)).toEqual(['selecteur_sans_cible']);
    expect(violations[0].message).toContain('verifiee sur rien');
  });

  it('tolère un terme en plusieurs mots coupé par un retour à la ligne', () => {
    expect(contientTerme('visualiser en réalité\naugmentée dans mon salon', 'réalité augmentée')).toBe(true);
  });
});

describe('prompt-verdict — limite assumée du sélecteur', () => {
  // L'en-tete de 300 caracteres est une heuristique calibree sur des stories
  // reelles de 1 500 a 2 500 caracteres. Sur une story courte, un terme qui
  // apparait tardivement tombe quand meme dans l'en-tete et la story est
  // designee a tort.
  //
  // Ce test existe pour que la limite soit ecrite plutot que decouverte. Le
  // sens de la defaillance est le bon : une story designee a tort produit une
  // violation visible, jamais un succes silencieux. Un faux rouge se corrige a
  // la lecture, un faux vert ne se voit pas.
  it('désigne à tort une story trop courte dont le terme apparaît tardivement', () => {
    const courte = [
      '**User Story 1** En tant que client, je veux payer via Alma.',
      '**Titre :** Paiement',
      'Contactez le SAV par téléphone.',
    ].join('\n');
    const { violations } = evaluerRun({
      texte: courte,
      assertions: { parStory: [{ si: 'téléphone', interdits: ['Alma'] }] },
    });
    expect(violations.map((v) => v.type)).toEqual(['marqueur_interdit']);
  });
});

describe('prompt-verdict — surveiller plutôt qu\'interdire', () => {
  const STORY_RA = [
    '**User Story 2** En tant que client de Luméo Boutique, je veux visualiser les luminaires en réalité augmentée.',
    '**Titre :** Prévisualisation AR',
    '**Description :** Cette fonctionnalité permettra de projeter un luminaire dans son espace, particulièrement pour les membres Lumeo+ qui représentent 40% des clients actifs.',
  ].join('\n');

  // Mesure du 2026-11-26 sur 10 runs : interdire toute mention du programme de
  // fidelite dans la story de nouvelle fonctionnalite donnait un faux positif
  // sur trois. Deux runs l'inventaient, un le citait exactement.
  it('signale un terme surveillé sans faire échouer', () => {
    const r = evaluerRun({
      texte: STORY_RA,
      assertions: {
        parStory: [{
          si: 'réalité augmentée',
          libelle: 'nouvelle fonctionnalite',
          requis: ['Luméo Boutique'],
          surveiller: ['Lumeo+'],
        }],
      },
    });
    expect(r.violations).toEqual([]);
    // Filtre par type : sans contexte fourni, les chiffres de la story (40 %,
    // 2,3) produisent aussi un signalement "chiffres hors contexte", legitime.
    const surveilles = r.aLire.filter((a) => a.type === 'terme_a_surveiller');
    expect(surveilles).toHaveLength(1);
    expect(surveilles[0].terme).toBe('Lumeo+');
    expect(surveilles[0].story).toBe(1);
  });

  // L'assertion decidable reste une violation : la clause exige que le nom du
  // client figure sur une story de nouvelle fonctionnalite, et le run 8 du
  // 2026-11-26 ne le mettait pas.
  it('fait toujours échouer sur un marqueur requis absent dans la story visée', () => {
    const sansNom = STORY_RA.replace('client de Luméo Boutique', 'membre Luméo+');
    const r = evaluerRun({
      texte: sansNom,
      assertions: {
        parStory: [{ si: 'réalité augmentée', requis: ['Luméo Boutique'], surveiller: ['Lumeo+'] }],
      },
    });
    expect(r.violations.map((v) => v.type)).toEqual(['marqueur_requis_absent']);
    expect(r.aLire.some((a) => a.type === 'terme_a_surveiller')).toBe(true);
  });
});

describe('prompt-verdict — portée de requis dans parStory', () => {
  const principale = '**User Story 2** En tant que client de Luméo Boutique, je veux visualiser en réalité augmentée.\n**Titre :** Prévisualisation AR';
  const secondaire = '**User Story 3** En tant que membre Lumeo+, je veux ajouter au panier depuis la réalité augmentée.\n**Titre :** Achat depuis la vue AR';

  // Mesure du 2026-11-26 sur 10 runs : exiger le nom dans CHAQUE story
  // designee comptait 3 manquements la ou la story principale le portait dans
  // 9 runs sur 10. L'assertion trop stricte aurait fait conclure a une
  // regression du prompt qui n'a pas eu lieu.
  it('est satisfait si une seule des stories désignées porte le terme', () => {
    const { violations } = evaluerRun({
      texte: principale + '\n\n' + secondaire,
      assertions: { parStory: [{ si: 'réalité augmentée', requis: ['Luméo Boutique'] }] },
    });
    expect(violations).toEqual([]);
  });

  it('échoue si aucune des stories désignées ne porte le terme', () => {
    const { violations } = evaluerRun({
      texte: secondaire,
      assertions: { parStory: [{ si: 'réalité augmentée', requis: ['Luméo Boutique'] }] },
    });
    expect(violations.map((v) => v.type)).toEqual(['marqueur_requis_absent']);
    expect(violations[0].message).toContain("n'apparait dans aucune");
  });

  // Les interdictions restent evaluees story par story : un terme interdit
  // dans une seule story est une violation, meme si les autres sont propres.
  it('garde les interdits au niveau de chaque story', () => {
    const { violations } = evaluerRun({
      texte: principale + '\n\n' + secondaire,
      assertions: {
        parStory: [{ si: 'réalité augmentée', requis: ['Luméo Boutique'], interdits: ['Lumeo+'] }],
      },
    });
    expect(violations).toHaveLength(1);
    expect(violations[0].story).toBe(2);
  });
});
