import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '../ui/Button.jsx';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">Application Error Encountered</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                MediAI Pulse encountered an unexpected issue while processing clinical telemetry.
                Patient records remain secure and protected.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Error Details:
                </span>
                <p className="text-xs text-rose-700 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-center gap-3">
              <Button
                variant="outline"
                size="md"
                icon={Home}
                onClick={this.handleGoHome}
              >
                Return to Portal
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={RefreshCw}
                onClick={this.handleReload}
              >
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
