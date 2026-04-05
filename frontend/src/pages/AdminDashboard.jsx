import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { createMenuItem, deleteMenuItem, getMenu, updateMenuItem } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import MenuItemEditModal from '../components/MenuItemEditModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AdminOrderOperations from '../components/AdminOrderOperations';
import API from '../services/api';

function AvailabilityToggle({ item, onToggle }) {
    const [toggling, setToggling] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        await onToggle(item.id, !item.available);
        setToggling(false);
    };

    return (
        <button
            onClick={handleToggle}
            disabled={toggling}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white ${item.available ? 'bg-emerald-500' : 'bg-rose-500'}`}
        >
            {toggling ? 'Saving…' : item.available ? 'Available' : 'Unavailable'}
        </button>
    );
}

AvailabilityToggle.propTypes = {
    item: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
};

function resetMenuForm(setters) {
    setters.setName('');
    setters.setPrice('');
    setters.setCategory('Misc');
    setters.setDescription('');
    setters.setImageUrl('');
    setters.setImageFile(null);
    setters.setPreviewUrl('');
    setters.setAvailable(true);
    setters.setRecommended(false);
    setters.setTag('');
    setters.setIsVeg(false);
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { admin, setAdmin } = useAdminAuth();

    const [menu, setMenu] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [activeView, setActiveView] = useState('orders');

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('Misc');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [available, setAvailable] = useState(true);
    const [recommended, setRecommended] = useState(false);
    const [tag, setTag] = useState('');
    const [isVeg, setIsVeg] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [createSuccess, setCreateSuccess] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);

    useEffect(() => {
        if (!admin?.username || !admin?.password) {
            navigate('/admin/login');
        }
    }, [admin, navigate]);

    async function loadMenu() {
        setLoadingMenu(true);
        try {
            const response = await getMenu();
            setMenu(response.data || []);
        } catch (err) {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                setAdmin(null);
                navigate('/admin/login');
                return;
            }
            console.error(err);
        } finally {
            setLoadingMenu(false);
        }
    }

    useEffect(() => {
        loadMenu();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFileChange = (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setCreateError('Please select a valid image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setCreateError('Image must be 5MB or smaller');
            return;
        }
        if (previewUrl?.startsWith('blob:')) {
            try { URL.revokeObjectURL(previewUrl); } catch (err) { console.warn(err); }
        }
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setCreateError(null);
    };

    const handleRemoveFile = () => {
        if (previewUrl?.startsWith('blob:')) {
            try { URL.revokeObjectURL(previewUrl); } catch (err) { console.warn(err); }
        }
        setImageFile(null);
        setPreviewUrl('');
    };

    async function handleCreate(event) {
        event.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);

        if (!name.trim()) {
            setCreateError('Name is required');
            return;
        }
        if (!price || Number.isNaN(Number(price))) {
            setCreateError('Valid price is required');
            return;
        }

        setCreating(true);
        try {
            if (imageFile) {
                const formData = new FormData();
                formData.append('name', name.trim());
                formData.append('price', String(Number(price)));
                formData.append('category', category.trim() || 'Misc');
                formData.append('description', description.trim());
                formData.append('available', String(available));
                formData.append('recommended', String(recommended));
                formData.append('tag', tag.trim());
                formData.append('isVeg', String(Boolean(isVeg)));
                formData.append('image', imageFile);
                await createMenuItem(formData);
            } else {
                await createMenuItem({
                    name: name.trim(),
                    price: Number(price),
                    category: category.trim() || 'Misc',
                    description: description.trim(),
                    imageUrl: imageUrl.trim(),
                    available,
                    recommended,
                    tag: tag.trim(),
                    isVeg: Boolean(isVeg),
                });
            }
            await loadMenu();
            setCreateSuccess('Menu item created successfully');
            resetMenuForm({ setName, setPrice, setCategory, setDescription, setImageUrl, setImageFile, setPreviewUrl, setAvailable, setRecommended, setTag, setIsVeg });
            window.setTimeout(() => setCreateSuccess(null), 3000);
        } catch (err) {
            console.error(err);
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                setAdmin(null);
                navigate('/admin/login');
                return;
            }
            setCreateError(err?.response?.data?.message || err?.response?.data || 'Failed to create menu item');
        } finally {
            setCreating(false);
        }
    }

    const handleEditSuccess = (updatedItem) => {
        setMenu((prev) => prev.map((item) => item.id === updatedItem.id ? updatedItem : item));
        setEditingItem(null);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingItem) return;
        try {
            await deleteMenuItem(deletingItem.id);
            setMenu((prev) => prev.filter((item) => item.id !== deletingItem.id));
            setDeletingItem(null);
        } catch (err) {
            console.error(err);
            alert(err?.response?.data || err?.message || 'Failed to delete menu item');
        }
    };

    return (
        <div className="page-shell bg-gradient-to-b from-slate-50 via-white to-slate-100 py-4 sm:py-6">
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-4">
                <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">Bro & Bro Admin</p>
                            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Professional control desk</h1>
                            <p className="mt-2 max-w-3xl text-sm text-slate-600">Run the restaurant from one place: manage live orders, move every order through the kitchen workflow, catch delayed handoffs, and keep the menu polished.</p>
                        </div>
                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                                Signed in as <strong className="text-slate-900">{admin?.username}</strong>
                            </div>
                            <button onClick={() => navigate('/admin/orders')} className="touch-button rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Open full orders page</button>
                            <button onClick={() => { setAdmin(null); navigate('/admin/login'); }} className="touch-button rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">Sign out</button>
                        </div>
                    </div>
                </header>

                <nav className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                    <button onClick={() => setActiveView('orders')} className={`touch-button rounded-2xl px-5 py-3 text-sm font-semibold transition ${activeView === 'orders' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'}`}>Order operations</button>
                    <button onClick={() => setActiveView('menu')} className={`touch-button rounded-2xl px-5 py-3 text-sm font-semibold transition ${activeView === 'menu' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'}`}>Menu management</button>
                </nav>

                <div className="mt-6 space-y-6">
                    {activeView === 'orders' && <AdminOrderOperations embedded />}

                    {activeView === 'menu' && (
                        <section className="space-y-6">
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">Menu management</h2>
                                        <p className="mt-1 text-sm text-slate-500">Your existing menu tools stay available here, while order operations remain the primary landing experience.</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">{menu.length} menu items</div>
                                </div>

                                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    {createError && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{createError}</div>}
                                    {createSuccess && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{createSuccess}</div>}

                                    <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        <label className="block text-sm font-medium text-slate-700">
                                            Name
                                            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Item name" required />
                                        </label>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Price
                                            <input value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="e.g. 99.50" required />
                                        </label>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Category
                                            <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Category" />
                                        </label>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Tag
                                            <input value={tag} onChange={(e) => setTag(e.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="e.g. Bestseller" />
                                        </label>
                                        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                                            Veg item
                                            <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                                        </label>
                                        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                                            Recommended
                                            <input type="checkbox" checked={recommended} onChange={(e) => setRecommended(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                                        </label>

                                        <label className="md:col-span-2 xl:col-span-3 block text-sm font-medium text-slate-700">
                                            Description
                                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Optional description" />
                                        </label>

                                        <div className="md:col-span-2 xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                                            <label className="block text-sm font-medium text-slate-700">Image upload</label>
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="mt-3 block w-full text-sm" />
                                            <p className="mt-2 text-xs text-slate-500">Upload an image or leave blank and use the external image URL field below. Max 5MB.</p>
                                            {previewUrl && (
                                                <div className="mt-4 flex items-center gap-3">
                                                    <img src={previewUrl} alt={name || 'Preview'} className="h-20 w-20 rounded-2xl object-cover" />
                                                    <button type="button" onClick={handleRemoveFile} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">Remove</button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <div className="text-sm font-medium text-slate-700">Availability</div>
                                            <button type="button" onClick={() => setAvailable((prev) => !prev)} className={`mt-4 inline-flex w-14 items-center rounded-full p-1 transition ${available ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                <span className={`h-6 w-6 rounded-full bg-white shadow transition ${available ? 'translate-x-7' : ''}`} />
                                            </button>
                                            <p className="mt-3 text-sm text-slate-500">Currently {available ? 'available' : 'unavailable'} on the menu.</p>
                                        </div>

                                        <label className="md:col-span-2 xl:col-span-3 block text-sm font-medium text-slate-700">
                                            External image URL
                                            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="https://..." />
                                        </label>

                                        <div className="md:col-span-2 xl:col-span-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                            <button type="submit" disabled={creating} className="touch-button rounded-2xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{creating ? 'Creating…' : 'Create item'}</button>
                                            <button type="button" onClick={() => { resetMenuForm({ setName, setPrice, setCategory, setDescription, setImageUrl, setImageFile, setPreviewUrl, setAvailable, setRecommended, setTag, setIsVeg }); setCreateError(null); setCreateSuccess(null); }} className="touch-button rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Reset</button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                {loadingMenu && Array.from({ length: 4 }).map((_, index) => (
                                    <div key={index} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
                                ))}

                                {!loadingMenu && menu.map((item) => (
                                    <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div className="flex items-start gap-4">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://') ? item.imageUrl : `${API.defaults.baseURL}${item.imageUrl}`} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                                                ) : (
                                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-400">No image</div>
                                                )}
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                                                        {item.recommended && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Recommended</span>}
                                                    </div>
                                                    <p className="mt-1 text-sm text-slate-500">{item.category} • ₹{item.price}</p>
                                                    <p className="mt-3 text-sm text-slate-600">{item.description || 'No description added yet.'}</p>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                        <span className={`rounded-full px-2.5 py-1 font-semibold ${item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.available ? 'Available' : 'Unavailable'}</span>
                                                        {item.isVeg && <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">Veg</span>}
                                                        {item.tag && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{item.tag}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 xl:items-end">
                                                <AvailabilityToggle item={item} onToggle={async (id, next) => {
                                                    setMenu((prev) => prev.map((current) => current.id === id ? { ...current, available: next } : current));
                                                    try {
                                                        await updateMenuItem(id, { available: next });
                                                    } catch (err) {
                                                        console.error(err);
                                                        setMenu((prev) => prev.map((current) => current.id === id ? { ...current, available: !next } : current));
                                                        alert(err?.response?.data || 'Failed to update availability');
                                                    }
                                                }} />
                                                <button
                                                    onClick={async () => {
                                                        const nextRecommended = !item.recommended;
                                                        setMenu((prev) => prev.map((current) => current.id === item.id ? { ...current, recommended: nextRecommended } : current));
                                                        try {
                                                            await updateMenuItem(item.id, { recommended: nextRecommended });
                                                        } catch (err) {
                                                            console.error(err);
                                                            setMenu((prev) => prev.map((current) => current.id === item.id ? { ...current, recommended: !nextRecommended } : current));
                                                            alert(err?.response?.data || 'Failed to update recommendation');
                                                        }
                                                    }}
                                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white ${item.recommended ? 'bg-amber-500' : 'bg-slate-500'}`}
                                                >
                                                    {item.recommended ? 'Recommended' : 'Mark recommended'}
                                                </button>
                                                <button onClick={() => setEditingItem(item)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Edit</button>
                                                <button onClick={() => setDeletingItem(item)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <MenuItemEditModal item={editingItem} onClose={() => setEditingItem(null)} onSuccess={handleEditSuccess} />
                {deletingItem && (
                    <ConfirmDialog
                        title="Delete menu item"
                        message={`Are you sure you want to delete "${deletingItem.name}"?`}
                        onCancel={() => setDeletingItem(null)}
                        onConfirm={handleDeleteConfirm}
                    />
                )}

            </div>
        </div>
    );
}
