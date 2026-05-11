import { Component, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { logClientError } from '@/lib/clientErrorLogger';

interface Props { children: ReactNode; label?: string }
interface State { hasError: boolean; error?: Error }

export class HeroErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Explicit logging to help diagnose null/undefined fields in cfg
    // eslint-disable-next-line no-console
    console.error(`[HeroErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}] crash:`, {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
    void logClientError({
      source: 'hero_error_boundary',
      label: this.props.label,
      error,
      componentStack: info.componentStack ?? undefined,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <section
        role="alert"
        aria-label="Hero indisponible"
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 40,
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '0.1em' }}>COLLECTION</h1>
        <p style={{ opacity: 0.7, maxWidth: 480 }}>
          Le visuel principal est temporairement indisponible. Découvrez la boutique :
        </p>
        <Link
          to="/boutique"
          style={{
            background: 'hsl(var(--foreground))', color: 'hsl(var(--background))', padding: '14px 32px',
            fontWeight: 700, letterSpacing: '0.12em', textDecoration: 'none',
          }}
        >
          SHOP NOW
        </Link>
      </section>
    );
  }
}

export default HeroErrorBoundary;
