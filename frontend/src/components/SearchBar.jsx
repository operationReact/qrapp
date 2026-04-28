import { Search, X } from "@boxicons/react";
import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";

export default function SearchBar({ onSearch = () => {} }) {
  const [value, setValue] = useState("");
  const inputRef = useRef();

  useEffect(() => {
    const t = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(t);
  }, [value, onSearch]);

  return (
    <InputGroup className="h-14 border-primary ring-1 ring-primary focus-within:border-primary! focus-within:ring-1! focus-within:ring-primary!">
      <InputGroupInput
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search dishes..."
        className="w-full pr-12 border-0 focus-visible:ring-0"
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
