import { useState } from "react";
import styled from "styled-components";
import { generateStories } from "./components/services/claudeService";
import BriefInput from "./components/BriefInput";
import StoriesOutput from "./components/StoriesOutput";
import ErrorBoundary from "./components/ErrorBoundary";

const Wrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: "Inter", sans-serif;
`;

const Title = styled.h1`
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 40px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  color: #991b1b;
  font-size: 0.95rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  button {
    background: none;
    border: none;
    color: #991b1b;
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

  const handleSubmit = async (brief) => {
    // Reset states
    setStories("");
    setError(null);
    setIsLoading(true);

    // Appel au service Claude avec error handler
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

    // Marquer comme terminé une fois que tout est reçu
    setIsLoading(false);
  };

  return (
    <ErrorBoundary>
      <Wrapper>
        <Title>StoryForge AI</Title>
        <BriefInput onSubmit={handleSubmit} isLoading={isLoading} />

        {error && (
          <ErrorMessage>
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </ErrorMessage>
        )}

        {isLoading && <LoadingText>Génération en cours ...</LoadingText>}
        <StoriesOutput stories={stories} />
      </Wrapper>
    </ErrorBoundary>
  );
}
export default App;
