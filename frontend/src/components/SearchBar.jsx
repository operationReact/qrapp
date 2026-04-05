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
                className="w-full px-5 py-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-red-500 outline-none"
            />

            {value && (
                <button
                    onClick={() => setValue("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
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
