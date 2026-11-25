import { describe, it, expect } from 'vitest';
import {
  chunkDocument,
  buildVectorRecords,
  sourceHash,
  vectorIdPrefix,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from '../../api/_ingest.js';

const TEXTE_LONG = 'Les suspensions Luméo sont livrées sous 48 heures. '.repeat(40);
const TEXTE_COURT = 'Le paiement en plusieurs fois via Alma est disponible dès 100 euros.';

function fausssEmbeddings(n, dims = 2) {
  return Array.from({ length: n }, () => new Array(dims).fill(0.1));
}

// Ces valeurs décident de la forme de l'index entier. Les changer rend l'index
// existant obsolète : il faut réindexer (npm run reindex:apply) et recalibrer
// le seuil de pertinence (npm run calibrate-threshold). Ce test est là pour
// qu'un changement involontaire soit impossible à committer sans le voir.
describe('api/_ingest — paramètres de la pipeline (verrou)', () => {
  it('expose les paramètres documentés dans le README et CLAUDE.md', () => {
    expect(CHUNK_SIZE).toBe(500);
    expect(CHUNK_OVERLAP).toBe(50);
    expect(EMBEDDING_MODEL).toBe('text-embedding-3-small');
    expect(EMBEDDING_DIMENSIONS).toBe(512);
  });
});

describe('api/_ingest — chunkDocument', () => {
  it('ne produit aucun chunk plus long que CHUNK_SIZE', async () => {
    const chunks = await chunkDocument(TEXTE_LONG);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(CHUNK_SIZE);
    }
  });

  it('renvoie un seul chunk pour un texte plus court que CHUNK_SIZE', async () => {
    const chunks = await chunkDocument(TEXTE_COURT);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(TEXTE_COURT);
  });

  it('est déterministe : deux appels sur le même texte donnent le même découpage', async () => {
    const a = await chunkDocument(TEXTE_LONG);
    const b = await chunkDocument(TEXTE_LONG);
    expect(a).toEqual(b);
  });
});

describe('api/_ingest — sourceHash', () => {
  it('est stable pour un même texte', () => {
    expect(sourceHash(TEXTE_LONG)).toBe(sourceHash(TEXTE_LONG));
  });

  it('change dès que le texte change d\'un seul caractère', () => {
    expect(sourceHash(TEXTE_COURT)).not.toBe(sourceHash(TEXTE_COURT + '.'));
  });

  it('renvoie 16 caractères hexadécimaux', () => {
    expect(sourceHash(TEXTE_COURT)).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('api/_ingest — vectorIdPrefix', () => {
  it('assainit le nom de fichier et termine par _chunk_', () => {
    expect(vectorIdPrefix('06_faq service-client.pdf')).toBe('06_faq_service_client_pdf_chunk_');
  });

  // Rappel d'une limite réelle, déjà gérée côté appelants : deux noms
  // différents peuvent s'assainir vers le même préfixe. L'appartenance doit
  // être confirmée via metadata.filename avant toute suppression.
  it("n'est pas injectif : deux noms distincts peuvent partager un préfixe", () => {
    expect(vectorIdPrefix('doc!.txt')).toBe(vectorIdPrefix('doc?.txt'));
  });
});

describe('api/_ingest — buildVectorRecords', () => {
  it('numérote les identifiants dans l\'ordre, à partir de 0', async () => {
    const chunks = await chunkDocument(TEXTE_LONG);
    const records = buildVectorRecords({
      filename: 'guide.pdf',
      text: TEXTE_LONG,
      chunks,
      embeddings: fausssEmbeddings(chunks.length),
    });
    expect(records).toHaveLength(chunks.length);
    records.forEach((r, i) => {
      expect(r.id).toBe(`guide_pdf_chunk_${i}`);
      expect(r.metadata.chunkIndex).toBe(i);
    });
  });

  // Le cœur du correctif de la session INDEX-DESYNCHRONISE : sans ces champs,
  // un index construit par une autre version de la pipeline est indétectable
  // autrement qu'en devinant le découpage depuis le nombre de chunks.
  it('inscrit l\'identité de la pipeline dans chaque vecteur', async () => {
    const chunks = await chunkDocument(TEXTE_LONG);
    const records = buildVectorRecords({
      filename: 'guide.pdf',
      text: TEXTE_LONG,
      chunks,
      embeddings: fausssEmbeddings(chunks.length),
    });
    for (const r of records) {
      expect(r.metadata.chunkSize).toBe(CHUNK_SIZE);
      expect(r.metadata.chunkOverlap).toBe(CHUNK_OVERLAP);
      expect(r.metadata.embeddingModel).toBe(EMBEDDING_MODEL);
      expect(r.metadata.sourceHash).toBe(sourceHash(TEXTE_LONG));
      expect(r.metadata.totalChunks).toBe(chunks.length);
      expect(r.metadata.filename).toBe('guide.pdf');
    }
  });

  // Un horodatage par chunk faisait passer un document indexé en une fois pour
  // un document indexé en plusieurs fois lors des diagnostics.
  it('donne le même uploadedAt à tous les chunks d\'un document', async () => {
    const chunks = await chunkDocument(TEXTE_LONG);
    const records = buildVectorRecords({
      filename: 'guide.pdf',
      text: TEXTE_LONG,
      chunks,
      embeddings: fausssEmbeddings(chunks.length),
    });
    expect(new Set(records.map((r) => r.metadata.uploadedAt)).size).toBe(1);
  });

  it('accepte un uploadedAt fourni par l\'appelant', async () => {
    const chunks = await chunkDocument(TEXTE_COURT);
    const records = buildVectorRecords({
      filename: 'a.txt',
      text: TEXTE_COURT,
      chunks,
      embeddings: fausssEmbeddings(chunks.length),
      uploadedAt: '2026-06-21T10:21:31.068Z',
    });
    expect(records[0].metadata.uploadedAt).toBe('2026-06-21T10:21:31.068Z');
  });

  it('refuse un désalignement entre chunks et embeddings', () => {
    expect(() =>
      buildVectorRecords({
        filename: 'a.txt',
        text: 'abc',
        chunks: ['a', 'b'],
        embeddings: fausssEmbeddings(1),
      }),
    ).toThrow(/Désalignement/);
  });

  it('refuse des entrées qui ne sont pas des tableaux', () => {
    expect(() =>
      buildVectorRecords({ filename: 'a.txt', text: 'abc', chunks: 'a', embeddings: [] }),
    ).toThrow(/tableaux/);
  });
});
