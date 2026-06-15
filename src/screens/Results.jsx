// src/screens/Results.jsx
import { useState } from "react";
import styled, { keyframes } from "styled-components";
import { theme } from "../theme";

// ─── Animations ───────────────────────────────────────────
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const cardEntrance = keyframes`
  from { opacity: 0; transform: translateY(20px); }
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
    padding-bottom: 100px;
  }
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 ${theme.spacing.lg};
  background: rgba(3, 20, 39, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${theme.colors.outlineVariant};
`;

const TopBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

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

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
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
  grid-template-columns: 1fr 320px;
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

const PageHeader = styled.div`
  h2 {
    font-size: ${theme.fontSizes["3xl"]};
    font-weight: 700;
    color: ${theme.colors.onSurface};
    letter-spacing: -0.01em;
  }

  p {
    font-size: ${theme.fontSizes.md};
    color: ${theme.colors.onSurfaceVariant};
    margin-top: 4px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(128, 131, 255, 0.05);
  border: 1px solid rgba(192, 193, 255, 0.15);
  border-radius: ${theme.radii.lg};
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  font-weight: 700;
  color: ${theme.colors.onSurface};

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
  }
`;

const ActionBtns = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const OutlineBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: ${theme.radii.md};
  border: 1px solid ${theme.colors.outlineVariant};
  background: transparent;
  color: ${({ $copied }) => ($copied ? "#0284c7" : theme.colors.onSurface)};
  background: ${({ $copied }) => ($copied ? "#dbeafe22" : "transparent")};
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
    background: ${theme.colors.surfaceContainerHighest};
    border-color: rgba(192, 193, 255, 0.3);
  }
`;

const ExportBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: ${theme.radii.md};
  border: none;
  background: ${theme.colors.inversePrimary};
  color: white;
  font-size: ${theme.fontSizes.sm};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(73, 75, 214, 0.3);

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 16px;
  }

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(73, 75, 214, 0.4);
  }

  &:active {
    transform: scale(0.97);
  }
`;

// ─── Story Cards ──────────────────────────────────────────
const StoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const StoryCard = styled.article`
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.xl};
  overflow: hidden;
  animation: ${cardEntrance} 0.4s ease both;
  animation-delay: ${({ $index }) => $index * 0.1}s;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(192, 193, 255, 0.25);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  background: rgba(11, 28, 48, 0.5);
  border-bottom: 1px solid rgba(70, 69, 84, 0.3);

  h3 {
    font-size: ${theme.fontSizes.xl};
    font-weight: 700;
    color: ${theme.colors.primary};
  }
`;

const ComplexityBadge = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: 700;
  padding: 4px 12px;
  border-radius: ${theme.radii.full};
  background: ${({ $level }) =>
    $level === "S"
      ? "rgba(74, 222, 128, 0.1)"
      : $level === "M"
      ? "rgba(251, 191, 36, 0.1)"
      : "rgba(239, 68, 68, 0.1)"};
  color: ${({ $level }) =>
    $level === "S" ? "#4ade80" : $level === "M" ? "#fbbf24" : "#ef4444"};
  border: 1px solid ${({ $level }) =>
    $level === "S"
      ? "rgba(74, 222, 128, 0.2)"
      : $level === "M"
      ? "rgba(251, 191, 36, 0.2)"
      : "rgba(239, 68, 68, 0.2)"};
`;

const CardBody = styled.div`
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const StoryStatement = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.onSurface};
  line-height: 1.7;

  .role { color: ${theme.colors.secondary}; font-weight: 700; }
  .action { color: ${theme.colors.secondary}; font-weight: 700; }
  .benefit { color: ${theme.colors.secondary}; font-weight: 700; }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.lg};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid rgba(70, 69, 84, 0.3);

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const CriteriaSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

  h4 {
    font-size: ${theme.fontSizes.xs};
    font-weight: 700;
    color: ${theme.colors.onSurface};
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
`;

const CriteriaItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.onSurfaceVariant};
  line-height: 1.5;
  list-style: none;

  .check {
    font-family: "Material Symbols Outlined";
    font-size: 16px;
    color: #4ade80;
    flex-shrink: 0;
    margin-top: 1px;
    font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24;
  }
`;

const GherkinSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

  h4 {
    font-size: ${theme.fontSizes.xs};
    font-weight: 700;
    color: ${theme.colors.onSurface};
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
`;

const GherkinBlock = styled.div`
  background: ${theme.colors.surfaceContainerLowest};
  border-left: 3px solid ${theme.colors.primary};
  border-radius: 0 ${theme.radii.sm} ${theme.radii.sm} 0;
  padding: ${theme.spacing.md};
  font-family: ${theme.fonts.mono};
  font-size: 13px;
  line-height: 2;
  color: ${theme.colors.onSurfaceVariant};
  overflow-x: auto;

  .keyword-given { color: ${theme.colors.secondary}; font-weight: 700; }
  .keyword-when { color: ${theme.colors.primary}; font-weight: 700; }
  .keyword-then { color: #4ade80; font-weight: 700; }
  .keyword-and { color: ${theme.colors.tertiary}; font-weight: 700; }
`;

// ─── RAG Comparison Toggle ────────────────────────────────
const ComparisonToggle = styled.div`
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: ${theme.radii.lg};
  overflow: hidden;
`;

const ToggleHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(239, 68, 68, 0.05);
  border: none;
  cursor: pointer;
  transition: background 0.2s;

  .left {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    font-size: ${theme.fontSizes.sm};
    font-weight: 600;
    color: #ef4444;
  }

  .chevron {
    font-family: "Material Symbols Outlined";
    font-size: 20px;
    color: ${theme.colors.onSurfaceVariant};
    transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0)")};
    transition: transform 0.2s;
  }

  &:hover {
    background: rgba(239, 68, 68, 0.08);
  }
`;

const ComparisonContent = styled.div`
  padding: ${theme.spacing.lg};
  background: rgba(239, 68, 68, 0.03);
  border-top: 1px solid rgba(239, 68, 68, 0.1);
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.onSurfaceVariant};
  line-height: 1.7;

  .warning {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    background: rgba(239, 68, 68, 0.1);
    border-radius: ${theme.radii.sm};
    color: #ef4444;
    font-weight: 600;
    font-size: ${theme.fontSizes.xs};
    margin-top: ${theme.spacing.md};
  }
`;

// ─── Right Column ─────────────────────────────────────────
const RightColumn = styled.aside`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};

  @media (max-width: 1024px) {
    display: none;
  }
`;

const Panel = styled.div`
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid ${theme.colors.outlineVariant};
  border-radius: ${theme.radii.xl};
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const PanelLabel = styled.p`
  font-size: ${theme.fontSizes.xs};
  font-weight: 700;
  color: ${theme.colors.onSurfaceVariant};
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const QuickActionBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.radii.lg};
  font-size: ${theme.fontSizes.sm};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  .icon {
    font-family: "Material Symbols Outlined";
    font-size: 18px;
  }

  background: ${({ $variant }) =>
    $variant === "primary"
      ? theme.colors.inversePrimary
      : "transparent"};
  color: ${({ $variant }) =>
    $variant === "primary" ? "white" : theme.colors.onSurfaceVariant};
  border: ${({ $variant }) =>
    $variant === "primary"
      ? "none"
      : `1px solid ${theme.colors.outlineVariant}`};
  box-shadow: ${({ $variant }) =>
    $variant === "primary" ? "0 4px 12px rgba(73, 75, 214, 0.3)" : "none"};

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    color: ${({ $variant }) =>
      $variant === "primary" ? "white" : theme.colors.onSurface};
    border-color: ${({ $variant }) =>
      $variant === "primary" ? "none" : "rgba(192, 193, 255, 0.3)"};
  }

  &:active {
    transform: scale(0.97);
  }
`;

const RecentItem = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(16, 32, 52, 0.4);
  border: 1px solid rgba(70, 69, 84, 0.15);
  border-radius: ${theme.radii.md};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(192, 193, 255, 0.25);
  }

  .title {
    font-size: ${theme.fontSizes.sm};
    font-weight: 700;
    color: ${theme.colors.onSurface};
    margin-bottom: 6px;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .date {
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.onSurfaceVariant};
  }

  .count {
    font-size: ${theme.fontSizes.xs};
    font-weight: 700;
    color: ${theme.colors.primary};
  }
`;

const SeeAllLink = styled.a`
  display: block;
  text-align: center;
  font-size: ${theme.fontSizes.sm};
  font-weight: 700;
  color: ${theme.colors.primary};
  text-decoration: none;
  padding-top: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.outlineVariant};
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.8; }
`;

// ─── Mobile Sticky Bar ────────────────────────────────────
const MobileStickyBar = styled.div`
  display: none;
  position: fixed;
  bottom: 64px;
  left: 0;
  right: 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(11, 28, 48, 0.9);
  backdrop-filter: blur(12px);
  border-top: 1px solid ${theme.colors.outlineVariant};
  gap: ${theme.spacing.sm};
  z-index: 40;

  @media (max-width: ${theme.breakpoints.mobile}) {
    display: flex;
  }
`;

// ─── Parser ───────────────────────────────────────────────
function parseStories(rawText) {
  if (!rawText) return [];

  const blocks = rawText.split(/---+/).filter(b => b.trim().length > 30);

  return blocks.map((block, index) => {
    // Titre et statement
    const titleMatch = block.match(/\*\*User Story \d+\*\*\s*(.+?)(?=\n)/);
    const fullStatement = titleMatch ? titleMatch[1].trim() : "";

    // Critères
    const criteriaMatch = block.match(/\*\*Crit[èe]res.*?\*\*\s*\n([\s\S]*?)(?=\*\*Sc[ée]narios|\*\*Complexit|$)/i);
    const criteria = criteriaMatch
      ? criteriaMatch[1].split('\n')
          .filter(l => l.trim().startsWith('-'))
          .map(l => l.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      : [];

    // Gherkin
    const gherkinMatch = block.match(/\*\*Sc[ée]narios.*?\*\*\s*\n([\s\S]*?)(?=\*\*Complexit|$)/i);
    const gherkin = gherkinMatch
      ? gherkinMatch[1].split('\n')
          .filter(l => l.trim().startsWith('-'))
          .map(l => l.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      : [];

    // Complexité
    const complexityMatch = block.match(/\*\*Complexit[ée]\s*:\*\*\s*([SML])/i);
    const complexity = complexityMatch ? complexityMatch[1] : "M";

    // Statement colorisé
    const roleMatch = fullStatement.match(/En tant qu[e']\s*([^,]+)/i);
    const actionMatch = fullStatement.match(/je veux\s*([\s\S]+?)(?=\safin de)/i);
    const benefitMatch = fullStatement.match(/afin de\s*([\s\S]+?)\.?\s*$/i);

    const descriptionMatch = block.match(
      /\*\*Description\s*:\*\*\s*\n([\s\S]*?)(?=\*\*Crit|$)/i
    );
    const description = descriptionMatch
      ? descriptionMatch[1].trim()
      : "";

    return {
      id: index + 1,
      title: `User Story ${index + 1}`,
      fullStatement,
      complexity,
      description,
      statement: roleMatch && actionMatch && benefitMatch ? {
        role: roleMatch[1].trim(),
        action: actionMatch[1].trim(),
        benefit: benefitMatch[1].trim(),
      } : null,
      criteria,
      gherkin,
    };
  }).filter(s => s.fullStatement);
}

// ─── Generic stories for comparison ──────────────────────
const GENERIC_STORIES = `En tant qu'utilisateur, je veux me connecter afin d'accéder à mon compte.

En tant qu'administrateur, je veux gérer les accès afin de contrôler les utilisateurs.

En tant qu'utilisateur, je veux recevoir une facture afin de justifier mon achat.`;

const RECENT_GENERATIONS = [
  { title: "E-commerce Checkout Refactor", date: "12 Oct 2023", count: 12 },
  { title: "Mobile Onboarding V2", date: "10 Oct 2023", count: 8 },
  { title: "Admin Logs API", date: "08 Oct 2023", count: 15 },
];

// ─── Component ────────────────────────────────────────────
export default function Results({ stories, onNewGeneration }) {
  const [copied, setCopied] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const parsedStories = parseStories(stories);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stories);
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
          <span className="title">Forge</span>
          <span className="sep">/</span>
          <span className="sub">Résultats</span>
        </TopBarLeft>
        <TopBarRight>
          <IconBtn><span className="icon">dark_mode</span></IconBtn>
          <IconBtn><span className="icon">notifications</span></IconBtn>
        </TopBarRight>
      </TopBar>

      <Content>
        {/* ── Left Column ── */}
        <LeftColumn>
          <PageHeader>
            <h2>Backlog de Génération</h2>
            <p>Stories prêtes pour l'exportation vers Jira/Linear.</p>
          </PageHeader>

          {/* Action Bar */}
          <ActionBar>
            <StatusBadge>
              <span className="dot" />
              ✦ Génération par IA terminée
            </StatusBadge>
            <ActionBtns>
              <OutlineBtn onClick={handleCopy} $copied={copied}>
                <span className="icon">{copied ? "done" : "content_copy"}</span>
                {copied ? "Copié !" : "Copier"}
              </OutlineBtn>
              <ExportBtn>
                <span className="icon">rocket_launch</span>
                Exporter vers Jira
              </ExportBtn>
            </ActionBtns>
          </ActionBar>

          {/* Story Cards */}
          <StoryList>
            {parsedStories.length > 0 ? (
              parsedStories.map((story, i) => (
                <StoryCard key={story.id} $index={i}>
                  <CardHeader>
                    <h3>US-{String(story.id).padStart(2, "0")} — {story.title}</h3>
                    <ComplexityBadge $level={story.complexity}>
                      {story.complexity}
                    </ComplexityBadge>
                  </CardHeader>

                  <CardBody>
                    {/* Statement */}
                    <StoryStatement>
                      {story.statement ? (
                        <>
                          En tant que{" "}
                          <span className="role">{story.statement.role}</span>, je veux{" "}
                          <span className="action">{story.statement.action}</span>{" "}
                          afin de{" "}
                          <span className="benefit">{story.statement.benefit}</span>.
                        </>
                      ) : (
                        story.fullStatement
                      )}
                    </StoryStatement>

                    {story.description && (
                      <p style={{
                        fontSize: "14px",
                        color: theme.colors.onSurfaceVariant,
                        lineHeight: 1.7,
                        fontStyle: "italic",
                        padding: "12px 16px",
                        background: "rgba(16, 32, 52, 0.4)",
                        borderRadius: "8px",
                        borderLeft: "3px solid rgba(192, 193, 255, 0.2)"
                      }}>
                        {story.description}
                      </p>
                    )}

                    {/* Grid: Criteria + Gherkin */}
                    {(story.criteria.length > 0 || story.gherkin.length > 0) && (
                      <CardGrid>
                        {/* Criteria */}
                        {story.criteria.length > 0 && (
                          <CriteriaSection>
                            <h4>Critères d'Acceptation</h4>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                              {story.criteria.map((c, j) => (
                                <CriteriaItem key={j}>
                                  <span className="check">check_circle</span>
                                  {c}
                                </CriteriaItem>
                              ))}
                            </ul>
                          </CriteriaSection>
                        )}

                        {/* Gherkin */}
                        {story.gherkin.length > 0 && (
                          <GherkinSection>
                            <h4>Scénario Gherkin</h4>
                            <GherkinBlock>
                              {story.gherkin.map((line, j) => {
                                const lower = line.toLowerCase();
                                if (lower.startsWith("étant donné") || lower.startsWith("given"))
                                  return <div key={j}><span className="keyword-given">{line.split(" ")[0]} {line.split(" ")[1]}</span> {line.split(" ").slice(2).join(" ")}</div>;
                                if (lower.startsWith("quand") || lower.startsWith("when"))
                                  return <div key={j}><span className="keyword-when">{line.split(" ")[0]}</span> {line.split(" ").slice(1).join(" ")}</div>;
                                if (lower.startsWith("alors") || lower.startsWith("then"))
                                  return <div key={j}><span className="keyword-then">{line.split(" ")[0]}</span> {line.split(" ").slice(1).join(" ")}</div>;
                                if (lower.startsWith("et ") || lower.startsWith("and "))
                                  return <div key={j}><span className="keyword-and">{line.split(" ")[0]}</span> {line.split(" ").slice(1).join(" ")}</div>;
                                return <div key={j}>{line}</div>;
                              })}
                            </GherkinBlock>
                          </GherkinSection>
                        )}
                      </CardGrid>
                    )}
                  </CardBody>
                </StoryCard>
              ))
            ) : (
              /* Fallback — texte brut si parsing échoue */
              <StoryCard $index={0}>
                <CardBody>
                  <div style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: theme.fontSizes.md,
                    color: theme.colors.onSurface,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap"
                  }}>
                    {stories}
                  </div>
                </CardBody>
              </StoryCard>
            )}
          </StoryList>

          {/* Comparison Toggle */}
          <ComparisonToggle>
            <ToggleHeader
              $open={comparisonOpen}
              onClick={() => setComparisonOpen(!comparisonOpen)}
            >
              <div className="left">
                🔴 Sans RAG — voir la version générique (moins précise)
              </div>
              <span className="chevron">expand_more</span>
            </ToggleHeader>
            {comparisonOpen && (
              <ComparisonContent>
                <div style={{ whiteSpace: "pre-wrap" }}>{GENERIC_STORIES}</div>
                <div className="warning">
                  ❌ Aucun vocabulaire métier · Aucune règle de gestion · Identique à du ChatGPT générique
                </div>
              </ComparisonContent>
            )}
          </ComparisonToggle>
        </LeftColumn>

        {/* ── Right Column ── */}
        <RightColumn>
          {/* Quick Actions */}
          <Panel>
            <PanelLabel>Actions Rapides</PanelLabel>
            <QuickActionBtn onClick={onNewGeneration}>
              <span className="icon">restart_alt</span>
              Nouvelle génération
            </QuickActionBtn>
            <QuickActionBtn $variant="primary">
              <span className="icon">rocket_launch</span>
              Exporter vers Jira
            </QuickActionBtn>
            <QuickActionBtn>
              <span className="icon">bookmark</span>
              Sauvegarder en Library
            </QuickActionBtn>
          </Panel>

          {/* Recent Library */}
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <PanelLabel>Générations Récentes</PanelLabel>
              <span style={{
                fontSize: "10px", fontWeight: 700,
                background: theme.colors.surfaceContainerHighest,
                color: theme.colors.primary,
                padding: "3px 8px", borderRadius: "6px",
                textTransform: "uppercase", letterSpacing: "0.05em"
              }}>Recent</span>
            </div>
            {RECENT_GENERATIONS.map((item) => (
              <RecentItem key={item.title}>
                <div className="title">{item.title}</div>
                <div className="meta">
                  <span className="date">{item.date}</span>
                  <span className="count">{item.count} Stories</span>
                </div>
              </RecentItem>
            ))}
            <SeeAllLink>Voir toute la Library →</SeeAllLink>
          </Panel>
        </RightColumn>
      </Content>

      {/* Mobile sticky bar */}
      <MobileStickyBar>
        <OutlineBtn onClick={handleCopy} $copied={copied} style={{ flex: 1 }}>
          <span className="icon">{copied ? "done" : "content_copy"}</span>
          {copied ? "Copié !" : "Copier"}
        </OutlineBtn>
        <ExportBtn style={{ flex: 2 }}>
          <span className="icon">rocket_launch</span>
          Exporter vers Jira
        </ExportBtn>
      </MobileStickyBar>
    </PageWrapper>
  );
}
