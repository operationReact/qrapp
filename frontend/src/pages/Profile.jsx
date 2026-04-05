import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCurrentUser, updateCurrentUser } from '../services/api';
import { useUserAuth } from '../context/UserAuthContext';

export default function Profile() {
    const navigate = useNavigate();
    const { user, setUser } = useUserAuth();
    const [form, setForm] = useState({
        name: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            if (!user?.token) {
                navigate('/login', { state: { from: '/profile' } });
                return;
            }

            try {
                const response = await getCurrentUser();
                if (!mounted) return;
                const profile = response?.data || {};
                setForm((current) => ({
                    ...current,
                    name: profile.name || '',
                    phone: profile.phone || '',
                }));
                setUser((current) => current ? { ...current, info: profile } : current);
            } catch (err) {
                if (!mounted) return;
                const message = err?.response?.data || 'Unable to load your profile right now.';
                setError(typeof message === 'string' ? message : 'Unable to load your profile right now.');
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadProfile();
        return () => { mounted = false; };
    }, [navigate, setUser, user?.token]);

    const passwordHint = useMemo(() => (
        form.newPassword ? 'Changing password requires your current password.' : 'Leave password fields empty if you only want to update name or phone.'
    ), [form.newPassword]);

    const handleChange = (key) => (event) => {
        setError('');
        setSuccess('');
        setForm((current) => ({ ...current, [key]: event.target.value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!form.phone.trim()) {
            setError('Phone number is required.');
            return;
        }

        if (form.newPassword && form.newPassword !== form.confirmPassword) {
            setError('New password and confirm password do not match.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                phone: form.phone,
            };

            if (form.newPassword) {
                payload.currentPassword = form.currentPassword;
                payload.newPassword = form.newPassword;
            }

            const response = await updateCurrentUser(payload);
            const profile = response?.data || {};
            setUser((current) => current ? { ...current, info: profile } : current);
            setForm((current) => ({
                ...current,
                name: profile.name || '',
                phone: profile.phone || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            }));
            setSuccess('Profile updated successfully.');
        } catch (err) {
            const message = err?.response?.data || 'Failed to update profile.';
            setError(typeof message === 'string' ? message : 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page-shell bg-page">
            <Navbar />

            <main className="container-premium py-6">
                <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Edit profile</h1>
                        <p className="mt-2 text-sm text-gray-500">Keep your account details updated so your orders and payments stay smooth.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                            <div className="text-xs uppercase tracking-wide text-gray-400">Account status</div>
                            <div className="mt-3 text-lg font-semibold text-gray-900">Logged in</div>
                            <div className="mt-1 text-sm text-gray-500">Your menu, wallet, and order history are linked to this account.</div>
                        </div>
                        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                            <div className="text-xs uppercase tracking-wide text-gray-400">Quick access</div>
                            <div className="mt-3 text-lg font-semibold text-gray-900">My orders</div>
                            <div className="mt-1 text-sm text-gray-500">Use the hamburger menu any time to open your account shortcuts.</div>
                        </div>
                        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                            <div className="text-xs uppercase tracking-wide text-gray-400">Security</div>
                            <div className="mt-3 text-lg font-semibold text-gray-900">Password protected</div>
                            <div className="mt-1 text-sm text-gray-500">You’ll need your current password before setting a new one.</div>
                        </div>
                    </div>

                    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                        {loading ? (
                            <div className="py-10 text-center text-gray-500">Loading profile...</div>
                        ) : (
                            <form className="space-y-5" onSubmit={handleSubmit}>
                                {error && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                        {success}
                                    </div>
                                )}

                                <div className="grid gap-5 md:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-medium text-gray-700">Full name</span>
                                        <input
                                            value={form.name}
                                            onChange={handleChange('name')}
                                            placeholder="Enter your name"
                                            className="mt-2 block w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-amber-400"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-medium text-gray-700">Phone number</span>
                                        <input
                                            value={form.phone}
                                            onChange={handleChange('phone')}
                                            required
                                            className="mt-2 block w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-amber-400"
                                        />
                                    </label>
                                </div>

                                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                    <div className="text-sm font-semibold text-amber-900">Password update</div>
                                    <div className="mt-1 text-xs text-amber-700">{passwordHint}</div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                                        <label className="block">
                                            <span className="text-sm font-medium text-gray-700">Current password</span>
                                            <input
                                                type="password"
                                                value={form.currentPassword}
                                                onChange={handleChange('currentPassword')}
                                                className="mt-2 block w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-amber-400"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="text-sm font-medium text-gray-700">New password</span>
                                            <input
                                                type="password"
                                                value={form.newPassword}
                                                onChange={handleChange('newPassword')}
                                                className="mt-2 block w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-amber-400"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="text-sm font-medium text-gray-700">Confirm password</span>
                                            <input
                                                type="password"
                                                value={form.confirmPassword}
                                                onChange={handleChange('confirmPassword')}
                                                className="mt-2 block w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-amber-400"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/orders')}
                                        className="touch-button rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                    >
                                        View my orders
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="touch-button rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {saving ? 'Saving changes...' : 'Save profile'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

