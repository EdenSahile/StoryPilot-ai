import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Results from '../screens/Results';

const STORIES = `**User Story 1** En tant qu'utilisateur, je veux me connecter afin d'accéder à mon compte.

**Critères d'acceptation :**
- Le formulaire valide l'email
- Le mot de passe est masqué

**Complexité :** S

---

**User Story 2** En tant qu'administrateur, je veux gérer les accès afin de contrôler les utilisateurs.

**Critères d'acceptation :**
- Seul un admin peut modifier les rôles

**Complexité :** M`;

describe('Results — badge RAG', () => {
  it('affiche "RAG non utilisé" quand aucun chunk n\'a été récupéré', () => {
    render(<Results stories={STORIES} ragChunks={[]} />);
    expect(screen.getByText('RAG non utilisé — US Générique')).toBeInTheDocument();
    expect(screen.queryByText('Sources utilisées')).not.toBeInTheDocument();
  });

  it('affiche "RAG actif" et les sources avec leur score quand des chunks sont fournis', () => {
    render(
      <Results
        stories={STORIES}
        ragChunks={[
          { filename: '05_facture_exemple.pdf', score: 46 },
          { filename: '05_facture_exemple.pdf', score: 30 },
          { filename: '04_archive_commandes.pdf', score: 45 },
        ]}
      />
    );

    expect(screen.getByText('RAG actif')).toBeInTheDocument();
    expect(screen.getByText('Sources utilisées')).toBeInTheDocument();
    expect(screen.getByText('05_facture_exemple.pdf')).toBeInTheDocument();
    expect(screen.getByText('46%')).toBeInTheDocument();
    expect(screen.getByText('04_archive_commandes.pdf')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });
});

describe('Results — boutons Copier', () => {
  it('affiche un bouton "Copier tout" global et un bouton Copier par user story', () => {
    render(<Results stories={STORIES} />);

    expect(screen.getByText('Copier tout')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Copier cette user story' })).toHaveLength(2);
  });

  it('copie uniquement le contenu de la story cliquée', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<Results stories={STORIES} />);
    const storyButtons = screen.getAllByRole('button', { name: 'Copier cette user story' });
    fireEvent.click(storyButtons[1]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('User Story 2'));
    });
    expect(writeText).not.toHaveBeenCalledWith(STORIES);
  });

  it('le bouton global copie tout le texte brut des stories', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<Results stories={STORIES} />);
    fireEvent.click(screen.getByText('Copier tout'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(STORIES);
    });
  });
});
