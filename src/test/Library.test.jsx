import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Library from '../screens/Library';
import { saveGeneration } from '../utils/libraryStorage';

function seed(n) {
  for (let i = 0; i < n; i++) {
    saveGeneration({
      brief: `Brief ${i}`,
      stories: `**User Story 1** Contenu ${i}`,
      sourcesUsed: [],
      storiesCount: 1,
    });
  }
}

describe('Library — Supprimer tout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ne montre pas le bouton "Supprimer tout" quand l\'historique est vide', () => {
    render(<Library />);
    expect(screen.queryByRole('button', { name: /Supprimer tout/ })).not.toBeInTheDocument();
  });

  it('montre le bouton "Supprimer tout" quand des générations existent', () => {
    seed(2);
    render(<Library />);
    expect(screen.getByRole('button', { name: /Supprimer tout/ })).toBeInTheDocument();
  });

  it('supprime toutes les générations après confirmation', () => {
    seed(3);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Library />);

    expect(screen.getByText(/3 génération/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Supprimer tout/ }));

    expect(screen.getByText('Aucune génération sauvegardée pour l\'instant.', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Supprimer tout/ })).not.toBeInTheDocument();
  });

  it('ne supprime rien si l\'utilisateur annule la confirmation', () => {
    seed(2);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Library />);

    fireEvent.click(screen.getByRole('button', { name: /Supprimer tout/ }));

    expect(screen.getByRole('button', { name: /Supprimer tout/ })).toBeInTheDocument();
  });
});
