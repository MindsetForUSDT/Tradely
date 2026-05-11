// components/ui/ErrorBoundary.tsx — С ЛОГИРОВАНИЕМ
import { Component, type ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '@/lib/supabase';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null; // ID ошибки в логах
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorId: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Логируем ошибку на сервер
    const errorId = await this.logError(error, errorInfo);
    this.setState({ errorId });

    // Вызываем пользовательский обработчик
    this.props.onError?.(error, errorInfo);

    // Логируем в консоль для разработки
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  private async logError(error: Error, errorInfo: React.ErrorInfo): Promise<string | null> {
    try {
      const errorPayload = {
        message: error.message,
        stack: error.stack?.substring(0, 1000), // Ограничиваем размер
        component_stack: errorInfo.componentStack?.substring(0, 1000),
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      const { data } = await supabase.from('error_logs').insert(errorPayload).select('id').single();

      return data?.id || null;
    } catch (e) {
      console.error('Failed to log error:', e);
      return null;
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      // Кастомный fallback или дефолтный
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
          <Card padding="lg" className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-red/10 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>

            <h2 className="text-lg font-semibold">Что-то пошло не так</h2>

            <p className="text-sm text-text-muted">
              {this.state.error?.message || 'Неизвестная ошибка'}
            </p>

            {this.state.errorId && (
              <p className="text-xs text-text-muted">
                Код ошибки: <code className="text-accent-green">{this.state.errorId}</code>
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="primary" onClick={this.handleRetry} className="flex-1">
                Попробовать снова
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Обновить страницу
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
