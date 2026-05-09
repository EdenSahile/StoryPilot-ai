import styled from "styled-components";

const FooterWrapper = styled.footer`
  margin-top: 60px;
  padding: 40px 20px 20px;
  text-align: center;
  border-top: 1px solid #e2e8f0;
  color: #94a3b8;
  font-size: 0.9rem;

  @media (max-width: 768px) {
    margin-top: 40px;
    padding: 28px 16px 16px;
    font-size: 0.85rem;
  }
`;

const FeedbackLink = styled.a`
  color: #6366f1;
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
        Built with Claude API |
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
