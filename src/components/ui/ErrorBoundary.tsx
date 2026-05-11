// components/ui/ErrorBoundary.tsx — УЛУЧШЕННАЯ ВЕРСИЯ
import { Component, type ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  errorDetails: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorId: null,
    errorDetails: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = await this.logError(error, errorInfo);
    this.setState({ errorId });
    this.props.onError?.(error, errorInfo);

    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
      this.setState({
        errorDetails: `${error.message}\n\n${error.stack}`,
      });
    }
  }

  private async logError(error: Error, errorInfo: React.ErrorInfo): Promise<string | null> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase not configured, skipping error log');
        return null;
      }

      const errorPayload = {
        message: error.message?.substring(0, 1000),
        stack: error.stack?.substring(0, 2000),
        component_stack: errorInfo.componentStack?.substring(0, 2000),
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      const { data } = await supabase.from('error_logs').insert(errorPayload).select('id').single();

      return data?.id || null;
    } catch (e) {
      console.warn('Failed to log error:', e);
      return null;
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null, errorDetails: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopyError = () => {
    const text = this.state.errorDetails || this.state.error?.message || '';
    navigator.clipboard.writeText(text);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            'min-h-screen flex items-center justify-center p-4',
            'bg-gradient-to-br from-cyber-950 via-cyber-900 to-cyber-950'
          )}
        >
          <Card
            padding="xl"
            className={cn(
              'max-w-lg w-full space-y-6',
              'border-accent-red/20 bg-gradient-to-br from-cyber-900 to-cyber-950',
              'shadow-2xl shadow-accent-red/10'
            )}
          >
            {/* Icon */}
            <div className="relative">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-accent-red/20 to-accent-red/5 border border-accent-red/30 flex items-center justify-center">
                <span className="text-4xl" role="img" aria-label="Ошибка">
                  ⚠️
                </span>
              </div>
              <div className="absolute inset-0 rounded-3xl bg-accent-red/5 blur-2xl" />
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Что-то пошло не так</h2>
              <p className="text-sm text-text-muted">
                Мы зафиксировали ошибку и работаем над её исправлением
              </p>
            </div>

            {/* Error message */}
            {this.state.error && (
              <div className="bg-cyber-800/50 rounded-xl p-4 border border-cyber-700">
                <p className="text-sm text-text-secondary font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Error ID */}
            {this.state.errorId && (
              <div className="flex items-center justify-between bg-cyber-800/30 rounded-lg px-4 py-2.5 border border-cyber-700">
                <span className="text-xs text-text-muted">Код ошибки:</span>
                <code className="text-xs text-accent-green font-mono">{this.state.errorId}</code>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="primary" onClick={this.handleRetry} className="flex-1">
                🔄 Попробовать снова
              </Button>
              <Button variant="secondary" onClick={this.handleReload} className="flex-1">
                🔄 Обновить
              </Button>
            </div>

            {/* Debug info (dev only) */}
            {import.meta.env.DEV && this.state.errorDetails && (
              <details className="mt-4">
                <summary className="text-xs text-text-muted cursor-pointer hover:text-white transition-colors">
                  Показать детали ошибки
                </summary>
                <pre className="mt-3 p-3 bg-cyber-950 rounded-lg text-xs text-text-secondary font-mono overflow-x-auto border border-cyber-800">
                  {this.state.errorDetails}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
