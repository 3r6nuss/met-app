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
                <div className="p-8 bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Ein Fehler ist aufgetreten</h1>
                    <div className="bg-slate-800 p-4 rounded-lg max-w-2xl overflow-auto border border-red-500/30">
                        <p className="font-mono text-sm text-red-300 mb-2">{this.state.error && this.state.error.toString()}</p>
                        <pre className="font-mono text-xs text-slate-400 whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded transition-colors"
                    >
                        Seite neu laden
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
