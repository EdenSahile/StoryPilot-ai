// src/screens/Library.jsx
import { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { theme } from "../theme";
import { getGenerations, deleteGeneration, updateGeneration } from "../utils/libraryStorage";

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
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

  .sep { color: ${theme.colors.outline}; }

  .sub {
    font-size: ${theme.fontSizes.md};
    color: ${theme.colors.onSurfaceVariant};
  }
`;

const BackBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: ${theme.colors.onSurfaceVariant};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  padding: 6px 10px;
  border-radius: ${theme.radii.md};
  transition: all 0.2s;

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 20px;
  }

  &:hover {
    color: ${theme.colors.primary};
    background: ${theme.colors.surfaceContainerHighest};
  }
`;

const Content = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.md};
  }
`;

// ─── List view ────────────────────────────────────────────
const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  h2 {
    font-size: ${theme.fontSizes["2xl"]};
    font-weight: 800;
    color: ${theme.colors.onSurface};
  }
`;

const LocalNotice = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.onSurfaceVariant};
  display: flex;
  align-items: center;
  gap: 4px;

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 14px;
  }
`;

const EntryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const EntryCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.surfaceContainerLow};
  border: 1px solid ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.lg};
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 0;
    background: ${theme.colors.primary};
    border-radius: ${theme.radii.lg} 0 0 ${theme.radii.lg};
    transition: width 0.2s;
  }

  &:hover {
    background: ${theme.colors.surfaceContainer};
    border-color: rgba(192, 193, 255, 0.25);
    &::before { width: 3px; }
  }

  &:active { transform: scale(0.995); }

  .info {
    flex: 1;
    min-width: 0;
  }

  .entry-title {
    font-size: ${theme.fontSizes.md};
    font-weight: 700;
    color: ${theme.colors.onSurface};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .entry-meta {
    margin-top: 4px;
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.onSurfaceVariant};
    display: flex;
    gap: ${theme.spacing.md};
    flex-wrap: wrap;
  }

  .chevron {
    font-family: "Material Symbols Outlined";
    font-size: 20px;
    color: ${theme.colors.outline};
    flex-shrink: 0;
    transition: color 0.2s;
  }

  &:hover .chevron { color: ${theme.colors.primary}; }
`;

const Pills = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const Pill = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.18);
  color: ${theme.colors.onSurfaceVariant};
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: ${theme.radii.sm};
  color: ${theme.colors.outline};
  font-family: "Material Symbols Outlined";
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: ${theme.colors.error};
    background: rgba(255, 180, 171, 0.1);
  }
`;

const EmptyState = styled.div`
  border: 2px dashed ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.xl};
  padding: ${theme.spacing["3xl"]};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  text-align: center;
  opacity: 0.6;

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

// ─── Detail view ──────────────────────────────────────────
const DetailMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

const MetaBadge = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: 700;
  padding: 4px 10px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.surfaceContainerHighest};
  color: ${theme.colors.onSurfaceVariant};
  letter-spacing: 0.04em;
`;

const BriefBlock = styled.div`
  background: ${theme.colors.surfaceContainerHigh};
  border-left: 3px solid ${theme.colors.primary};
  border-radius: 0 ${theme.radii.md} ${theme.radii.md} 0;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.onSurfaceVariant};
  line-height: 1.6;
  font-style: italic;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  h2 {
    font-size: ${theme.fontSizes["2xl"]};
    font-weight: 800;
    color: ${theme.colors.onSurface};
    flex: 1;
  }
`;

const TitleInput = styled.input`
  flex: 1;
  font-size: ${theme.fontSizes["2xl"]};
  font-weight: 800;
  color: ${theme.colors.onSurface};
  background: ${theme.colors.surfaceContainerHigh};
  border: 2px solid ${theme.colors.primary};
  border-radius: ${theme.radii.md};
  padding: 2px 10px;
  font-family: ${theme.fonts.sans};
  outline: none;
`;

const EditTitleBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${theme.colors.outline};
  font-family: "Material Symbols Outlined";
  font-size: 20px;
  padding: 4px;
  border-radius: ${theme.radii.sm};
  transition: color 0.15s;
  flex-shrink: 0;

  &:hover { color: ${theme.colors.primary}; }
`;

const CopyBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: ${theme.radii.md};
  border: 1px solid ${({ $copied }) => $copied ? theme.colors.primary : theme.colors.outlineVariant};
  background: ${({ $copied }) => $copied ? "rgba(99,102,241,0.08)" : "transparent"};
  color: ${({ $copied }) => $copied ? theme.colors.primary : theme.colors.onSurfaceVariant};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 16px;
  }

  &:hover {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
  }
`;

const StoriesBlock = styled.div`
  background: ${theme.colors.surfaceContainer};
  border: 1px solid ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.xl};
  padding: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.onSurface};
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
  font-family: ${theme.fonts.sans};

  h2, h3 { color: ${theme.colors.primary}; margin: 16px 0 8px; }
  strong { font-weight: 700; }
`;

// ─── Helpers ──────────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────
export default function Library({ onNavigate }) {
  const [generations, setGenerations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setGenerations(getGenerations());
  }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (!confirm("Supprimer cette génération de l'historique ?")) return;
    deleteGeneration(id);
    const updated = getGenerations();
    setGenerations(updated);
    if (selected?.id === id) setSelected(null);
  };

  const startEditTitle = () => {
    setTitleDraft(selected.title);
    setEditingTitle(true);
  };

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== selected.title) {
      updateGeneration(selected.id, { title: trimmed });
      const updated = getGenerations();
      setGenerations(updated);
      setSelected((prev) => ({ ...prev, title: trimmed }));
    }
    setEditingTitle(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selected.stories);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  };

  return (
    <PageWrapper>
      <TopBar>
        <TopBarLeft>
          {selected ? (
            <BackBtn onClick={() => setSelected(null)}>
              <span className="icon">arrow_back</span>
              Retour
            </BackBtn>
          ) : (
            <>
              <span className="title">Historique</span>
              <span className="sep">/</span>
              <span className="sub">{generations.length} génération{generations.length !== 1 ? "s" : ""}</span>
            </>
          )}
        </TopBarLeft>
      </TopBar>

      <Content>
        {selected ? (
          /* ── Vue détail ── */
          <>
            <PageHeader>
              <TitleRow>
                {editingTitle ? (
                  <TitleInput
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                  />
                ) : (
                  <>
                    <h2 onDoubleClick={startEditTitle} title="Double-cliquez pour renommer">
                      {selected.title}
                    </h2>
                    <EditTitleBtn onClick={startEditTitle} title="Renommer">edit</EditTitleBtn>
                  </>
                )}
              </TitleRow>
              <DetailMeta>
                <MetaBadge>{formatDate(selected.createdAt)}</MetaBadge>
                <MetaBadge>{selected.storiesCount} stories</MetaBadge>
                {selected.sourcesUsed?.map((s) => <MetaBadge key={s}>{s}</MetaBadge>)}
              </DetailMeta>
            </PageHeader>

            <BriefBlock>{selected.brief}</BriefBlock>

            <CopyBtn $copied={copied} onClick={handleCopy}>
              <span className="icon">{copied ? "done" : "content_copy"}</span>
              {copied ? "Copié ✓" : "Copier le texte"}
            </CopyBtn>

            <StoriesBlock>{selected.stories}</StoriesBlock>
          </>
        ) : (
          /* ── Vue liste ── */
          <>
            <PageHeader>
              <h2>Historique</h2>
              <LocalNotice>
                <span className="icon">info</span>
                Historique local à ce navigateur — non synchronisé entre appareils.
              </LocalNotice>
            </PageHeader>

            {generations.length === 0 ? (
              <EmptyState>
                <span className="icon">history</span>
                <p>Aucune génération sauvegardée pour l'instant.<br />
                  Utilisez "Sauvegarder en Historique" après une génération.</p>
              </EmptyState>
            ) : (
              <EntryList>
                {generations.map((gen) => (
                  <EntryCard key={gen.id} onClick={() => setSelected(gen)}>
                    <div className="info">
                      <div className="entry-title">{gen.title}</div>
                      <div className="entry-meta">
                        <span>{formatDate(gen.createdAt)}</span>
                        <span>{gen.storiesCount} stories</span>
                      </div>
                      {gen.sourcesUsed?.length > 0 && (
                        <Pills>
                          {gen.sourcesUsed.map((s) => <Pill key={s}>{s}</Pill>)}
                        </Pills>
                      )}
                    </div>
                    <span className="chevron">chevron_right</span>
                    <DeleteBtn
                      title="Supprimer cette génération"
                      onClick={(e) => handleDelete(e, gen.id)}
                    >
                      delete
                    </DeleteBtn>
                  </EntryCard>
                ))}
              </EntryList>
            )}
          </>
        )}
      </Content>
    </PageWrapper>
  );
}
