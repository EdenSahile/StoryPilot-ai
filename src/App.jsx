import { useState } from "react";
import styled from "styled-components";
import { generateStories } from "./components/services/claudeService";
import BriefInput from "./components/BriefInput";
import StoriesOutput from "./components/StoriesOutput";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";

const Wrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
  font-family: "Plus Jakarta Sans", sans-serif;

  @media (max-width: 768px) {
    padding: 28px 16px;
  }

  @media (max-width: 480px) {
    padding: 20px 12px;
  }
`;

const HeaderRow = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 40px;

  @media (max-width: 768px) {
    margin-bottom: 28px;
  }

  @media (max-width: 480px) {
    margin-bottom: 20px;
  }
`;

const Title = styled.h1`
  text-align: center;
  font-size: 2.5rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 1.9rem;
  }

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const ThemeToggle = styled.button`
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  min-width: 36px;
  min-height: 36px;

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
  }

  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`;

const LoadingText = styled.p`
  text-align: center;
  color: #6366f1;
  font-style: italic;
  margin: 20px 0;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }
`;

const ErrorMessage = styled.div`
  background-color: var(--error-bg);
  border: 1px solid var(--error-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  color: var(--error-text);
  font-size: 0.95rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  button {
    background: none;
    border: none;
    color: var(--error-text);
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      opacity: 0.7;
    }
  }
`;

function App() {
  const [stories, setStories] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark"
  );

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("sf-theme", next ? "dark" : "light");
  };

  const handleSubmit = async (brief) => {
    setStories("");
    setError(null);
    setIsLoading(true);

    await generateStories(
      brief,
      (chunk) => {
        setStories((prev) => prev + chunk);
      },
      (errorMsg) => {
        setError(errorMsg);
        setIsLoading(false);
      },
    );

    setIsLoading(false);
  };

  return (
    <ErrorBoundary>
      <Wrapper>
        <HeaderRow>
          <Title>StoryForge AI</Title>
          <ThemeToggle
            onClick={toggleTheme}
            aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
            title={isDark ? "Mode clair" : "Mode sombre"}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </ThemeToggle>
        </HeaderRow>

        <BriefInput onSubmit={handleSubmit} isLoading={isLoading} />

        {error && (
          <ErrorMessage>
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </ErrorMessage>
        )}

        {isLoading && <LoadingText>Génération en cours ...</LoadingText>}
        <StoriesOutput stories={stories} />
        <Footer />
      </Wrapper>
    </ErrorBoundary>
  );
}
export default App;
