import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StoriesOutput from '../components/StoriesOutput';

describe('StoriesOutput', () => {
  it('ne rend rien si stories est null', () => {
    const { container } = render(<StoriesOutput stories={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ne rend rien si stories est une chaîne vide', () => {
    const { container } = render(<StoriesOutput stories="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('affiche le contenu markdown quand stories est fourni', () => {
    render(<StoriesOutput stories="**User Story 1**" />);
    expect(screen.getByText('User Story 1')).toBeInTheDocument();
  });

  it('affiche le bouton Copier', () => {
    render(<StoriesOutput stories="Une user story" />);
    expect(screen.getByText('📋 Copier')).toBeInTheDocument();
  });

  it('affiche "✓ Copié!" après un clic réussi', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<StoriesOutput stories="Une user story" />);
    fireEvent.click(screen.getByText('📋 Copier'));

    await waitFor(() => {
      expect(screen.getByText('✓ Copié!')).toBeInTheDocument();
    });
  });

  it('affiche un message d\'erreur si clipboard échoue', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
    });

    render(<StoriesOutput stories="Une user story" />);
    fireEvent.click(screen.getByText('📋 Copier'));

    await waitFor(() => {
      expect(screen.getByText('Copie impossible — essayez manuellement')).toBeInTheDocument();
    });
  });
});
