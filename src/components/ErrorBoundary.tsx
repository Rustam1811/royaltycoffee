import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/app/home';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] px-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 text-center">
            <div className="text-5xl mb-4">☕</div>
            <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              ROYALTY COFFEE
            </h2>
            <p className="text-amber-200/70 mb-6 text-sm">
              Произошла ошибка. Попробуйте вернуться на главную.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-6 bg-black/30 rounded-xl p-4 border border-white/10">
                <summary className="cursor-pointer font-medium text-amber-200/80 mb-2 text-sm">
                  Детали ошибки
                </summary>
                <pre className="text-xs text-red-400 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#C9A632] hover:from-[#C9A632] hover:to-[#BF9F2D] text-black font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-[#D4AF37]/30"
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
