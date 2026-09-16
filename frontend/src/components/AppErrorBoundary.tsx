import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Frontend render failure', { error, componentStack: errorInfo.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--zq-bg, #07131d)', color: 'var(--zq-text-primary, #fff)' }}>
        <section style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p style={{ color: 'var(--zq-text-secondary, #b8c6d1)', lineHeight: 1.6 }}>
            This page could not load correctly. Reload to try again.
          </p>
          <button type="button" className="zq-btn-aura" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </section>
      </main>
    );
  }
}