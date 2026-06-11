import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary компонент для перехоплення помилок у дереві компонентів
 * Запобігає краху всього додатку при помилці в одному компоненті
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState((prev) => ({
      error,
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Логування помилки на сервер (опціонально)
    if (import.meta.env.PROD) {
      this.logErrorToServer(error, errorInfo);
    }
  }

  logErrorToServer = async (error, errorInfo) => {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                Сталася помилка
              </h1>

              <p className="text-slate-400 mb-6">
                {this.state.errorCount > 2
                  ? 'Сталось декілька помилок. Спробуйте перезавантажити сторінку.'
                  : 'Щось пішло не так. Спробуйте перезавантажити сторінку або повернутися на головну.'}
              </p>

              {import.meta.env.DEV && this.state.error && (
                <div className="bg-slate-800 rounded-lg p-4 mb-6 text-left overflow-auto max-h-48">
                  <p className="text-red-400 text-sm font-mono break-words">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-4">
                      <summary className="text-slate-300 cursor-pointer text-sm">
                        Stack trace
                      </summary>
                      <pre className="text-xs text-slate-400 mt-2 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Спробувати ще раз
                </button>
                <a
                  href="/"
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors text-center"
                >
                  На головну
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
