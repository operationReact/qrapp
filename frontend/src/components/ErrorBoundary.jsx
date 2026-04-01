import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        this.setState({ error, info });
        console.error('ErrorBoundary caught', error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="max-w-3xl w-full bg-white p-6 rounded shadow">
                        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                        <div className="text-sm text-gray-700 mb-4">An unexpected error occurred while rendering the application. Details:</div>
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto" style={{ maxHeight: '40vh' }}>
                            {String(this.state.error && this.state.error.toString())}
                            {this.state.info && this.state.info.componentStack}
                        </pre>
                        <div className="mt-4 flex gap-3">
                            <button onClick={() => window.location.reload()} className="px-3 py-1 bg-brand-600 text-white rounded">Reload</button>
                            <button onClick={() => { this.setState({ error: null, info: null }); }} className="px-3 py-1 bg-gray-100 rounded">Dismiss</button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

