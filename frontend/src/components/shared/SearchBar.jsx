import { Search, X, SlidersHorizontal } from "lucide-react";
import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { useDebounce } from "@/hooks/useDebounce";

export default function SearchBar({ onSearch = () => { }, autoFocus = false }) {
  const [value, setValue] = useState("");
  const inputRef = useRef();
  const searchQuery = useDebounce(value, 300);

  useEffect(() => {
    onSearch(searchQuery);
  }, [searchQuery, onSearch]);

  return (
    <InputGroup className="h-10 rounded-xl border-border bg-card focus-within:border-primary! focus-within:ring-1! focus-within:ring-primary! md:h-10 md:rounded-xl">
      <InputGroupAddon className="pl-2.5 pr-1.5">
        <Search className="size-4 text-gray-400" />
      </InputGroupAddon>

      <InputGroupInput
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search dishes, meals, snacks..."
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
    </InputGroup>
  );
}

SearchBar.propTypes = {
  onSearch: PropTypes.func,
};
