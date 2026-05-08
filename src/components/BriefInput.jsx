import { useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
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

  &:hover {
    opacity: 0.85;
  }
`;

function BriefInput({ onSubmit }) {
  const [brief, setbrief] = useState("");

  const handleSubmit = () => {
    if (brief.trim() === "") return;
    onSubmit(brief);
  };

  return (
    <Container>
      <TextArea
        placeholder="Décris ton besoin métier ici ..."
        value={brief}
        onChange={(e) => setbrief(e.target.value)}
      />
      <Button onClick={handleSubmit}>Générer les user stories</Button>
    </Container>
  );
}

export default BriefInput;
