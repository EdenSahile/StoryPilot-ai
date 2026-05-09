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
  color: var(--field-error);
  margin: 0;
  max-width: calc(100% - 32px);

  @media (max-width: 480px) {
    top: 48px;
    right: 12px;
    font-size: 0.72rem;
  }
`;

const CopyButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--copy-bg);
  border: 1px solid var(--border);
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
    background: var(--copy-hover-bg);
    border-color: #6366f1;
  }

  &.copied {
    background: var(--copy-copied-bg);
    border-color: var(--copy-copied-border);
    color: var(--copy-copied-text);
  }

  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 0.78rem;
    top: 12px;
    right: 12px;
  }
`;

const StoryCard = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--card-shadow);
  line-height: 1.7;
  transition: background 0.2s, border-color 0.2s;

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
    color: var(--text-strong);
    margin-top: 20px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  p {
    margin-bottom: 8px;
    color: var(--text-body);
  }

  ul,
  ol {
    padding-left: 24px;
    color: var(--text-list);
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
    color: var(--text-strong);
    font-weight: 600;
  }

  em {
    color: #6366f1;
    font-style: italic;
  }

  hr {
    border: none;
    border-top: 2px solid var(--border);
    margin: 28px 0;
  }

  code {
    display: block;
    background: var(--code-bg);
    border-left: 3px solid #6366f1;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 0.85rem;
    color: var(--code-text);
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
          <ReactMarkdown>{stories.replace(/^[ \t]*[-*][ \t]*$/gm, "").replace(/\n{3,}/g, "\n\n")}</ReactMarkdown>
        </StoryCard>
      </StoryCardWrapper>
    </Container>
  );
}

export default StoriesOutput;
