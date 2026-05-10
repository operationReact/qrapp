import { Search, X } from "@boxicons/react";
import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { useDebounce } from "@/hooks/useDebounce";

export default function SearchBar({ onSearch = () => { }, autoFocus = false }) {
  const [value, setValue] = useState("");
  const inputRef = useRef();
  const searchQuery = useDebounce(value, 300);

  const placeholders = [
    "oats, chicken or momos",
    "bestsellers",
    "pizzas, pastas, south specials",
    "combo meal"
  ];

  const [placeholder, setPlaceholder] = useState(placeholders[0]);

 /* UPDATE PLACEHOLDER OF SEARCH FIELD EVERY 3 SECOND*/ 
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder((placeholder) => {
        const current = placeholders.findIndex((p) => p === placeholder);

        return current < placeholders.length - 1
          ? placeholders[current + 1]
          : placeholders[0];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    onSearch(searchQuery);
  }, [searchQuery]);

  return (
    <InputGroup className="h-12 border-1 sm:h-14 bg-primary/5 focus-within:bg-white border-primary-foreground focus:border-primary focus:ring-1 focus:ring-primary focus-within:border-primary! focus-within:ring-1! focus-within:ring-primary!">
      <InputGroupInput
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Search "${placeholder}"`}
        className="w-full text-sm! font-medium! pr-12 border-0 focus-visible:ring-0"
        autoFocus={autoFocus}
      />

      <InputGroupAddon>
        <Search className="size-7 fill-primary" />
      </InputGroupAddon>

      {value && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setValue("")}
          className="absolute right-1 h-8 w-8 hover:bg-gray-100"
        >
          <X className="size-4" />
        </Button>
      )}
    </InputGroup>
  );
}

SearchBar.propTypes = {
  onSearch: PropTypes.func,
};
