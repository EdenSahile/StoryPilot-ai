import { useState } from "react";
import ReactMarkdown from "react-markdown";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 32px;
`;

const StoryCardWrapper = styled.div`
  position: relative;
`;

const CopyError = styled.p`
  position: absolute;
  top: 52px;
  right: 16px;
  font-size: 0.78rem;
  color: #dc2626;
  margin: 0;
  max-width: calc(100% - 32px);

  @media (max-width: 480px) {
    top: 48px;
    right: 12px;
    font-size: 0.72rem;
  }

  @media (prefers-color-scheme: dark) {
    color: #f87171;
  }
`;

const CopyButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-family: "Plus Jakarta Sans", sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  color: #6366f1;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  white-space: nowrap;

  &:hover {
    background: #f8fafc;
    border-color: #6366f1;
  }

  &.copied {
    background: #dbeafe;
    border-color: #0284c7;
    color: #0284c7;
  }

  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 0.78rem;
    top: 12px;
    right: 12px;
  }

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border-color: #334155;
    color: #818cf8;

    &:hover {
      background: #0f172a;
      border-color: #6366f1;
    }

    &.copied {
      background: #1e3a5f;
      border-color: #0369a1;
      color: #7dd3fc;
    }
  }
`;

const StoryCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  line-height: 1.7;

  @media (max-width: 768px) {
    padding: 60px 20px 24px;
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    padding: 56px 16px 20px;
  }

  h2 {
    font-size: 1.1rem;
    color: #6366f1;
    margin-top: 24px;
    margin-bottom: 8px;
  }

  h3 {
    font-size: 1rem;
    color: #1e293b;
    margin-top: 20px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  p {
    margin-bottom: 8px;
    color: #334155;
  }

  ul,
  ol {
    padding-left: 24px;
    color: #475569;
    margin-bottom: 12px;
  }

  li {
    margin-bottom: 4px;
  }

  li > ul,
  li > ol {
    margin-top: 4px;
    margin-bottom: 4px;
    padding-left: 20px;
  }

  strong {
    color: #1e293b;
    font-weight: 600;
  }

  em {
    color: #6366f1;
    font-style: italic;
  }

  hr {
    border: none;
    border-top: 2px solid #e2e8f0;
    margin: 28px 0;
  }

  code {
    display: block;
    background: #f1f5f9;
    border-left: 3px solid #6366f1;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 0.85rem;
    color: #334155;
    margin: 8px 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: "Monaco", "Courier New", monospace;
    overflow-x: auto;

    @media (max-width: 480px) {
      font-size: 0.78rem;
      padding: 10px 12px;
    }
  }

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

    h2 {
      color: #818cf8;
    }

    h3 {
      color: #e2e8f0;
    }

    p {
      color: #cbd5e1;
    }

    ul,
    ol {
      color: #94a3b8;
    }

    strong {
      color: #e2e8f0;
    }

    em {
      color: #818cf8;
    }

    hr {
      border-top-color: #334155;
    }

    code {
      background: #0f172a;
      color: #cbd5e1;
    }
  }
`;

function StoriesOutput({ stories }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  if (!stories) return null;

  const handleCopy = async () => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(stories);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  return (
    <Container>
      <StoryCardWrapper>
        <CopyButton onClick={handleCopy} className={copied ? "copied" : ""} aria-label={copied ? "Copié" : "Copier le contenu"}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              Copié!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copier
            </>
          )}
        </CopyButton>
        {copyError && <CopyError>Copie impossible — essayez manuellement</CopyError>}
        <StoryCard>
          <ReactMarkdown>{stories}</ReactMarkdown>
        </StoryCard>
      </StoryCardWrapper>
    </Container>
  );
}

export default StoriesOutput;
