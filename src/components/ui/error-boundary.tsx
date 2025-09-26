import { Component, ReactNode } from 'react';
import { Button } from './button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border">
          <AlertTriangle className="h-12 w-12 text-warning mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <Button onClick={this.handleRetry} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface RetryableErrorProps {
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function RetryableError({ error, onRetry, isRetrying = false }: RetryableErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-destructive/5 rounded-lg border border-destructive/20">
      <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
      <p className="text-sm text-destructive mb-4">{error}</p>
      <Button 
        onClick={onRetry} 
        variant="outline" 
        size="sm" 
        disabled={isRetrying}
        className="gap-2"
      >
        {isRetrying ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
            Retrying...
          </>
        ) : (
          <>
            <RotateCcw className="h-3 w-3" />
            Retry
          </>
        )}
      </Button>
    </div>
  );
}