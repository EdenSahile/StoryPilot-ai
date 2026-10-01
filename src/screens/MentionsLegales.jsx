// src/screens/MentionsLegales.jsx
import styled, { keyframes } from "styled-components";
import { theme } from "../theme";

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const PageWrapper = styled.div`
  margin-left: 240px;
  min-height: 100vh;
  background: ${theme.colors.background};
  animation: ${fadeInUp} 0.4s ease;
  overflow-x: hidden;

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
  gap: ${theme.spacing.sm};
  height: 64px;
  padding: 0 ${theme.spacing.lg};
  background: color-mix(in srgb, ${theme.colors.surface} 85%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${theme.colors.outlineVariant};
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.onSurfaceVariant};
  cursor: pointer;
  padding: 6px;
  border-radius: ${theme.radii.sm};
  display: flex;
  align-items: center;
  transition: color 0.2s;
  .icon { font-family: "Material Symbols Outlined"; font-size: 22px; }
  &:hover { color: ${theme.colors.onSurface}; }
`;

const Title = styled.h1`
  font-size: ${theme.fontSizes.xl};
  font-weight: 800;
  color: ${theme.colors.onSurface};
`;

const Content = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: ${theme.spacing.xl} ${theme.spacing.lg} ${theme.spacing['3xl']};
  color: ${theme.colors.onSurfaceVariant};
  font-size: ${theme.fontSizes.md};
  line-height: 1.7;

  h2 {
    color: ${theme.colors.onSurface};
    font-size: ${theme.fontSizes.lg};
    font-weight: 700;
    margin: ${theme.spacing.xl} 0 ${theme.spacing.sm};
  }
  p { margin-bottom: ${theme.spacing.md}; }
  ul { margin: 0 0 ${theme.spacing.md} ${theme.spacing.lg}; }
  li { margin-bottom: ${theme.spacing.xs}; }
  a { color: ${theme.colors.primary}; }
  .updated { font-size: ${theme.fontSizes.sm}; color: ${theme.colors.outline}; margin-bottom: ${theme.spacing.lg}; }
`;

export default function MentionsLegales({ onNavigate }) {
  return (
    <PageWrapper>
      <TopBar>
        <BackBtn aria-label="Retour" onClick={() => onNavigate("dashboard")}>
          <span className="icon">arrow_back</span>
        </BackBtn>
        <Title>Mentions légales</Title>
      </TopBar>
      <Content>
        <p className="updated">Dernière mise à jour : 1 octobre 2026</p>

        <h2>Éditeur du site</h2>
        <p>
          Ce site est un projet personnel, édité par un particulier agissant à titre non
          professionnel. Conformément à l'article 6, III, 2° de la loi n° 2004-575 du 21 juin 2004
          pour la confiance dans l'économie numérique (LCEN), l'éditeur a choisi de ne pas publier
          son identité&nbsp;; celle-ci est conservée par l'hébergeur du site, qui pourra la
          communiquer à l'autorité judiciaire sur réquisition.
        </p>
        <p>Contact&nbsp;: <a href="mailto:edensahile12@gmail.com">edensahile12@gmail.com</a></p>

        <h2>Nature du site</h2>
        <p>
          StoryPilot AI est une démonstration technique non commerciale&nbsp;: un générateur de
          user stories à partir d'un brief, propulsé par intelligence artificielle. Aucun produit
          ni service n'y est vendu.
        </p>

        <h2>Hébergeur</h2>
        <p>
          Vercel Inc.<br />
          440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          Le code source de ce projet est publié sur GitHub. Les contenus générés par l'outil le
          sont à partir des briefs saisis par les visiteurs et au moyen de modèles d'intelligence
          artificielle tiers.
        </p>

        <h2>Responsabilité</h2>
        <p>
          Les user stories générées le sont automatiquement par un modèle d'intelligence
          artificielle. L'éditeur ne garantit ni l'exactitude ni l'adéquation des résultats à un
          besoin particulier, et ne saurait être tenu responsable de l'usage qui en est fait.
        </p>
      </Content>
    </PageWrapper>
  );
}
