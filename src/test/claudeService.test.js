import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStories } from '../components/services/claudeService';

describe('generateStories — validation', () => {
  let onChunk, onError;

  beforeEach(() => {
    onChunk = vi.fn();
    onError = vi.fn();
  });

  it('appelle onError si le brief est vide', async () => {
    await generateStories('', onChunk, onError);
    expect(onError).toHaveBeenCalledWith('Veuillez entrer un brief métier.');
    expect(onChunk).not.toHaveBeenCalled();
  });

  it('appelle onError si le brief est uniquement des espaces', async () => {
    await generateStories('   ', onChunk, onError);
    expect(onError).toHaveBeenCalledWith('Veuillez entrer un brief métier.');
  });

  it('appelle onError si le brief est trop court (< 10 chars)', async () => {
    await generateStories('court', onChunk, onError);
    expect(onError).toHaveBeenCalledWith('Le brief doit contenir au moins 10 caractères.');
  });

  it('appelle onError si le brief dépasse 2000 caractères', async () => {
    await generateStories('a'.repeat(2001), onChunk, onError);
    expect(onError).toHaveBeenCalledWith('Le brief ne peut pas dépasser 2000 caractères.');
  });

  it('accepte un brief valide (entre 10 et 2000 chars) et appelle fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Erreur test' }),
      status: 400,
    });

    await generateStories('Un brief métier valide', onChunk, onError);
    expect(fetch).toHaveBeenCalledWith('/api/generate-stories', expect.objectContaining({
      method: 'POST',
    }));
  });
});

describe('generateStories — erreurs réseau', () => {
  let onChunk, onError;

  beforeEach(() => {
    onChunk = vi.fn();
    onError = vi.fn();
  });

  it('appelle onError sur erreur réseau (Failed to fetch)', async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new TypeError('Failed to fetch')
    );

    await generateStories('Un brief métier valide pour test', onChunk, onError);
    expect(onError).toHaveBeenCalledWith('Erreur réseau. Vérifiez votre connexion.');
  });

  it('appelle onError avec le message de l\'API si réponse non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Trop de requêtes. Réessayez dans quelques secondes.' }),
    });

    await generateStories('Un brief métier valide pour test', onChunk, onError);
    expect(onError).toHaveBeenCalledWith('Trop de requêtes. Réessayez dans quelques secondes.');
  });

  it('appelle onError avec fallback si réponse non-ok sans body JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => { throw new Error('not json'); },
    });

    await generateStories('Un brief métier valide pour test', onChunk, onError);
    expect(onError).toHaveBeenCalledWith('Erreur: 503');
  });
});
