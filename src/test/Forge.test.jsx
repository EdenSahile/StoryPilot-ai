import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Forge from '../screens/Forge';
import { retrieveContext } from '../components/services/ragService';
import { generateStories } from '../components/services/claudeService';

vi.mock('../components/services/ragService', () => ({
  retrieveContext: vi.fn().mockResolvedValue({ chunks: [] }),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

vi.mock('../components/services/claudeService', () => ({
  generateStories: vi.fn().mockResolvedValue(undefined),
}));

function renderForge() {
  return render(
    <Forge
      brief="Je veux gérer les retours produits pour mes clients"
      setBrief={vi.fn()}
      stories=""
      setStories={vi.fn()}
      ragChunks={[]}
      setRagChunks={vi.fn()}
      documents={[]}
      setDocuments={vi.fn()}
      setTruncated={vi.fn()}
      onNavigate={vi.fn()}
    />
  );
}

describe('Forge — toggle Générer sans RAG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle retrieveContext par défaut (RAG activé)', async () => {
    renderForge();

    fireEvent.click(screen.getByRole('button', { name: /Générer les user stories/i }));

    await waitFor(() => expect(generateStories).toHaveBeenCalled());
    expect(retrieveContext).toHaveBeenCalledWith('Je veux gérer les retours produits pour mes clients');
  });

  it("n'appelle pas retrieveContext quand le toggle est coché", async () => {
    renderForge();

    fireEvent.click(screen.getByLabelText(/Générer sans RAG/i));
    fireEvent.click(screen.getByRole('button', { name: /Générer les user stories/i }));

    await waitFor(() => expect(generateStories).toHaveBeenCalled());
    expect(retrieveContext).not.toHaveBeenCalled();
  });
});
