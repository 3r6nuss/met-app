import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 p-4">
                    <div className="bg-slate-800 border border-red-500/50 rounded-xl p-6 max-w-2xl w-full shadow-2xl">
                        <h1 className="text-2xl font-bold text-red-500 mb-4 flex items-center gap-2">
                            ⚠️ Ein kritischer Fehler ist aufgetreten
                        </h1>
                        <div className="bg-slate-950 p-4 rounded-lg overflow-auto max-h-64 mb-6 border border-slate-700">
                            <p className="font-mono text-sm text-red-300 mb-2 font-bold">
                                {this.state.error && this.state.error.toString()}
                            </p>
                            <pre className="font-mono text-xs text-slate-500 whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold transition-colors"
                            >
                                Seite neu laden
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
                            >
                                Zur Startseite
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
