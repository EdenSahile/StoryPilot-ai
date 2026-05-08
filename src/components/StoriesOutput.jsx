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

const CopyButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #6366f1;
  font-weight: 500;

  &:hover {
    background: #f8fafc;
    border-color: #6366f1;
  }

  &.copied {
    background: #dbeafe;
    border-color: #0284c7;
    color: #0284c7;
  }
`;

const StoryCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  line-height: 1.7;

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

  ul {
    padding-left: 20px;
    color: #475569;
    margin-bottom: 12px;
  }

  li {
    margin-bottom: 4px;
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
  }
`;

function StoriesOutput({ stories }) {
  const [copied, setCopied] = useState(false);

  if (!stories) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stories);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erreur lors de la copie:", err);
    }
  };

  return (
    <Container>
      <StoryCardWrapper>
        <CopyButton onClick={handleCopy} className={copied ? "copied" : ""}>
          {copied ? "✓ Copié!" : "📋 Copier"}
        </CopyButton>
        <StoryCard>
          <ReactMarkdown>{stories}</ReactMarkdown>
        </StoryCard>
      </StoryCardWrapper>
    </Container>
  );
}

export default StoriesOutput;
