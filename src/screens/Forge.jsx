// src/screens/Forge.jsx
import { useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { theme } from "../theme";
import { generateStories } from "../components/services/claudeService";

// ─── Animations ───────────────────────────────────────────
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.35); }
`;

// ─── Layout ───────────────────────────────────────────────
const PageWrapper = styled.div`
  margin-left: 240px;
  min-height: 100vh;
  background: ${theme.colors.background};
  animation: ${fadeInUp} 0.4s ease;

  @media (max-width: ${theme.breakpoints.mobile}) {
    margin-left: 0;
    padding-bottom: 80px;
  }
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 ${theme.spacing.lg};
  background: rgba(3, 20, 39, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${theme.colors.outlineVariant};
  gap: ${theme.spacing.sm};
`;

const TopBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex: 1;

  .title {
    font-size: ${theme.fontSizes.xl};
    font-weight: 800;
    color: ${theme.colors.onSurface};
  }

  .sep {
    color: ${theme.colors.outline};
  }

  .sub {
    font-size: ${theme.fontSizes.md};
    color: ${theme.colors.onSurfaceVariant};
  }
`;

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const GeneratingBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 6px ${theme.spacing.md};
  background: ${theme.colors.surfaceContainer};
  border-radius: ${theme.radii.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: 700;
  color: ${theme.colors.onSurfaceVariant};
  letter-spacing: 0.08em;
  text-transform: uppercase;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${theme.colors.primary};
    animation: ${pulse} 1.5s ease-in-out infinite;
  }
`;

const IconBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.onSurfaceVariant};
  cursor: pointer;
  padding: 6px;
  border-radius: ${theme.radii.sm};
  transition: all 0.2s;
  display: flex;
  align-items: center;

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 22px;
  }

  &:hover {
    color: ${theme.colors.primary};
    background: ${theme.colors.surfaceContainerHighest};
  }
`;

const Content = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: ${theme.spacing.xl};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.lg};
  }
`;

// ─── Left Column ──────────────────────────────────────────
const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const PromptSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const SectionLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xs};
  font-weight: 700;
  color: ${theme.colors.primary};
  letter-spacing: 0.1em;
  text-transform: uppercase;

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 16px;
    font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24;
  }

  .version {
    margin-left: auto;
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.onSurfaceVariant};
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
  }
`;

const TextareaWrapper = styled.div`
  position: relative;
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: ${theme.spacing.lg};
  padding-bottom: 48px;
  background: ${theme.colors.surfaceContainerHigh};
  border: 2px solid ${({ $disabled }) =>
    $disabled ? theme.colors.outlineVariant : theme.colors.outlineVariant};
  border-radius: ${theme.radii.xl};
  font-size: ${theme.fontSizes.lg};
  font-family: ${theme.fonts.sans};
  color: ${({ $disabled }) =>
    $disabled ? theme.colors.onSurfaceVariant : theme.colors.onSurface};
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "text")};
  opacity: ${({ $disabled }) => ($disabled ? 0.7 : 1)};

  &::placeholder {
    color: ${theme.colors.onSurfaceVariant};
    opacity: 0.5;
  }

  &:focus {
    border-color: ${({ $disabled }) =>
      $disabled ? theme.colors.outlineVariant : theme.colors.primary};
  }
`;

const TextareaFooter = styled.div`
  position: absolute;
  bottom: ${theme.spacing.md};
  left: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
`;

const KbdHint = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.onSurfaceVariant};
  background: rgba(38, 54, 74, 0.8);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid ${theme.colors.outlineVariant};
`;

const CharCount = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${({ $over }) => ($over ? theme.colors.error : theme.colors.onSurfaceVariant)};
  background: rgba(38, 54, 74, 0.8);
  padding: 3px 8px;
  border-radius: 6px;
`;

const GenerateBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.radii.lg};
  border: none;
  background: ${({ $disabled }) =>
    $disabled
      ? theme.colors.surfaceContainerHighest
      : "linear-gradient(135deg, #6366f1, #8b5cf6)"};
  color: ${({ $disabled }) =>
    $disabled ? theme.colors.onSurfaceVariant : "white"};
  font-weight: 700;
  font-size: ${theme.fontSizes.md};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s;
  width: 100%;
  animation: ${({ $loading }) => ($loading ? "none" : "none")};

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 20px;
    animation: ${({ $loading }) => ($loading ? spin : "none")} 1.5s linear infinite;
  }
`;

const InfoBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surfaceContainer};
  border: 1px solid ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.onSurfaceVariant};

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 18px;
    color: ${theme.colors.primary};
    flex-shrink: 0;
    margin-top: 1px;
  }

  strong {
    color: ${theme.colors.onSurface};
  }
`;

// ─── RAG Context Panel ────────────────────────────────────
const RAGPanel = styled.div`
  border-left: 3px solid ${theme.colors.primary};
  background: ${theme.colors.surface};
  border-radius: 0 ${theme.radii.lg} ${theme.radii.lg} 0;
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const RAGHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  .left {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xl};
    font-weight: 700;
    color: ${theme.colors.onSurface};

    .icon {
      font-family: "Material Symbols Outlined";
      font-size: 20px;
      color: ${theme.colors.primary};
    }
  }

  .toggle {
    background: none;
    border: none;
    color: ${theme.colors.onSurfaceVariant};
    cursor: pointer;
    font-family: "Material Symbols Outlined";
    font-size: 20px;
    transition: transform 0.2s;
    transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
  }
`;

const ChunkCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ChunkCard = styled.div`
  background: ${theme.colors.surfaceContainerLow};
  border: 1px solid ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.md};
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

  .score-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .score-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    background: ${({ $score }) =>
      $score >= 90
        ? "rgba(74, 222, 128, 0.1)"
        : $score >= 85
        ? "rgba(251, 191, 36, 0.1)"
        : "rgba(144, 143, 160, 0.1)"};
    color: ${({ $score }) =>
      $score >= 90 ? "#4ade80" : $score >= 85 ? "#fbbf24" : theme.colors.onSurfaceVariant};
    border: 1px solid ${({ $score }) =>
      $score >= 90
        ? "rgba(74, 222, 128, 0.2)"
        : $score >= 85
        ? "rgba(251, 191, 36, 0.2)"
        : "rgba(144, 143, 160, 0.2)"};
  }

  .excerpt {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.onSurfaceVariant};
    font-style: italic;
    line-height: 1.5;
  }

  .bar-track {
    height: 3px;
    background: ${theme.colors.surfaceContainerHighest};
    border-radius: 999px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 999px;
    background: ${({ $score }) =>
      $score >= 90 ? "#4ade80" : $score >= 85 ? "#fbbf24" : theme.colors.outline};
    width: ${({ $score }) => $score}%;
  }
`;

// ─── Streaming Result ─────────────────────────────────────
const StreamingCard = styled.div`
  background: ${theme.colors.surfaceContainer};
  border: 2px solid ${theme.colors.primary};
  border-radius: ${theme.radii.xl};
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  animation: ${glow} 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    right: -60px;
    bottom: -60px;
    width: 180px;
    height: 180px;
    background: rgba(99, 102, 241, 0.05);
    border-radius: 50%;
    filter: blur(30px);
  }
`;

const StreamingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${theme.colors.primary};
  background: rgba(192, 193, 255, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(192, 193, 255, 0.2);

  .spin-icon {
    font-family: "Material Symbols Outlined";
    font-size: 14px;
    animation: ${spin} 1.5s linear infinite;
  }
`;

const StreamingText = styled.div`
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.onSurface};
  line-height: 1.8;
  white-space: pre-wrap;
  font-family: ${theme.fonts.sans};

  h2, h3 {
    color: ${theme.colors.primary};
    margin: 16px 0 8px;
    font-size: ${theme.fontSizes.md};
  }

  strong {
    color: ${theme.colors.onSurface};
    font-weight: 700;
  }

  code {
    display: block;
    background: ${theme.colors.surfaceContainerLowest};
    border-left: 3px solid ${theme.colors.primary};
    padding: ${theme.spacing.md};
    border-radius: 4px;
    font-family: ${theme.fonts.mono};
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.onSurfaceVariant};
    margin: ${theme.spacing.sm} 0;
    white-space: pre-wrap;
  }
`;

const Cursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: ${theme.colors.primary};
  margin-left: 2px;
  vertical-align: middle;
  animation: ${blink} 1s step-end infinite;
`;

// ─── Empty State ──────────────────────────────────────────
const EmptyState = styled.div`
  border: 2px dashed ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.xl};
  padding: ${theme.spacing["3xl"]};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: ${theme.spacing.md};
  opacity: 0.5;

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 40px;
    color: ${theme.colors.onSurfaceVariant};
  }

  p {
    font-size: ${theme.fontSizes.md};
    color: ${theme.colors.onSurfaceVariant};
    line-height: 1.5;
  }
`;

// ─── Right Column — Knowledge Base ────────────────────────
const RightColumn = styled.div`
  @media (max-width: 1024px) {
    order: -1;
  }
`;

const KBPanel = styled.div`
  background: ${theme.colors.surfaceContainerLow};
  border: 1px solid ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.xl};
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  position: sticky;
  top: 80px;
`;

const KBHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  .left {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    font-size: ${theme.fontSizes.xl};
    font-weight: 700;
    color: ${theme.colors.onSurface};
  }

  .indexed-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: ${theme.fontSizes.xs};
    font-weight: 700;
    color: #4ade80;
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.2);
    padding: 4px 10px;
    border-radius: ${theme.radii.full};

    .icon {
      font-family: "Material Symbols Outlined";
      font-size: 14px;
    }
  }
`;

const KBSubtitle = styled.p`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.onSurfaceVariant};
  line-height: 1.5;
  margin-top: -${theme.spacing.sm};
`;

const DocList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  max-height: 280px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.surfaceContainerHighest};
    border-radius: 999px;
  }
`;

const DocCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.surfaceContainer};
  border: 1px solid ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.md};
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(192, 193, 255, 0.3);
  }

  .doc-icon {
    font-family: "Material Symbols Outlined";
    font-size: 20px;
    color: ${({ $status }) =>
      $status === "indexed"
        ? theme.colors.primary
        : $status === "loading"
        ? theme.colors.tertiary
        : theme.colors.outline};
    flex-shrink: 0;
    margin-top: 2px;
  }

  .doc-info {
    flex: 1;
    min-width: 0;

    .name {
      font-size: ${theme.fontSizes.sm};
      font-weight: 600;
      color: ${theme.colors.onSurface};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-top: 4px;
      color: ${({ $status }) =>
        $status === "indexed"
          ? "#4ade80"
          : $status === "loading"
          ? theme.colors.primary
          : theme.colors.error};
    }
  }

  .chunks-badge {
    font-size: 10px;
    font-weight: 700;
    color: #4ade80;
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.2);
    padding: 3px 8px;
    border-radius: 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .percent {
    font-size: ${theme.fontSizes.sm};
    font-weight: 700;
    color: ${theme.colors.primary};
    flex-shrink: 0;
  }
`;

const ProgressBar = styled.div`
  height: 3px;
  background: ${theme.colors.surfaceContainerHighest};
  border-radius: 999px;
  overflow: hidden;
  margin-top: 6px;

  .fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 999px;
    width: ${({ $pct }) => $pct}%;
    transition: width 0.5s ease;
  }
`;

const UploadZone = styled.div`
  border: 2px dashed ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.lg};
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: ${theme.spacing.sm};
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $dragOver }) =>
    $dragOver ? "rgba(99, 102, 241, 0.05)" : "transparent"};
  border-color: ${({ $dragOver }) =>
    $dragOver ? theme.colors.primary : theme.colors.outlineVariant};

  &:hover {
    border-color: rgba(192, 193, 255, 0.4);
    background: rgba(99, 102, 241, 0.03);
  }

  .upload-icon {
    font-family: "Material Symbols Outlined";
    font-size: 32px;
    color: ${theme.colors.outline};
    transition: color 0.2s;
  }

  &:hover .upload-icon {
    color: ${theme.colors.primary};
  }

  .upload-title {
    font-size: ${theme.fontSizes.sm};
    font-weight: 600;
    color: ${theme.colors.onSurface};
  }

  .upload-sub {
    font-size: 11px;
    color: ${theme.colors.onSurfaceVariant};
  }

  .format-badges {
    display: flex;
    gap: ${theme.spacing.sm};
    margin-top: 4px;
  }

  .format-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    background: ${theme.colors.surfaceContainerHighest};
    color: ${theme.colors.onSurfaceVariant};
    border: 1px solid ${theme.colors.outlineVariant};
  }
`;

const IndexBtn = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  border-radius: ${theme.radii.lg};
  border: 1px solid ${theme.colors.outlineVariant};
  background: transparent;
  color: ${theme.colors.onSurfaceVariant};
  font-size: ${theme.fontSizes.sm};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${theme.colors.surfaceContainerHighest};
    color: ${theme.colors.onSurface};
    border-color: rgba(192, 193, 255, 0.3);
  }
`;

// ─── Error / Copy ─────────────────────────────────────────
const ErrorMsg = styled.div`
  background: rgba(255, 180, 171, 0.1);
  border: 1px solid rgba(255, 180, 171, 0.3);
  border-radius: ${theme.radii.lg};
  padding: ${theme.spacing.md};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  display: flex;
  justify-content: space-between;
  align-items: center;

  button {
    background: none;
    border: none;
    color: ${theme.colors.error};
    cursor: pointer;
    font-size: 18px;
  }
`;

const ResultActions = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
`;

const CopyBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: ${theme.radii.md};
  border: 1px solid ${theme.colors.outlineVariant};
  background: white;
  color: ${({ $copied }) => ($copied ? "#0284c7" : theme.colors.primary)};
  background: ${({ $copied }) => ($copied ? "#dbeafe" : "white")};
  border-color: ${({ $copied }) => ($copied ? "#0284c7" : theme.colors.outlineVariant)};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 16px;
  }

  &:hover {
    border-color: ${theme.colors.primary};
  }
`;

// ─── Mock docs data ───────────────────────────────────────
const MOCK_DOCS = [
  { id: 1, name: "Cahier_des_Charges_vFinal.pdf", status: "loading", pct: 65 },
  { id: 2, name: "Notes_Brainstorming_Atelier_UX.docx", status: "indexed", chunks: 38 },
  { id: 3, name: "Architecture_Technique_Draft.txt", status: "error" },
];

const RAG_CHUNKS = [
  { score: 94, excerpt: '"L\'authentification doit supporter TOTP..."' },
  { score: 89, excerpt: '"Le système doit verrouiller le compte après..."' },
  { score: 81, excerpt: '"Documentation technique sur les flux OAuth2..."' },
];

// ─── Component ────────────────────────────────────────────
export default function Forge({ onNavigate }) {
  const [brief, setBrief] = useState("");
  const [stories, setStories] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [ragOpen, setRagOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const charCount = brief.length;
  const MAX = 2000;

  const handleSubmit = async () => {
    if (!brief.trim() || isLoading) return;
    setStories("");
    setError(null);
    setIsLoading(true);

    await generateStories(
      brief,
      (chunk) => setStories((prev) => prev + chunk),
      (errMsg) => {
        setError(errMsg);
        setIsLoading(false);
      }
    );

    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stories);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fail
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    // TODO: handle file upload in v2
  };

  return (
    <PageWrapper>
      <TopBar>
        <TopBarLeft>
          <span className="title">Forge</span>
          <span className="sep">/</span>
          <span className="sub">Drafting User Stories</span>
        </TopBarLeft>
        <TopBarRight>
          {isLoading && (
            <GeneratingBadge>
              <span className="dot" />
              Génération en cours...
            </GeneratingBadge>
          )}
          <IconBtn><span className="icon">dark_mode</span></IconBtn>
          <IconBtn><span className="icon">notifications</span></IconBtn>
        </TopBarRight>
      </TopBar>

      <Content>
        {/* ── Left Column ── */}
        <LeftColumn>
          <PromptSection>
            <SectionLabel>
              <span className="icon">edit_note</span>
              Current Prompt
              <span className="version">Version 2.4</span>
            </SectionLabel>

            <TextareaWrapper>
              <StyledTextarea
                placeholder="Décris ton besoin métier ici... (Ctrl+Entrée pour soumettre)"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                onKeyDown={handleKeyDown}
                $disabled={isLoading}
                disabled={isLoading}
              />
              <TextareaFooter>
                <KbdHint>⌘ + Enter</KbdHint>
                <CharCount $over={charCount > MAX}>
                  {charCount} / {MAX}
                </CharCount>
              </TextareaFooter>
            </TextareaWrapper>

            <GenerateBtn
              onClick={handleSubmit}
              $disabled={!brief.trim() || isLoading || charCount > MAX}
              $loading={isLoading}
              disabled={!brief.trim() || isLoading || charCount > MAX}
            >
              <span className="icon">
                {isLoading ? "sync" : "auto_awesome"}
              </span>
              {isLoading ? "Génération en cours..." : "Générer les user stories"}
            </GenerateBtn>

            <InfoBanner>
              <span className="icon">info</span>
              <span>
                <strong>Budget limité :</strong> démo $5/mois (~660 générations).
                Si la limite est atteinte, une erreur s'affichera.
              </span>
            </InfoBanner>
          </PromptSection>

          {/* Error */}
          {error && (
            <ErrorMsg>
              <span>{error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </ErrorMsg>
          )}

          {/* RAG Chunks Panel — visible pendant génération */}
          {isLoading && (
            <RAGPanel>
              <RAGHeader $open={ragOpen}>
                <div className="left">
                  <span className="icon">search</span>
                  3 passages récupérés depuis vos docs
                </div>
                <button className="toggle" onClick={() => setRagOpen(!ragOpen)}>
                  expand_more
                </button>
              </RAGHeader>
              {ragOpen && (
                <ChunkCards>
                  {RAG_CHUNKS.map((chunk, i) => (
                    <ChunkCard key={i} $score={chunk.score}>
                      <div className="score-row">
                        <span className="score-badge">{chunk.score}% MATCH</span>
                        <span style={{
                          fontFamily: "Material Symbols Outlined",
                          fontSize: 16,
                          color: theme.colors.onSurfaceVariant
                        }}>description</span>
                      </div>
                      <p className="excerpt">{chunk.excerpt}</p>
                      <div className="bar-track">
                        <div className="bar-fill" />
                      </div>
                    </ChunkCard>
                  ))}
                </ChunkCards>
              )}
            </RAGPanel>
          )}

          {/* Streaming Result */}
          {isLoading && stories && (
            <StreamingCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <StreamingBadge>
                  <span className="spin-icon">sync_saved_locally</span>
                  Streaming Result
                </StreamingBadge>
              </div>
              <StreamingText>
                {stories}
                <Cursor />
              </StreamingText>
            </StreamingCard>
          )}

          {/* Result complet */}
          {!isLoading && stories && (
            <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
              <ResultActions>
                <CopyBtn onClick={handleCopy} $copied={copied}>
                  <span className="icon">{copied ? "done" : "content_copy"}</span>
                  {copied ? "Copié !" : "Copier"}
                </CopyBtn>
              </ResultActions>
              <StreamingCard style={{ animation: "none", borderColor: theme.colors.outlineVariant }}>
                <StreamingText
                  dangerouslySetInnerHTML={{
                    __html: stories
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>")
                  }}
                />
              </StreamingCard>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !stories && (
            <EmptyState>
              <span className="icon">description</span>
              <p>Les user stories générées apparaîtront ici.<br />Commencez par décrire votre projet.</p>
            </EmptyState>
          )}
        </LeftColumn>

        {/* ── Right Column — Knowledge Base ── */}
        <RightColumn>
          <KBPanel>
            <KBHeader>
              <div className="left">
                🗂️ Base de connaissance
              </div>
              <span className="indexed-badge">
                <span className="icon">check_circle</span>
                Indexée
              </span>
            </KBHeader>

            <KBSubtitle>
              Les passages pertinents sont récupérés automatiquement à la génération.
            </KBSubtitle>

            <DocList>
              {MOCK_DOCS.map((doc) => (
                <DocCard key={doc.id} $status={doc.status}>
                  <span className="doc-icon">
                    {doc.status === "indexed" ? "description" : doc.status === "loading" ? "picture_as_pdf" : "article"}
                  </span>
                  <div className="doc-info">
                    <p className="name">{doc.name}</p>
                    <p className="status">
                      {doc.status === "indexed"
                        ? `✓ ${doc.chunks} chunks`
                        : doc.status === "loading"
                        ? "Chunking en cours..."
                        : "NON INDEXÉ"}
                    </p>
                    {doc.status === "loading" && (
                      <ProgressBar $pct={doc.pct}>
                        <div className="fill" />
                      </ProgressBar>
                    )}
                  </div>
                  {doc.status === "indexed" && (
                    <span className="chunks-badge">✓ {doc.chunks} chunks</span>
                  )}
                  {doc.status === "loading" && (
                    <span className="percent">{doc.pct}%</span>
                  )}
                </DocCard>
              ))}
            </DocList>

            <UploadZone
              $dragOver={dragOver}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  // TODO: upload handler v2
                  console.log("Files:", e.target.files);
                }}
              />
              <span className="upload-icon">cloud_upload</span>
              <p className="upload-title">Glissez vos docs ici</p>
              <p className="upload-sub">ou cliquez pour parcourir — Max 10 Mo</p>
              <div className="format-badges">
                <span className="format-badge">PDF</span>
                <span className="format-badge">DOCX</span>
                <span className="format-badge">TXT</span>
              </div>
            </UploadZone>

            <IndexBtn>Indexer les documents</IndexBtn>
          </KBPanel>
        </RightColumn>
      </Content>
    </PageWrapper>
  );
}
