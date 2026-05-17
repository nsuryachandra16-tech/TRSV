import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 [System Failure Caught]:', error, errorInfo);
  }

  handleRecovery = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-[9999]">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 p-8 rounded-3xl shadow-glow-rose relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-3xl" />
            
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertTriangle className="w-10 h-10 animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">System Exception</h2>
              <p className="text-slate-400 text-sm">
                The operations node encountered a critical UI render failure. 
                <br/><span className="text-rose-400 font-mono text-xs block mt-2">{this.state.error?.message}</span>
              </p>

              <button 
                onClick={this.handleRecovery}
                className="mt-4 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors shadow-glow-cyan flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Initialize Recovery
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
