import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RELEVANCE_THRESHOLD } from '../../api/_ingest.js';

// Ce test vérifie la PROPRIÉTÉ de sécurité du seuil de pertinence, pas sa
// valeur. La distinction est l'objet du test.
//
// api-ingest.test.js assertait `expect(RELEVANCE_THRESHOLD).toBe(0.46)`. Ce
// test-là reste vert après une réindexation, un changement de découpage ou
// l'ajout d'un document, c'est-à-dire après exactement les événements capables
// de faire passer un chunk hors-sujet au-dessus du seuil. Le 2026-11-25, une
// réindexation a déplacé le pire brief hors-sujet de +0,60 point d'un seul
// coup, et le seuil d'alors (0,45) est passé du mauvais côté sans qu'aucun test
// ne bronche. La marge actuelle est de 0,76 point : un second déplacement de
// cette ampleur la consomme à 80 %.
//
// La propriété à tenir, dans la fenêtre de production (topK=5) :
//   max(score hors-sujet) < seuil < min(score pertinent)
//
// Les scores viennent de src/test/calibration-snapshot.json, écrit par
// `npm run calibrate-threshold` (qui a besoin des clés OpenAI et Pinecone).
// Le snapshot est versionné : ce test tourne hors ligne, à chaque npm test,
// sans aucune clé.
//
// Ce que ce test NE fait pas : vérifier que le snapshot est à jour. Un snapshot
// pris sur un index qui a changé depuis est vert à tort. La fraîcheur relève de
// `npm run check-index`, qui a l'accès live. La règle reste donc : recalibrer
// après TOUTE réindexation.

const SNAPSHOT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'calibration-snapshot.json',
);

const COMMANDE = 'npm run calibrate-threshold';

describe('Seuil de pertinence — propriété de séparation', () => {
  // Échouer fermé. Un snapshot absent signifie que la propriété n'est
  // vérifiée par rien, ce qui est le cas à signaler, pas à ignorer. Un
  // `it.skip` conditionnel ici produirait un quatrième faux vert.
  it('dispose du snapshot de calibration', () => {
    expect(
      existsSync(SNAPSHOT_PATH),
      `Snapshot de calibration absent. Le lancer une fois : ${COMMANDE}`,
    ).toBe(true);
  });

  const snapshot = existsSync(SNAPSHOT_PATH)
    ? JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))
    : null;

  // Le snapshot ne contient aucun agrégat : min, max et moyennes sont
  // recalculés ici depuis les scores bruts. Un verdict qui lit un résumé
  // stocké fait confiance à celui qui l'a écrit.
  const briefs = snapshot?.briefs ?? [];
  const scores = (label) =>
    briefs.filter((b) => b.label === label).map((b) => b.topScore);

  // Math.max d'un tableau vide vaut -Infinity, Math.min vaut +Infinity : sans
  // cette garde, toutes les comparaisons de marge ci-dessous passent à vide
  // quand le snapshot est absent ou qu'un groupe a disparu. Un test qui réussit
  // sans matière est précisément le faux vert que ce fichier existe pour éviter.
  const scoresNonVides = (label) => {
    const valeurs = scores(label);
    expect(
      valeurs.length,
      `Aucun brief "${label}" dans le snapshot : rien à vérifier, donc rien de vérifié. ` +
        `Relancer ${COMMANDE}.`,
    ).toBeGreaterThan(0);
    return valeurs;
  };

  const seuilPct = Math.round(RELEVANCE_THRESHOLD * 10000) / 100;

  it('a été calibré contre le seuil réellement appliqué par le code', () => {
    expect(
      snapshot?.threshold,
      `Le snapshot a été calibré contre ${snapshot?.threshold}, le code applique ` +
        `${RELEVANCE_THRESHOLD}. Relancer ${COMMANDE} après tout changement de seuil.`,
    ).toBe(RELEVANCE_THRESHOLD);
  });

  it('a été calibré avec les mêmes paramètres d\'embedding que le retrieval', () => {
    expect(snapshot?.embeddingModel).toBe('text-embedding-3-small');
    expect(snapshot?.embeddingDimensions).toBe(512);
  });

  // Garde-fou contre l'échantillon dégénéré : Math.max d'un tableau vide vaut
  // -Infinity, qui passe toutes les comparaisons ci-dessous sans rien prouver.
  it('contient les deux groupes en nombre suffisant', () => {
    expect(scores('on-topic').length).toBeGreaterThanOrEqual(10);
    expect(scores('off-topic').length).toBeGreaterThanOrEqual(11);
  });

  it('garde le pire hors-sujet strictement sous le seuil', () => {
    const pire = Math.max(...scoresNonVides('off-topic'));
    const brief = briefs.find(
      (b) => b.label === 'off-topic' && b.topScore === pire,
    );
    expect(
      pire,
      `Pire brief hors-sujet à ${pire}% pour un seuil à ${seuilPct}% ` +
        `("${brief?.brief}"). Un chunk hors-sujet entre dans le prompt : ` +
        `recalibrer le seuil, ne pas retirer le brief de l'échantillon.`,
    ).toBeLessThan(seuilPct);
  });

  it('garde le pertinent le plus faible strictement au-dessus du seuil', () => {
    const faible = Math.min(...scoresNonVides('on-topic'));
    const brief = briefs.find(
      (b) => b.label === 'on-topic' && b.topScore === faible,
    );
    expect(
      faible,
      `Brief pertinent le plus faible à ${faible}% pour un seuil à ${seuilPct}% ` +
        `("${brief?.brief}"). Ce brief génère sans aucun contexte documentaire.`,
    ).toBeGreaterThan(seuilPct);
  });

  // Les deux cas de reproduction historiques restent dans l'échantillon et du
  // bon côté de l'étiquetage. Sans cette assertion, la façon la plus simple de
  // faire passer le test après une réindexation ratée serait de supprimer le
  // brief qui gêne.
  it.each([
    ['vêtements', 'essayer virtuellement des vêtements'],
    ['téléphone (PR #78)', 'choisir la couleur de mon téléphone'],
  ])('conserve le cas de reproduction %s, étiqueté hors-sujet', (_nom, extrait) => {
    const trouve = briefs.find((b) => b.brief.includes(extrait));
    expect(
      trouve,
      `Le cas de reproduction "${extrait}" a disparu de l'échantillon de calibration.`,
    ).toBeDefined();
    expect(trouve.label).toBe('off-topic');
  });

  // La marge se juge contre le plancher de bruit de la chaîne, mesuré à 0,03
  // point le 2026-11-25 (trois sondes du même brief : 45,24 % puis 45,27 %).
  // Une marge positive mais inférieure au bruit serait un tirage au sort.
  it('garde une marge supérieure au plancher de bruit des deux côtés', () => {
    const bruit = snapshot?.noiseFloorPct ?? 0.03;
    const margeHorsSujet = seuilPct - Math.max(...scoresNonVides('off-topic'));
    const margePertinent = Math.min(...scoresNonVides('on-topic')) - seuilPct;
    expect(margeHorsSujet).toBeGreaterThan(bruit);
    expect(margePertinent).toBeGreaterThan(bruit);
  });
});
