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
  }, [searchQuery]);

  return (
    <InputGroup className="h-10 bg-card border-border focus-within:border-primary! focus-within:ring-1! focus-within:ring-primary!">
      <InputGroupAddon className="pl-3 pr-2">
        <Search className="size-5 text-gray-400" />
      </InputGroupAddon>

      <InputGroupInput
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search for items, cuisines..."
        autoFocus={autoFocus}
        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
      />

      {value && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setValue("")}
          className="h-8 w-8 hover:bg-gray-100"
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
