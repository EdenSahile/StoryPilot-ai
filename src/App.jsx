import { useState } from "react";
import { generateStories } from "./components/services/claudeService";
import BriefInput from "./components/BriefInput";
import StoriesOutput from "./components/StoriesOutput";
import styled from "styled-components";

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
`;

function App() {
  const [stories, setStories] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (brief) => {
    setStories("");
    setIsLoading(true);

    await generateStories(brief, (chunk) => {
      setStories((prev) => prev + chunk);
      setIsLoading(false);
    });
  };

  return (
    <Wrapper>
      <Title>StoryForge AI</Title>
      <BriefInput onSubmit={handleSubmit} />
      {isLoading && <LoadingText>Génération en cours ...</LoadingText>}
      <StoriesOutput stories={stories} />
    </Wrapper>
  );
}
export default App;
