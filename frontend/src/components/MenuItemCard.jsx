import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import PropTypes from "prop-types";
import API from "../services/api";

export default function MenuItemCard({ item, onEdit, onDelete }) {
    const { cart, addItem, decreaseItem } = useCart();
    const { admin } = useAdminAuth();
    const [imgError, setImgError] = useState(false);

    const existing = cart.find((i) => i.id === item.id);
    const qty = existing ? existing.quantity : 0;

    const computeImageSrc = (url) => {
        if (!url) return null;
        if (url.startsWith("http")) return url;
        return `${API.defaults.baseURL}${url}`;
    };

    const imageSrc = computeImageSrc(item.imageUrl);

    const veg = item.isVeg === true || item.isVeg === 'true' || item.isVeg === 1 || item.isVeg === '1';

    return (
        <article className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">

            <div className="relative w-full h-56 sm:h-48 md:h-56 lg:h-48 overflow-hidden bg-gray-100">
                {imageSrc && !imgError ? (
                    <img
                        src={imageSrc}
                        alt={item.name}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-yellow-200 to-pink-200">
                        🍽
                    </div>
                )}

                {/* subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* veg/non-veg badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-white ${veg ? 'bg-green-600' : 'bg-red-600'} text-white text-xs`}>{veg ? 'V' : 'N'}</span>
                    <span className="hidden sm:inline text-white text-xs font-medium drop-shadow">{veg ? 'Veg' : 'Non-Veg'}</span>
                </div>

                {/* name in image */}
                <div className="absolute left-3 bottom-3 text-white">
                    <h3 className="text-sm sm:text-base font-semibold drop-shadow">{item.name}</h3>
                </div>
            </div>

            <div className="p-4 space-y-2">
                <p className="text-xs text-gray-500 line-clamp-2 h-12">{item.description || 'Delicious choice'}</p>

                <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg sm:text-xl font-extrabold text-gray-900">₹{item.price}</span>
                        <span className="text-xs text-gray-400">{item.tag || ''}</span>
                    </div>

                    {/* CTA */}
                    {qty === 0 ? (
                        <button
                            onClick={() => addItem(item)}
                            className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm shadow hover:from-red-600 hover:to-pink-600 transition"
                        >
                            Add
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                            <button
                                onClick={() => decreaseItem(item)}
                                className="w-8 h-8 flex items-center justify-center text-gray-700"
                            >
                                −
                            </button>
                            <span className="text-sm font-medium">{qty}</span>
                            <button
                                onClick={() => addItem(item)}
                                className="w-8 h-8 flex items-center justify-center text-gray-700"
                            >
                                +
                            </button>
                        </div>
                    )}
                </div>

                {admin && (
                    <div className="flex gap-2 mt-2">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(item)}
                                className="text-xs px-2 py-1 bg-yellow-400 rounded"
                            >
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(item)}
                                className="text-xs px-2 py-1 bg-red-400 rounded"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

MenuItemCard.propTypes = {
    item: PropTypes.object.isRequired,
    onEdit: PropTypes.func,
    onDelete: PropTypes.func,
};