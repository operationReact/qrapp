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
        <article className="group overflow-hidden rounded-[1.5rem] bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">

            <div className="relative h-48 w-full overflow-hidden bg-gray-100 sm:h-52 lg:h-48">
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
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs text-white ring-1 ring-white ${veg ? 'bg-green-600' : 'bg-red-600'}`}>{veg ? 'V' : 'N'}</span>
                    <span className="hidden sm:inline text-white text-xs font-medium drop-shadow">{veg ? 'Veg' : 'Non-Veg'}</span>
                </div>

                {/* name in image */}
                <div className="absolute left-3 bottom-3 text-white">
                    <h3 className="line-clamp-2 text-sm font-semibold drop-shadow sm:text-base">{item.name}</h3>
                </div>
            </div>

            <div className="space-y-3 p-4">
                <p className="h-10 line-clamp-2 text-xs text-gray-500 sm:h-12">{item.description || 'Delicious choice'}</p>

                <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-lg font-extrabold text-gray-900 sm:text-xl">₹{item.price}</span>
                            {item.tag && <span className="text-xs font-medium text-amber-600">{item.tag}</span>}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">Tap to add instantly</div>
                    </div>

                    {/* CTA */}
                    {qty === 0 ? (
                        <button
                            onClick={() => addItem(item)}
                            className="touch-button rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-red-600 hover:to-pink-600"
                        >
                            Add
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-1">
                            <button
                                onClick={() => decreaseItem(item)}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-700"
                            >
                                −
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-medium">{qty}</span>
                            <button
                                onClick={() => addItem(item)}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-700"
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