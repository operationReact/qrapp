import React from 'react';
import PropTypes from 'prop-types';

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
                <div className="flex min-h-screen items-center justify-center bg-page p-3 sm:p-4">
                    <div className="w-full max-w-3xl rounded-[1.75rem] bg-white p-5 shadow-xl sm:p-6">
                        <h2 className="mb-2 text-xl font-bold text-gray-900">Something went wrong</h2>
                        <div className="mb-4 text-sm text-gray-700">An unexpected error occurred while rendering the application. Details:</div>
                        <pre className="overflow-auto rounded-2xl bg-gray-100 p-3 text-xs" style={{ maxHeight: '40vh' }}>
                            {String(this.state.error && this.state.error.toString())}
                            {this.state.info && this.state.info.componentStack}
                        </pre>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <button onClick={() => window.location.reload()} className="touch-button rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white">Reload</button>
                            <button onClick={() => { this.setState({ error: null, info: null }); }} className="touch-button rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700">Dismiss</button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node,
};

