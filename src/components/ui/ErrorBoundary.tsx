import { Component, type ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card padding="lg" className="max-w-md text-center space-y-4">
            <p className="text-lg font-semibold">Что-то пошло не так</p>
            <p className="text-sm text-text-muted">{this.state.error?.message}</p>
            <Button variant="primary" onClick={this.handleRetry}>Попробовать снова</Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}