import { useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
`;

const FieldError = styled.p`
  font-size: 0.85rem;
  color: var(--field-error);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InfoBanner = styled.div`
  background: var(--info-bg);
  border: 1px solid var(--info-border);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.85rem;
  color: var(--info-text);
  display: flex;
  align-items: flex-start;
  gap: 8px;

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
  border: 2px solid ${({ $hasError }) => ($hasError ? "var(--field-error)" : "var(--input-border)")};
  font-size: 1rem;
  font-family: "Plus Jakarta Sans", sans-serif;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, color 0.2s;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text);
  box-shadow: var(--input-shadow);

  &::placeholder {
    color: var(--input-placeholder);
  }

  &:focus {
    border-color: ${({ $hasError }) => ($hasError ? "var(--field-error)" : "#6366f1")};
    box-shadow: 0 0 0 3px ${({ $hasError }) => ($hasError ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.15)")};
  }

  &:disabled {
    background-color: var(--input-disabled-bg);
    color: var(--input-disabled-text);
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

function detectLang(text) {
  if (!text || text.trim().length < 8) return "fr";
  const frPattern = /[àâéèêëîïôùûüç]|(?:^|\s)(je|le|la|les|de|du|un|une|et|est|ce|qui|que|dans|pour|avec|sur|pas|plus|nous|vous|ils|elles)(?:\s|$)/i;
  return frPattern.test(text) ? "fr" : "en";
}

const i18n = {
  fr: {
    empty: "Le brief ne peut pas être vide.",
    submit: "Générer les user stories",
    loading: "Génération en cours...",
  },
  en: {
    empty: "The brief cannot be empty.",
    submit: "Generate user stories",
    loading: "Generating...",
  },
};

function BriefInput({ onSubmit, isLoading }) {
  const [brief, setBrief] = useState("");
  const [fieldError, setFieldError] = useState("");

  const lang = detectLang(brief);
  const t = i18n[lang];

  const handleSubmit = () => {
    if (brief.trim() === "") {
      setFieldError(t.empty);
      return;
    }
    setFieldError("");
    onSubmit(brief);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
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
        placeholder="Décris ton besoin métier ici... (Entrée pour soumettre, Shift+Entrée pour aller à la ligne)"
        value={brief}
        onChange={(e) => { setBrief(e.target.value); if (fieldError) setFieldError(""); }}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        $hasError={!!fieldError}
        aria-invalid={!!fieldError}
        aria-describedby={fieldError ? "brief-error" : undefined}
      />
      {fieldError && (
        <FieldError id="brief-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {fieldError}
        </FieldError>
      )}
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? t.loading : t.submit}
      </Button>
    </Container>
  );
}

export default BriefInput;
