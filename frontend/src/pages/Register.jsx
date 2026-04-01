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
        <div className="min-h-screen flex items-center justify-center bg-page">
            <div className="w-full max-w-md bg-white rounded shadow p-6">
                <h1 className="text-2xl font-bold mb-4">Create account</h1>
                {error && <div className="mb-3 text-red-600">{error}</div>}
                <form onSubmit={submit}>
                    <label className="block mb-2">
                        <span className="text-sm font-medium">Phone</span>
                        <input value={phone} onChange={e => setPhone(e.target.value)} required className="mt-1 block w-full border rounded px-3 py-2" />
                    </label>
                    <label className="block mb-2">
                        <span className="text-sm font-medium">Name (optional)</span>
                        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
                    </label>
                    <label className="block mb-4">
                        <span className="text-sm font-medium">Password</span>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full border rounded px-3 py-2" />
                    </label>
                    <div className="flex items-center justify-between">
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded">
                            {loading ? 'Creating...' : 'Create account'}
                        </button>
                        <button type="button" onClick={() => navigate('/login')} className="text-sm text-gray-600">Back to sign in</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

