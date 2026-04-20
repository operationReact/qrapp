import { Search } from "@boxicons/react";
import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";

export default function SearchBar({ onSearch = () => {} }) {
  const [value, setValue] = useState("");
  const inputRef = useRef();

  useEffect(() => {
    const t = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(t);
  }, [value, onSearch]);

  return (
    <div className="relative w-full flex items-center rounded-xl border border-red-500 bg-white px-3 h-14">
      <label className="pr-2">
        <Search className="size-7 fill-red-500" />
      </label>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search dishes..."
        className="w-full pr-12 text-sm font-medium! outline-none transition"
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
