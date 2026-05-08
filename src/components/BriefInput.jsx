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
  align-items: center;
  gap: 8px;

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(135deg, #3730a3, #4c1d95);
    border-color: #6366f1;
    color: #e9d5ff;
  }

  strong {
    font-weight: 600;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  font-size: 1rem;
  font-family: "Inter", sans-serif;
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
`;

const Button = styled.button`
  align-self: flex-end;
  padding: 12px 28px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

function BriefInput({ onSubmit, isLoading }) {
  const [brief, setBrief] = useState("");

  const handleSubmit = () => {
    if (brief.trim() === "") return;
    onSubmit(brief);
  };

  const handleKeyPress = (e) => {
    // Ctrl+Enter ou Cmd+Enter pour soumettre
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <Container>
      <InfoBanner>
        ℹ️{" "}
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
        onKeyPress={handleKeyPress}
        disabled={isLoading}
      />
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "Génération en cours..." : "Générer les user stories"}
      </Button>
    </Container>
  );
}

export default BriefInput;
