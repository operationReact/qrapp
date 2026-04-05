import { useState } from "react";
import { useCart } from "../context/CartContext";
import PropTypes from 'prop-types';
import API from '../services/api';

export default function ProductModal({ item, onClose }) {
    const { addItem } = useCart();
    const [qty, setQty] = useState(1);

    if (!item) return null;

    const computeImageSrc = (url) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const base = (API && API.defaults && API.defaults.baseURL) ? API.defaults.baseURL : '';
        return `${base}${url}`;
    };
    const imageSrc = computeImageSrc(item.imageUrl);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 md:items-center md:p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>

            <div className="z-10 max-h-[90vh] w-full overflow-y-auto rounded-[1.75rem] bg-white p-4 shadow-xl md:max-w-md md:p-6">
                {imageSrc && (
                    <img loading="lazy" src={imageSrc} alt={item.name} className="mb-4 h-44 w-full rounded-2xl object-cover opacity-0 transition-opacity duration-500 md:h-56" onLoad={(e)=> e.currentTarget.classList.remove('opacity-0')} />
                )}
                <h3 className="text-xl font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>

                <div className="mt-4 flex items-center gap-3">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-200 text-lg transition-transform duration-150 active:scale-95">-</button>
                    <div className="min-w-[2rem] px-2 text-center text-base font-semibold">{qty}</div>
                    <button onClick={() => setQty(q => q + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-200 text-lg transition-transform duration-150 active:scale-95">+</button>

                    <div className="ml-auto text-lg font-semibold">₹{item.price * qty}</div>
                </div>

                <div className="mt-4 flex flex-col gap-2 md:flex-row">
                    <button onClick={() => { for (let i=0;i<qty;i++) addItem(item); onClose(); }} className="touch-button w-full rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white transition-transform duration-150 active:scale-95">Add & Close</button>
                    <button onClick={onClose} className="touch-button w-full rounded-2xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-transform duration-150 active:scale-95 md:w-auto md:px-5">Cancel</button>
                </div>
            </div>
        </div>
    );
}

ProductModal.propTypes = {
    item: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        name: PropTypes.string,
        price: PropTypes.number,
        description: PropTypes.string,
        imageUrl: PropTypes.string,
        category: PropTypes.string
    }),
    onClose: PropTypes.func.isRequired
};
