import styled from "styled-components";
import { theme } from "../theme";

const FooterWrapper = styled.footer`
  margin-top: 60px;
  padding: 40px 20px 20px;
  text-align: center;
  border-top: 1px solid ${theme.colors.outlineVariant};
  color: ${theme.colors.onSurfaceVariant};
  font-size: ${theme.fontSizes.sm};

  @media (max-width: ${theme.breakpoints.mobile}) {
    margin-top: 40px;
    padding: 28px 16px 16px;
    font-size: ${theme.fontSizes.xs};
  }
`;

const FeedbackLink = styled.a`
  color: ${theme.colors.primary};
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
    text-decoration: underline;
  }
`;

function Footer() {
  return (
    <FooterWrapper>
      <p>
        Built with Claude Code · Powered by Claude API |
        <FeedbackLink
          href="https://docs.google.com/forms/d/e/1FAIpQLSfnTMvKkdxnuHXmAeXzJBofmfigbEQzIsZjIhyHzuDAizs4QQ/viewform?usp=publish-editor"
          target="_blank"
          rel="noopener noreferrer"
        >
          {" "}
          Envoyer un feedback
        </FeedbackLink>
      </p>
    </FooterWrapper>
  );
}

export default Footer;
