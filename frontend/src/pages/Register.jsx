import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { loginUser } from '../services/api';
import { setUserAuth } from '../services/api';
import { useUserAuth } from '../context/UserAuthContext';

export default function Register() {
    const navigate = useNavigate();
    const { setUser } = useUserAuth();

    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await API.post('/auth/register', { phone, password, name });
            // auto-login after register
            const res = await loginUser({ phone, password });
            const data = res.data || {};
            const token = data.token;
            if (!token) {
                setError('Registration succeeded but no token returned');
                setLoading(false);
                return;
            }
            // persist user in context
            setUser({ token, info: data.user || { phone, name } });
            // set axios header
            setUserAuth(token);
            navigate('/');
        } catch (err) {
            console.error('register failed', err);
            setError(err?.response?.data || 'Unable to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-shell flex min-h-screen items-center justify-center bg-page px-3 py-6 sm:px-4">
            <div className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-xl sm:p-6">
                <h1 className="mb-2 text-2xl font-bold text-gray-900">Create account</h1>
                <p className="mb-4 text-sm text-gray-500">Register once to track orders and use wallet checkout faster.</p>
                {error && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                <form onSubmit={submit}>
                    <label className="block mb-2">
                        <span className="text-sm font-medium">Phone</span>
                        <input value={phone} onChange={e => setPhone(e.target.value)} required className="mt-1 block w-full rounded-2xl border border-gray-200 px-4 py-3" />
                    </label>
                    <label className="block mb-2">
                        <span className="text-sm font-medium">Name (optional)</span>
                        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-2xl border border-gray-200 px-4 py-3" />
                    </label>
                    <label className="block mb-4">
                        <span className="text-sm font-medium">Password</span>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full rounded-2xl border border-gray-200 px-4 py-3" />
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button type="submit" disabled={loading} className="touch-button rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white">
                            {loading ? 'Creating...' : 'Create account'}
                        </button>
                        <button type="button" onClick={() => navigate('/login')} className="text-sm text-gray-600">Back to sign in</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

