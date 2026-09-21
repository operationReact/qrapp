import { Search, X, SlidersHorizontal } from "lucide-react";
import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { useDebounce } from "@/hooks/useDebounce";

export default function SearchBar({ onSearch = () => { }, onFilterClick, autoFocus = false, home = false }) {
  const [value, setValue] = useState("");
  const inputRef = useRef();
  const searchQuery = useDebounce(value, 300);

  useEffect(() => {
    onSearch(searchQuery);
  }, [searchQuery, onSearch]);

  return (
    <InputGroup className={`${home ? "h-11 rounded-2xl shadow-[0_2px_10px_rgba(42,35,30,0.04)] md:h-11 md:rounded-xl md:shadow-none" : "h-10 rounded-xl md:h-10"} min-w-0 border-border/80 bg-card focus-within:border-primary! focus-within:ring-1! focus-within:ring-primary!`}>
      <InputGroupAddon className="pl-2.5 pr-1.5">
        <Search className="size-[18px] text-muted-foreground" />
      </InputGroupAddon>

      <InputGroupInput
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search for dishes, meals, cuisines..."
        autoFocus={autoFocus}
        enterKeyHint="search"
        autoCapitalize="none"
        autoCorrect="off"
        className="border-0 bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
      />

      {value && (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => setValue("")}
          className="mr-1 rounded-full hover:bg-gray-100"
        >
          <X className="size-4 text-gray-500" />
        </Button>
      )}
      <button
        type="button"
        aria-label="Open menu filters"
        onClick={onFilterClick}
        className="touch-manipulation mr-2 grid size-7 shrink-0 place-items-center rounded-full border border-border/70 text-muted-foreground/90 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <SlidersHorizontal className="size-[15px]" />
      </button>
    </InputGroup>
  );
}

SearchBar.propTypes = {
  onSearch: PropTypes.func,
  onFilterClick: PropTypes.func,
  home: PropTypes.bool,
};
