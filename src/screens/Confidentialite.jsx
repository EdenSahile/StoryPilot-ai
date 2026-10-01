// src/screens/Confidentialite.jsx
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

export default function Confidentialite({ onNavigate }) {
  return (
    <PageWrapper>
      <TopBar>
        <BackBtn aria-label="Retour" onClick={() => onNavigate("dashboard")}>
          <span className="icon">arrow_back</span>
        </BackBtn>
        <Title>Politique de confidentialité</Title>
      </TopBar>
      <Content>
        <p className="updated">Dernière mise à jour : 1 octobre 2026</p>

        <h2>Responsable du traitement</h2>
        <p>
          L'éditeur du site, dans le cadre d'un projet personnel non professionnel.
          Contact&nbsp;: <a href="mailto:edensahile12@gmail.com">edensahile12@gmail.com</a>.
        </p>

        <h2>Données traitées et finalités</h2>
        <p>
          <strong>Adresse IP.</strong> Lors de chaque génération, votre adresse IP est lue pour
          limiter le nombre de requêtes et prévenir les abus. Elle est conservée temporairement en
          mémoire vive le temps de ce contrôle et n'est pas enregistrée de façon durable. Base
          légale&nbsp;: intérêt légitime (sécurité du service).
        </p>
        <p>
          <strong>Contenu de vos briefs.</strong> Le texte que vous saisissez est transmis à des
          prestataires d'intelligence artificielle pour générer les user stories. Base légale&nbsp;:
          exécution du service que vous demandez. N'y saisissez pas de données personnelles ou
          confidentielles.
        </p>
        <p>
          <strong>Documents importés.</strong> Si vous utilisez la recherche documentaire, les
          fichiers que vous importez sont découpés, convertis en vecteurs (embeddings) par OpenAI,
          puis stockés dans Pinecone pour être réutilisés lors de vos générations. Base
          légale&nbsp;: exécution du service que vous demandez.
        </p>
        <p>
          <strong>Stockage dans votre navigateur.</strong> Votre historique de générations et votre
          préférence de thème sont enregistrés localement dans votre navigateur (localStorage). Ces
          données restent sur votre appareil, ne sont jamais transmises à l'éditeur, et ne sont pas
          des cookies.
        </p>

        <h2>Destinataires et sous-traitants</h2>
        <p>Pour fonctionner, le site fait appel aux prestataires suivants, situés aux États-Unis&nbsp;:</p>
        <ul>
          <li>Anthropic (API Claude)&nbsp;: génération des user stories.</li>
          <li>OpenAI&nbsp;: calcul des embeddings, lorsque la recherche documentaire est activée.</li>
          <li>Pinecone&nbsp;: base de données vectorielle, lorsque la recherche documentaire est activée.</li>
          <li>Vercel&nbsp;: hébergement du site.</li>
        </ul>
        <p>
          Anthropic, OpenAI et Pinecone sont sollicités via leurs API commerciales. Les contenus
          que vous y envoyez ne sont pas utilisés pour entraîner leurs modèles d'intelligence
          artificielle.
        </p>

        <h2>Transferts hors Union européenne</h2>
        <p>
          Ces prestataires étant établis aux États-Unis, vos données y sont transférées. Ces
          transferts sont encadrés par les garanties prévues par le RGPD (clauses contractuelles
          types et/ou adhésion au Data Privacy Framework), mises en place par chacun d'eux.
        </p>

        <h2>Durée de conservation</h2>
        <ul>
          <li>Adresse IP&nbsp;: non conservée (mémoire volatile, effacée après le contrôle anti-abus).</li>
          <li>
            Briefs&nbsp;: non stockés par l'éditeur. Transmis à Anthropic (et, si la recherche
            documentaire est active, à OpenAI) via leurs API commerciales, ils y sont conservés
            30&nbsp;jours au maximum à des fins de modération et de détection des abus, puis
            supprimés automatiquement.
          </li>
          <li>
            Documents importés&nbsp;: découpés et stockés sous forme de vecteurs dans Pinecone, ils
            y sont conservés jusqu'à leur suppression via l'application (bibliothèque de documents).
          </li>
          <li>Données du navigateur (localStorage)&nbsp;: conservées jusqu'à leur effacement par vos soins.</li>
        </ul>

        <h2>Vos droits</h2>
        <p>
          Vous disposez des droits d'accès, de rectification, d'effacement, d'opposition et de
          limitation (articles 15 à 22 du RGPD). Les données stockées dans votre navigateur peuvent
          être supprimées à tout moment, via la fonction de suppression de l'application ou en vidant
          le stockage de votre navigateur. Pour toute demande&nbsp;:
          <a href="mailto:edensahile12@gmail.com">edensahile12@gmail.com</a>.
        </p>

        <h2>Réclamation</h2>
        <p>
          Vous pouvez introduire une réclamation auprès de la CNIL&nbsp;:
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>.
        </p>

        <h2>Cookies</h2>
        <p>Ce site n'utilise aucun cookie ni traceur publicitaire ou de mesure d'audience.</p>
      </Content>
    </PageWrapper>
  );
}
