import { useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
`;

const InfoBanner = styled.div`
  background: linear-gradient(135deg, #e0e7ff, #f0e7ff);
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.85rem;
  color: #4c1d95;
  display: flex;
  align-items: flex-start;
  gap: 8px;

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(135deg, #3730a3, #4c1d95);
    border-color: #6366f1;
    color: #e9d5ff;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
    padding: 10px 12px;
  }

  strong {
    font-weight: 600;
  }

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  font-size: 1rem;
  font-family: "Plus Jakarta Sans", sans-serif;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: #6366f1;
  }

  &:disabled {
    background-color: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    font-size: 16px;
    min-height: 100px;
  }
`;

const Button = styled.button`
  align-self: flex-end;
  padding: 12px 28px;
  min-height: 44px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  font-family: "Plus Jakarta Sans", sans-serif;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    align-self: stretch;
    width: 100%;
  }
`;

function BriefInput({ onSubmit, isLoading }) {
  const [brief, setBrief] = useState("");

  const handleSubmit = () => {
    if (brief.trim() === "") return;
    onSubmit(brief);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <Container>
      <InfoBanner>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>
          <strong>Budget limité:</strong> Cette démo utilise un budget de
          $5/mois maximum (~660 générations). Si la limite est atteinte, vous
          verrez une erreur.
        </span>
      </InfoBanner>
      <TextArea
        placeholder="Décris ton besoin métier ici... (Ctrl+Entrée pour soumettre)"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "Génération en cours..." : "Générer les user stories"}
      </Button>
    </Container>
  );
}

export default BriefInput;
