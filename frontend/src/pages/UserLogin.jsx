import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API, { loginUser } from '../services/api';
import { useUserAuth } from '../context/UserAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function UserLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, setUser } = useUserAuth();
    const { admin, setAdmin } = useAdminAuth();

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const returnPath = typeof location.state?.from === 'string' ? location.state.from : null;

    useEffect(() => {
        if (user && user.token) {
            navigate(returnPath && !returnPath.startsWith('/admin') ? returnPath : '/');
        }
        if (admin && admin.username && admin.password) {
            navigate(returnPath && returnPath.startsWith('/admin') ? returnPath : '/admin');
        }
    }, [user, admin, navigate, returnPath]);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const id = (identifier || '').trim();
        const isAdminLogin = id.toLowerCase() === 'admin';
        try {
            if (isAdminLogin) {
                await API.post('/admin/login', { username: id, password });
                setUser(null);
                setAdmin({ username: id, password });
                navigate(returnPath && returnPath.startsWith('/admin') ? returnPath : '/admin');
                return;
            }

            const res = await loginUser({ phone: id, password });
            const data = res.data || {};
            const token = data.token;
            if (!token) {
                setError('No token returned from server');
                setLoading(false);
                return;
            }
            setAdmin(null);
            setUser({ token, info: data.user || { phone: id } });
            navigate(returnPath && !returnPath.startsWith('/admin') ? returnPath : '/');
        } catch (err) {
            console.error('login failed', err);
            if (isAdminLogin) setError('Invalid admin username or password');
            else setError('Invalid phone or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-shell flex min-h-screen items-center justify-center bg-page px-3 py-6 sm:px-4">
            <div className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-xl sm:p-6">
                <div className="mb-4">
                    <h1 className="mb-2 text-2xl font-bold text-gray-900">Login</h1>
                    <p className="text-sm text-gray-500">Enter your phone number to sign in. If the username is <span className="font-semibold text-gray-700">admin</span>, you will be taken to the admin dashboard after successful login.</p>
                </div>
                {error && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
                <form onSubmit={submit}>
                    <label className="block mb-2">
                        <span className="text-sm font-medium">Phone number / username</span>
                        <input value={identifier} onChange={e => setIdentifier(e.target.value)} required className="mt-1 block w-full rounded-2xl border border-gray-200 px-4 py-3" placeholder="e.g. 1234567890 or admin" />
                    </label>
                    <label className="block mb-4">
                        <span className="text-sm font-medium">Password</span>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full rounded-2xl border border-gray-200 px-4 py-3" />
                    </label>
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button type="submit" disabled={loading} className="touch-button rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white">
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                        <Link to="/" className="text-sm text-gray-600">Back to menu</Link>
                    </div>

                    <div className="text-center text-sm text-gray-600">
                        New here? <Link to="/register" className="text-brand-600 font-medium">Create an account</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
