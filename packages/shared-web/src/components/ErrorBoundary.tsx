import { Component, type ErrorInfo, type ReactNode } from 'react';

import { colors, radius, spacing } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Without this, an uncaught render error unmounts the whole React tree and
 * leaves a blank white screen with nothing in the DOM to explain why —
 * indistinguishable from a stale/missing JS bundle or a network failure.
 * This at least gives the user something to act on.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
            textAlign: 'center',
            backgroundColor: colors.background,
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: spacing.xs }}>
            Une erreur est survenue.
          </p>
          <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg }}>
            Veuillez recharger la page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              border: 'none',
              borderRadius: radius.md,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: colors.primary,
              cursor: 'pointer',
            }}
          >
            Recharger
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
