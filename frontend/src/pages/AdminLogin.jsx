import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminLogin() {
    const navigate = useNavigate();
    const { admin, setAdmin } = useAdminAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // if already logged in, redirect
        if (admin && admin.username && admin.password) {
            navigate('/admin');
        }
    }, [admin, navigate]);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await API.post('/admin/login', { username, password });
            // success - save credentials in context which will set axios auth and persist to localStorage
            setAdmin({ username, password });
            navigate('/admin');
        } catch (err) {
            console.error('login failed', err);
            setError('Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-shell flex min-h-screen items-center justify-center bg-page px-3 py-6 sm:px-4">
            <div className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-xl sm:p-6">
                <h1 className="mb-2 text-2xl font-bold text-gray-900">Admin Login</h1>
                <p className="mb-4 text-sm text-gray-500">Sign in to manage live orders and menu operations from your phone.</p>
                {error && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                <form onSubmit={submit}>
                    <label className="block mb-2">
                        <span className="text-sm font-medium">Username</span>
                        <input value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 block w-full rounded-2xl border border-gray-200 px-4 py-3" />
                    </label>
                    <label className="block mb-4">
                        <span className="text-sm font-medium">Password</span>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full rounded-2xl border border-gray-200 px-4 py-3" />
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button type="submit" disabled={loading} className="touch-button rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white">
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                        <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-600">Back to menu</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

