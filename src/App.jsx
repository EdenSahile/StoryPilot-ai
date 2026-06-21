// App.jsx — StoryForge AI v2
// Remplace l'App.jsx existant

import { useState, useEffect, useRef } from "react";
import { saveGeneration } from "./utils/libraryStorage";
import { listDocuments } from "./components/services/ragService";
import styled, { createGlobalStyle } from "styled-components";
import { theme } from "./theme";
import Sidebar from "./components/layout/Sidebar";
import BottomNav from "./components/layout/BottomNav";
import Dashboard from "./screens/Dashboard";
import Forge from "./screens/Forge";
import Results from "./screens/Results";
import ErrorBoundary from "./components/ErrorBoundary";

import Library from "./screens/Library";

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    background: ${theme.colors.background};
    color: ${theme.colors.onSurface};
    font-family: ${theme.fonts.sans};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100vh;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${theme.colors.surfaceContainerLow}; }
  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.surfaceContainerHighest};
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb:hover { background: ${theme.colors.outlineVariant}; }

  /* Material Symbols */
  .material-symbols-outlined,
  span[class="icon"] {
    font-family: 'Material Symbols Outlined';
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
  }
`;

// Placeholder screens pour les routes pas encore construites
const PlaceholderScreen = styled.div`
  margin-left: 240px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  color: ${theme.colors.onSurfaceVariant};

  @media (max-width: ${theme.breakpoints.mobile}) {
    margin-left: 0;
  }

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 48px;
    opacity: 0.3;
  }

  p {
    font-size: 18px;
    opacity: 0.5;
  }
`;

function App() {
  const [currentScreen, setCurrentScreen] = useState("dashboard");
  const [brief, setBrief] = useState("");
  const [stories, setStories] = useState("");
  const [ragChunks, setRagChunks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const savedFingerprintRef = useRef(null);

  useEffect(() => {
    if (currentScreen === "results" && stories && !truncated) {
      if (savedFingerprintRef.current === stories) return;
      savedFingerprintRef.current = stories;
      const sources = [...new Set(ragChunks.map((c) => c.filename))];
      const storiesCount = (stories.match(/\*\*User Story \d+\*\*/g) || []).length;
      saveGeneration({ brief, stories, sourcesUsed: sources, storiesCount });
      setAutoSaved(true);
    }
  }, [currentScreen, stories, truncated]);

  useEffect(() => {
    listDocuments()
      .then((docs) =>
        setDocuments(
          docs.map((d) => ({
            id: d.filename,
            name: d.filename,
            chunks: d.totalChunks,
            uploadedAt: d.uploadedAt,
            status: "indexed",
          }))
        )
      )
      .catch((err) => console.warn("[list-docs] Failed to load documents:", err));
  }, []);

  const handleNavigate = (screen) => {
    if (screen === "forge" && autoSaved) {
      setBrief("");
      setStories("");
      setRagChunks([]);
      setTruncated(false);
      setAutoSaved(false);
      savedFingerprintRef.current = null;
    }
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "forge":
        return <Forge onNavigate={setCurrentScreen} brief={brief} setBrief={setBrief} stories={stories} setStories={setStories} ragChunks={ragChunks} setRagChunks={setRagChunks} documents={documents} setDocuments={setDocuments} setTruncated={setTruncated} />;
      case "results":
        return (
          <Results
            brief={brief}
            stories={stories}
            ragChunks={ragChunks}
            truncated={truncated}
            autoSaved={autoSaved}
            onNewGeneration={() => { setBrief(""); setStories(""); setRagChunks([]); setTruncated(false); setAutoSaved(false); savedFingerprintRef.current = null; setCurrentScreen("forge"); }}
            onNavigate={setCurrentScreen}
          />
        );
      case "library":
        return <Library onNavigate={handleNavigate} />;
      case "settings":
        return (
          <PlaceholderScreen>
            <span className="icon">settings</span>
            <p>Settings — en cours de construction</p>
          </PlaceholderScreen>
        );
      default:
        return <Dashboard onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <ErrorBoundary>
      <GlobalStyle />
      <Sidebar activeItem={currentScreen} onNavigate={handleNavigate} />
      {renderScreen()}
      <BottomNav activeItem={currentScreen} onNavigate={setCurrentScreen} />
    </ErrorBoundary>
  );
}

export default App;
