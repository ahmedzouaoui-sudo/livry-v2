import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('finder_livry_products_v3');
      localStorage.removeItem('finder_livry_last_sync_v3');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F7FC] dark:bg-slate-950 flex items-center justify-center p-4 font-['Montserrat',sans-serif]">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[24px] p-6 text-center border-2 border-rose-200 dark:border-rose-900/60 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                Oups ! Une erreur est survenue
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                L'application a rencontré un problème inattendu mais vos données sont protégées.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-50 dark:bg-slate-800/70 rounded-[14px] p-3 text-left border border-gray-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Détail technique :
                </span>
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 break-words leading-relaxed">
                  {this.state.error.message || 'Erreur inconnue'}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full h-[46px] rounded-[14px] bg-[#0759A4] hover:bg-[#064a88] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recharger l'application</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full h-[42px] rounded-[14px] bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Vider le cache local et recharger</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
