/* eslint-disable */
/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getMenu, createMenuItem, getOrdersAdmin, updateOrderStatusAdmin, deleteMenuItem, updateMenuItem } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import MenuItemEditModal from '../components/MenuItemEditModal';
import ConfirmDialog from '../components/ConfirmDialog';
import API from '../services/api';

function AvailabilityToggle({ item, onToggle }) {
    const [toggling, setToggling] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        onToggle(item.id, !item.available);
        setToggling(false);
    };

    return (
        <button
            onClick={handleToggle}
            disabled={toggling}
            className={`px-3 py-1 rounded ${item.available ? 'bg-green-500' : 'bg-red-500'} text-white`}
        >
            {toggling ? 'Saving...' : item.available ? 'Available' : 'Unavailable'}
        </button>
    );
}

AvailabilityToggle.propTypes = {
    item: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
};

export default function AdminDashboard() {
    const { admin, setAdmin } = useAdminAuth();
    const navigate = useNavigate();

    // Shared data
    const [menu, setMenu] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Menu form state (used in Menu Management view)
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

    // Menu editing
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);

    // View selector: 'inventory' | 'addBill' | 'orders' | 'menu'
    const [activeView, setActiveView] = useState('orders');

    // Bills (simple local store until backend provided)
    const [bills, setBills] = useState([]);
    const [billDate, setBillDate] = useState('');
    const [billAmount, setBillAmount] = useState('');
    const [billReason, setBillReason] = useState('');
    const [billError, setBillError] = useState(null);
    const [billSuccess, setBillSuccess] = useState(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const m = await getMenu();
                setMenu(m.data || []);
                const o = await getOrdersAdmin();
                const od = o.data || {};
                setOrders(od.content || []);
            } catch (e) {
                // If unauthorized, clear admin and redirect to login
                if (e?.response?.status === 401 || e?.response?.status === 403) {
                    setAdmin(null);
                    navigate('/login');
                    return;
                }
                console.error(e);
            } finally { setLoading(false); }
        }
        load();
    }, [setAdmin, navigate]);

    // --- Menu handlers (used only in Menu Management view) ---
    const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setCreateError('Please select a valid image file');
            return;
        }
        const MAX_BYTES = 5 * 1024 * 1024;
        if (file.size > MAX_BYTES) {
            setCreateError('Image must be 5MB or smaller');
            return;
        }
        if (previewUrl && previewUrl.startsWith('blob:')) {
            try { URL.revokeObjectURL(previewUrl); } catch (err) { console.warn(err); }
        }
        const p = URL.createObjectURL(file);
        setImageFile(file);
        setPreviewUrl(p);
        setCreateError(null);
    };

    const handleRemoveFile = () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            try { URL.revokeObjectURL(previewUrl); } catch (err) { console.warn(err); }
        }
        setImageFile(null);
        setPreviewUrl('');
    };

    async function handleCreate(e) {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);

        if (!name.trim()) { setCreateError('Name is required'); return; }
        if (!price || isNaN(Number(price))) { setCreateError('Valid price is required'); return; }

        setCreating(true);
        try {
            if (imageFile) {
                const fd = new FormData();
                fd.append('name', name.trim());
                fd.append('price', String(Number(price)));
                fd.append('category', category.trim() || 'Misc');
                fd.append('description', description.trim());
                fd.append('available', String(available));
                fd.append('recommended', String(recommended));
                fd.append('tag', tag.trim());
                fd.append('isVeg', String(!!isVeg));
                fd.append('image', imageFile);
                await createMenuItem(fd);
            } else {
                const payload = {
                    name: name.trim(),
                    price: Number(price),
                    category: category.trim() || 'Misc',
                    description: description.trim(),
                    imageUrl: imageUrl.trim(),
                    available,
                    recommended,
                    tag: tag.trim(),
                    isVeg: !!isVeg,
                };
                await createMenuItem(payload);
            }
            const m = await getMenu(); setMenu(m.data || []);
            setCreateSuccess('Menu item created');
            // clear form
            setName(''); setPrice(''); setCategory('Misc'); setDescription(''); setImageUrl(''); setImageFile(null); setPreviewUrl(''); setAvailable(true); setRecommended(false);
            setTag(''); setIsVeg(false);
            // auto clear success after a short while
            setTimeout(() => setCreateSuccess(null), 3000);
        } catch (err) {
            console.error('create failed', err);
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                setAdmin(null);
                navigate('/login');
                return;
            }
            setCreateError(err?.response?.data?.message || 'Failed to create menu item');
        } finally { setCreating(false); }
    }

    // --- Orders / availability ---
    async function markReady(id) {
        try {
            await updateOrderStatusAdmin(id, { status: 'READY' });
            const o = await getOrdersAdmin(); const od = o.data || {}; setOrders(od.content || []);
        } catch (err) {
            console.error(err);
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                setAdmin(null);
                navigate('/login');
            }
        }
    }

    const handleEditClick = (item) => setEditingItem(item);
    const handleEditSuccess = (updated) => {
        setMenu(prev => prev.map(i => i.id === updated.id ? updated : i));
        setEditingItem(null);
    };

    const handleDeleteClick = (item) => setDeletingItem(item);
    const handleDeleteConfirm = async () => {
        if (!deletingItem) return;
        try {
            await deleteMenuItem(deletingItem.id);
            setMenu(prev => prev.filter(i => i.id !== deletingItem.id));
            setDeletingItem(null);
        } catch (err) {
            console.error('delete failed', err);
            const serverMsg = err?.response?.data || err?.message || 'Failed to delete';
            alert(serverMsg);
        }
    };

    // --- Bills management (local) ---
    const handleAddBill = (e) => {
        e.preventDefault();
        setBillError(null);
        setBillSuccess(null);
        if (!billDate) { setBillError('Date required'); return; }
        if (!billAmount || isNaN(Number(billAmount))) { setBillError('Valid amount required'); return; }
        if (!billReason.trim()) { setBillError('Reason required'); return; }
        const newBill = { id: Date.now(), date: billDate, amount: Number(billAmount), reason: billReason };
        setBills(prev => [newBill, ...prev]);
        setBillDate(''); setBillAmount(''); setBillReason('');
        setBillSuccess('Bill added');
        setTimeout(() => setBillSuccess(null), 3000);
    };

    // --- Inventory placeholder ---
    const [inventory, setInventory] = useState([]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 py-6">
            <div className="w-full px-3 sm:px-4 md:mx-auto md:max-w-5xl lg:max-w-6xl">

                {/* HEADER: brand + admin actions */}
                <header className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center text-white text-xl font-bold shadow">B&B</div>
                        <div>
                            <h1 className="text-2xl font-bold">Bro & Bro — Admin</h1>
                            <div className="text-sm text-gray-600">Manager console</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-700 mr-3">Signed in as <strong>{admin?.username}</strong></div>
                        <button onClick={() => setAdmin(null)} className="px-3 py-2 bg-white border rounded shadow-sm text-sm">Sign out</button>
                    </div>
                </header>

                {/* METRICS CARDS */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500">Total Orders</div>
                            <div className="text-2xl font-bold">{orders.length}</div>
                        </div>
                        <div className="text-3xl text-amber-500">📦</div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500">Pending</div>
                            <div className="text-2xl font-bold">{orders.filter(o=> (o.status||'').toUpperCase()==='PLACED').length}</div>
                        </div>
                        <div className="text-3xl text-red-500">⏳</div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500">Ready</div>
                            <div className="text-2xl font-bold">{orders.filter(o=> (o.status||'').toUpperCase()==='READY').length}</div>
                        </div>
                        <div className="text-3xl text-green-500">✅</div>
                    </div>
                </section>

                {/* Navigation tabs */}
                <nav className="mb-6">
                    <div className="inline-flex bg-white rounded-lg shadow p-1">
                        <button onClick={() => setActiveView('orders')} className={`px-4 py-2 rounded-lg transition ${activeView==='orders' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Orders</button>
                        <button onClick={() => setActiveView('menu')} className={`px-4 py-2 rounded-lg transition ${activeView==='menu' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Menu</button>
                        <button onClick={() => setActiveView('inventory')} className={`px-4 py-2 rounded-lg transition ${activeView==='inventory' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Inventory</button>
                        <button onClick={() => setActiveView('addBill')} className={`px-4 py-2 rounded-lg transition ${activeView==='addBill' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Bills</button>
                    </div>
                </nav>

                {/* CONTENT AREA */}
                <div className="space-y-6">
                    {activeView === 'orders' && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold">Order Management</h2>
                                <div className="text-sm text-gray-500">Auto-updates when new orders arrive</div>
                            </div>

                            {loading ? <div className="p-6 bg-white rounded shadow">Loading orders...</div> : (
                                <div className="grid grid-cols-1 gap-4">
                                    {orders.length === 0 && <div className="p-6 bg-white rounded shadow text-gray-500">No orders</div>}
                                    {orders.map(o => (
                                        <article key={o.id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-semibold text-gray-600">#{o.id}</div>
                                                <div>
                                                    <div className="font-semibold">Order #{o.id} — <span className="text-sm text-gray-500">{(o.status||'').toUpperCase()}</span></div>
                                                    <div className="text-sm text-gray-600">{o.phone} • {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</div>
                                                    {o.items && o.items.length>0 && (
                                                        <div className="mt-2 text-sm text-gray-700">
                                                            {o.items.slice(0,3).map(it => (`${it.name} x${it.quantity}`)).join(', ')}{o.items.length>3? ' + more':''}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-3 sm:mt-0 flex items-center gap-3">
                                                <div className="text-lg font-semibold">₹{o.total || o.amount || 0}</div>
                                                <button onClick={() => markReady(o.id)} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow">Mark READY</button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {activeView === 'menu' && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4">Menu Management</h2>
                            <div className="bg-white p-4 rounded shadow mb-6">
                                {createError && <div className="text-red-600 mb-3">{createError}</div>}
                                {createSuccess && <div className="text-green-600 mb-3">{createSuccess}</div>}

                                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium">Name</label>
                                        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="Item name" required />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium">Price</label>
                                        <input value={price} onChange={e => setPrice(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="e.g. 99.50" required />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium">Category</label>
                                        <input value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="Category" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium">Tag</label>
                                        <input value={tag} onChange={e => setTag(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="e.g. Special" />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="block text-sm font-medium">Veg</label>
                                        <input type="checkbox" checked={isVeg} onChange={e => setIsVeg(e.target.checked)} className="ml-2" />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="block text-sm font-medium">Recommended</label>
                                        <input type="checkbox" checked={recommended} onChange={e => setRecommended(e.target.checked)} className="ml-2" />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-medium">Description</label>
                                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" rows={3} placeholder="Optional description" />
                                    </div>

                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                                        <div>
                                            <label className="block text-sm font-medium">Image</label>
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full" />
                                            <div className="mt-2 text-xs text-gray-500">Or provide an external URL below. Leave blank to keep none. Max 5MB.</div>
                                            {previewUrl ? (
                                                <div className="mt-2 flex items-center gap-3">
                                                    <img src={previewUrl} alt={name} className="w-24 h-24 object-cover rounded" />
                                                    <button type="button" onClick={handleRemoveFile} className="px-2 py-1 bg-gray-100 rounded">Remove</button>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm">Available</label>
                                            <button type="button" onClick={() => setAvailable(a => !a)} role="switch" aria-checked={available} className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${available ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <span className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${available ? 'translate-x-5' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-medium">External image URL (optional)</label>
                                        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="https://..." />
                                    </div>

                                    <div className="md:col-span-3 flex items-center space-x-3 mt-3">
                                        <button type="submit" disabled={creating} className="px-4 py-2 bg-brand-600 text-white rounded">{creating ? 'Creating...' : 'Create Item'}</button>
                                        <button type="button" onClick={() => { setName(''); setPrice(''); setCategory('Misc'); setDescription(''); setImageUrl(''); setImageFile(null); setPreviewUrl(''); setAvailable(true); setRecommended(false); setTag(''); setIsVeg(false); setCreateError(null); setCreateSuccess(null); }} className="px-3 py-2 bg-gray-100 rounded">Reset</button>
                                    </div>
                                </form>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-4">Menu</h3>
                                {loading ? <div>Loading...</div> : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {menu.map(m => (
                                            <div key={m.id} className="bg-white p-4 rounded shadow flex items-start justify-between">
                                                <div className="flex items-start">
                                                    {m.imageUrl ? <img src={(m.imageUrl.startsWith('http://') || m.imageUrl.startsWith('https://')) ? m.imageUrl : `${API.defaults.baseURL}${m.imageUrl}`} alt={m.name} className="w-20 h-20 object-cover rounded mr-4" /> : <div className="w-20 h-20 bg-gray-100 rounded mr-4 flex items-center justify-center text-gray-400">No Image</div>}
                                                    <div>
                                                        <div className="font-semibold">{m.name}</div>
                                                        <div className="text-sm text-gray-600">{m.category}</div>
                                                        <div className="mt-1">₹{m.price}</div>
                                                        <div className="mt-2 text-sm">{m.description}</div>
                                                        <div className="mt-2 text-sm flex items-center gap-2">
                                                            {m.available ? <span className="text-green-600">Available</span> : <span className="text-red-600">Unavailable</span>}
                                                            {m.recommended ? <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">Recommended</span> : null}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 ml-4 items-end">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm">Available</label>
                                                        <AvailabilityToggle item={m} onToggle={async (id, next) => {
                                                            // optimistic update
                                                            setMenu(prev => prev.map(i => i.id === id ? { ...i, available: next } : i));
                                                            try {
                                                                await updateMenuItem(id, { available: next });
                                                            } catch (err) {
                                                                console.error('availability toggle failed', err);
                                                                // rollback
                                                                setMenu(prev => prev.map(i => i.id === id ? { ...i, available: !next } : i));
                                                                alert(err?.response?.data?.message || 'Failed to update availability');
                                                            }
                                                        }} />
                                                    </div>

                                                    <button
                                                        onClick={async () => {
                                                            const next = !m.recommended;
                                                            setMenu(prev => prev.map(i => i.id === m.id ? { ...i, recommended: next } : i));
                                                            try {
                                                                await updateMenuItem(m.id, { recommended: next });
                                                            } catch (err) {
                                                                console.error('recommended toggle failed', err);
                                                                setMenu(prev => prev.map(i => i.id === m.id ? { ...i, recommended: !next } : i));
                                                                alert(err?.response?.data?.message || 'Failed to update recommendation');
                                                            }
                                                        }}
                                                        className={`px-3 py-1 rounded text-white ${m.recommended ? 'bg-amber-500' : 'bg-gray-500'}`}
                                                    >
                                                        {m.recommended ? 'Recommended' : 'Mark Recommended'}
                                                    </button>

                                                    <div className="flex flex-col gap-2">
                                                        <button onClick={() => handleEditClick(m)} className="px-3 py-1 bg-yellow-400 rounded">Edit</button>
                                                        <button onClick={() => handleDeleteClick(m)} className="px-3 py-1 bg-red-400 rounded">Delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {activeView === 'inventory' && (
                        <section className="bg-white p-4 rounded shadow">
                            <h2 className="text-xl font-semibold mb-4">Inventory Management</h2>
                            <p className="text-sm text-gray-600 mb-4">Placeholder inventory tools. Add real inventory CRUD or import here.</p>
                            <div>
                                <button className="px-3 py-2 bg-green-500 text-white rounded" onClick={() => setInventory(prev => [...prev, { id: Date.now(), name: 'Sample Item', qty: 10 }])}>Add sample inventory item</button>
                            </div>
                            <div className="mt-4 grid gap-2">
                                {inventory.length === 0 ? <div className="text-gray-500">No items</div> : inventory.map(it => (
                                    <div key={it.id} className="p-2 border rounded flex justify-between items-center">
                                        <div>{it.name}</div>
                                        <div className="text-sm text-gray-600">Qty: {it.qty}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {activeView === 'addBill' && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4">Add Bill</h2>
                            {billError && <div className="text-red-600 mb-2">{billError}</div>}
                            {billSuccess && <div className="text-green-600 mb-2">{billSuccess}</div>}
                            <form onSubmit={handleAddBill} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded shadow">
                                <div>
                                    <label className="block text-sm font-medium">Date</label>
                                    <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Amount</label>
                                    <input value={billAmount} onChange={e => setBillAmount(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Reason</label>
                                    <input value={billReason} onChange={e => setBillReason(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
                                </div>
                                <div className="md:col-span-3 mt-3">
                                    <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded">Add Bill</button>
                                </div>
                            </form>

                            <h3 className="text-lg font-semibold mt-4">Recent Bills</h3>
                            <div className="mt-2">
                                {bills.length === 0 ? <div className="text-gray-500">No bills</div> : bills.map(b => (
                                    <div key={b.id} className="p-2 border rounded mb-2 bg-white">
                                        <div className="font-medium">₹{b.amount} — {b.reason}</div>
                                        <div className="text-sm text-gray-600">{b.date}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Keep edit modal and confirm dialog alive (they are defined below in file) */}
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
