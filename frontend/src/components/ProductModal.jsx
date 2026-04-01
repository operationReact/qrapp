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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>

            <div className="bg-white rounded-t-xl w-full md:rounded-lg md:max-w-md md:w-full z-10 p-4 md:p-6">
                {imageSrc && (
                    <img loading="lazy" src={imageSrc} alt={item.name} className="w-full h-40 md:h-56 object-cover rounded-md mb-4 opacity-0 transition-opacity duration-500" onLoad={(e)=> e.currentTarget.classList.remove('opacity-0')} />
                )}
                <h3 className="text-xl font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>

                <div className="flex items-center gap-3 mt-4">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-2 bg-gray-200 rounded-md transition-transform duration-150 active:scale-95">-</button>
                    <div className="px-4">{qty}</div>
                    <button onClick={() => setQty(q => q + 1)} className="px-4 py-2 bg-gray-200 rounded-md transition-transform duration-150 active:scale-95">+</button>

                    <div className="ml-auto font-semibold">₹{item.price * qty}</div>
                </div>

                <div className="mt-4 flex flex-col md:flex-row gap-2">
                    <button onClick={() => { for (let i=0;i<qty;i++) addItem(item); onClose(); }} className="w-full bg-brand-600 text-white py-3 rounded-md transition-transform duration-150 active:scale-95">Add & Close</button>
                    <button onClick={onClose} className="w-full md:w-auto border py-3 rounded-md transition-transform duration-150 active:scale-95">Cancel</button>
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
