import React, { useState, useEffect } from 'react';
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
        <div className="min-h-screen flex items-center justify-center bg-page">
            <div className="w-full max-w-md bg-white rounded shadow p-6">
                <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
                {error && <div className="mb-3 text-red-600">{error}</div>}
                <form onSubmit={submit}>
                    <label className="block mb-2">
                        <span className="text-sm font-medium">Username</span>
                        <input value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 block w-full border rounded px-3 py-2" />
                    </label>
                    <label className="block mb-4">
                        <span className="text-sm font-medium">Password</span>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full border rounded px-3 py-2" />
                    </label>
                    <div className="flex items-center justify-between">
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded">
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                        <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-600">Back to menu</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

