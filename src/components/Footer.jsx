// src/components/Footer.jsx
import styled from "styled-components";
import { theme } from "../theme";

const FooterBar = styled.footer`
  margin-left: 240px;
  padding: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.outlineVariant};
  background: ${theme.colors.background};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.outline};

  @media (max-width: ${theme.breakpoints.mobile}) {
    margin-left: 0;
    padding-bottom: calc(80px + ${theme.spacing.lg});
  }
`;

const LinkBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.onSurfaceVariant};
  cursor: pointer;
  font-size: ${theme.fontSizes.sm};
  padding: 4px 6px;
  border-radius: ${theme.radii.sm};
  &:hover { color: ${theme.colors.onSurface}; text-decoration: underline; }
`;

export default function Footer({ onNavigate }) {
  return (
    <FooterBar>
      <span>© 2026 StoryPilot AI</span>
      <LinkBtn onClick={() => onNavigate("mentions")}>Mentions légales</LinkBtn>
      <LinkBtn onClick={() => onNavigate("confidentialite")}>Confidentialité</LinkBtn>
    </FooterBar>
  );
}
