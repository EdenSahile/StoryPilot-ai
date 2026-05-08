import { Component } from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  color: #991b1b;
  text-align: center;
`;

const Title = styled.h2`
  font-size: 1.1rem;
  margin-bottom: 8px;
`;

const Message = styled.p`
  font-size: 0.9rem;
  margin-bottom: 16px;
`;

const RetryButton = styled.button`
  padding: 8px 20px;
  background: #991b1b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: #7f1d1d;
  }
`;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Wrapper>
          <Title>Une erreur inattendue s'est produite</Title>
          <Message>Veuillez rafraîchir la page ou réessayer.</Message>
          <RetryButton onClick={() => this.handleReset()}>Réessayer</RetryButton>
        </Wrapper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
