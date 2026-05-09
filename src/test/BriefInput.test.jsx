import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BriefInput from '../components/BriefInput';

describe('BriefInput', () => {
  it('affiche le textarea et le bouton', () => {
    render(<BriefInput onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /générer/i })).toBeInTheDocument();
  });

  it('désactive le textarea et le bouton pendant le chargement', () => {
    render(<BriefInput onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('affiche "Génération en cours..." pendant le chargement', () => {
    render(<BriefInput onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByText('Génération en cours...')).toBeInTheDocument();
  });

  it('appelle onSubmit avec le brief saisi au clic', async () => {
    const onSubmit = vi.fn();
    render(<BriefInput onSubmit={onSubmit} isLoading={false} />);

    await userEvent.type(screen.getByRole('textbox'), 'Mon brief métier');
    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledWith('Mon brief métier');
  });

  it('n\'appelle pas onSubmit si le brief est vide', () => {
    const onSubmit = vi.fn();
    render(<BriefInput onSubmit={onSubmit} isLoading={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('soumet avec Ctrl+Entrée', () => {
    const onSubmit = vi.fn();
    render(<BriefInput onSubmit={onSubmit} isLoading={false} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Mon brief métier' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onSubmit).toHaveBeenCalledWith('Mon brief métier');
  });
});
