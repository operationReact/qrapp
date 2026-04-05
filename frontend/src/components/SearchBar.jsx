import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from "react";

export default function SearchBar({ onSearch = () => {} }) {
    const [value, setValue] = useState("");
    const inputRef = useRef();

    useEffect(() => {
        const t = setTimeout(() => onSearch(value), 300);
        return () => clearTimeout(t);
    }, [value, onSearch]);

    return (
        <div className="relative">
            <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search dishes..."
                className="w-full rounded-[1.25rem] border border-gray-200 bg-white px-4 py-3.5 pr-12 text-sm shadow-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200 sm:px-5"
            />

            {value && (
                <button
                    onClick={() => setValue("")}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

SearchBar.propTypes = {
    onSearch: PropTypes.func,
};
