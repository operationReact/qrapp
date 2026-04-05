import { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { updateMenuItem } from '../services/api';
import API from '../services/api';

export default function MenuItemEditModal({ item, onClose, onSuccess, onPreviewChange }) {
    const previewRef = useRef(null);
    const [form, setForm] = useState({
        name: '',
        price: '',
        category: '',
        description: '',
        imageUrl: '',
        available: true,
        recommended: false,
        tag: '',
        isVeg: false,
        imageFile: null,
        previewUrl: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (item) {
            const initialPreview = item.imageUrl || '';
            setForm({
                name: item.name || '',
                price: item.price != null ? String(item.price) : '',
                category: item.category || '',
                description: item.description || '',
                imageUrl: item.imageUrl || '',
                available: item.available == null ? true : !!item.available,
                recommended: !!item.recommended,
                tag: item.tag || '',
                isVeg: !!item.isVeg,
                imageFile: null,
                previewUrl: initialPreview
            });
            // ensure previewRef is synced to existing url when initialized
            previewRef.current = initialPreview || null;
            setError(null);
            if (onPreviewChange) onPreviewChange(initialPreview);
        }
    }, [item, onPreviewChange]);

    const computeImageSrc = (url) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const base = (API && API.defaults && API.defaults.baseURL) ? API.defaults.baseURL : '';
        return `${base}${url}`;
    };

    const handleChange = (key) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm(f => ({ ...f, [key]: value }));
    }

    const toggleAvailable = () => setForm(f => ({ ...f, available: !f.available }));

    const validate = () => {
        if (!form.name.trim()) return 'Name is required';
        if (form.price === '' || isNaN(Number(form.price))) return 'Valid price is required';
        return null;
    }

    // handle file selection and preview
    const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        // basic validation
        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
        }
        const MAX_BYTES = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_BYTES) {
            setError('Image must be 5MB or smaller');
            return;
        }
        // revoke previous preview if any
        if (previewRef.current && typeof previewRef.current === 'string' && previewRef.current.startsWith('blob:')) {
            try { URL.revokeObjectURL(previewRef.current); } catch (err) { /* ignore */ }
        }
        const preview = URL.createObjectURL(file);
        previewRef.current = preview;
        setForm(f => ({ ...f, imageFile: file, previewUrl: preview }));
        setError(null);
        if (onPreviewChange) onPreviewChange(preview);
    }

    const handleRemoveFile = () => {
        if (previewRef.current && typeof previewRef.current === 'string' && previewRef.current.startsWith('blob:')) {
            try { URL.revokeObjectURL(previewRef.current); } catch (err) { /* ignore */ }
        }
        previewRef.current = null;
        setForm(f => ({ ...f, imageFile: null, previewUrl: '' }));
        if (onPreviewChange) onPreviewChange('');
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const v = validate();
        if (v) { setError(v); return; }

        setSubmitting(true);
        setError(null);
        try {
            // If an image file is selected, send multipart/form-data
            let res;
            if (form.imageFile) {
                const fd = new FormData();
                fd.append('name', form.name.trim());
                fd.append('price', String(Number(form.price)));
                fd.append('category', form.category.trim());
                fd.append('description', form.description.trim());
                fd.append('available', String(!!form.available));
                fd.append('recommended', String(!!form.recommended));
                fd.append('tag', form.tag.trim());
                fd.append('isVeg', String(!!form.isVeg));
                fd.append('image', form.imageFile);
                res = await updateMenuItem(item.id, fd);
            } else {
                const payload = {
                    name: form.name.trim(),
                    price: Number(form.price),
                    category: form.category.trim(),
                    description: form.description.trim(),
                    imageUrl: form.imageUrl ? form.imageUrl.trim() : item.imageUrl || '',
                    available: !!form.available,
                    recommended: !!form.recommended,
                    tag: form.tag.trim(),
                    isVeg: !!form.isVeg
                };
                res = await updateMenuItem(item.id, payload);
            }

            const updated = res?.data || { ...item, ...form };
            if (onSuccess) onSuccess(updated);
            onClose();
        } catch (err) {
            console.error('update failed', err);
            setError(err?.response?.data?.message || 'Failed to update');
        } finally {
            setSubmitting(false);
        }
    }

    if (!item) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6 mx-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Edit menu item</h3>
                    <button onClick={() => { if (onPreviewChange) onPreviewChange(''); onClose(); }} className="text-gray-500">✕</button>
                </div>

                {error && <div className="text-red-600 mb-3">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input value={form.name} onChange={handleChange('name')} className="mt-1 block w-full border rounded px-3 py-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Price</label>
                            <input value={form.price} onChange={handleChange('price')} className="mt-1 block w-full border rounded px-3 py-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Category</label>
                            <input value={form.category} onChange={handleChange('category')} className="mt-1 block w-full border rounded px-3 py-2" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Tag</label>
                            <input value={form.tag} onChange={handleChange('tag')} className="mt-1 block w-full border rounded px-3 py-2" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">Description</label>
                            <textarea value={form.description} onChange={handleChange('description')} className="mt-1 block w-full border rounded px-3 py-2" rows={3} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Image</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full" />
                            <div className="mt-2 text-xs text-gray-500">Leave blank to keep current image. Max 5MB.</div>
                            {form.previewUrl ? (
                                <div className="mt-2 flex items-center gap-3">
                                    <img src={form.previewUrl.startsWith('http') ? form.previewUrl : computeImageSrc(form.previewUrl)} alt={form.name} className="w-24 h-24 object-cover rounded" />
                                    <button type="button" onClick={handleRemoveFile} className="px-2 py-1 bg-gray-100 rounded">Remove</button>
                                </div>
                            ) : (form.imageUrl ? (
                                <div className="mt-2">
                                    <img src={form.imageUrl.startsWith('http') ? form.imageUrl : computeImageSrc(form.imageUrl)} alt={form.name} className="w-24 h-24 object-cover rounded" />
                                </div>
                            ) : null)}
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center space-x-3">
                                <span className="text-sm">Available</span>
                                <button type="button" onClick={toggleAvailable} role="switch" aria-checked={form.available} className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${form.available ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <span className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.available ? 'translate-x-5' : ''}`} />
                                </button>
                            </label>

                            <label className="flex items-center">
                                <input type="checkbox" checked={form.recommended} onChange={handleChange('recommended')} className="mr-2" />
                                <span className="text-sm">Recommended</span>
                            </label>

                            <label className="flex items-center">
                                <input type="checkbox" checked={form.isVeg} onChange={handleChange('isVeg')} className="mr-2" />
                                <span className="text-sm">Veg</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-600 text-white rounded">{submitting ? 'Saving...' : 'Save changes'}</button>
                        <button type="button" onClick={() => { if (onPreviewChange) onPreviewChange(''); onClose(); }} className="px-3 py-2 bg-gray-100 rounded">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

MenuItemEditModal.propTypes = {
    item: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
    onPreviewChange: PropTypes.func
};
