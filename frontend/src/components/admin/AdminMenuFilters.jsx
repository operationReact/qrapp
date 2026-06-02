import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import {
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";

export default function AdminMenuFilters({
  open,
  onOpenChange,
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedTags,
  onTagsChange,
  filters,
  onFiltersChange,
  allCategories,
  allTags,
  onClearAll,
}) {
  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Filter the menu items by category and tags.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 pt-1 overflow-y-auto px-4 pb-4">
          <AdminMenuFiltersContent
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            selectedCategories={selectedCategories}
            onCategoriesChange={onCategoriesChange}
            selectedTags={selectedTags}
            onTagsChange={onTagsChange}
            filters={filters}
            onFiltersChange={onFiltersChange}
            allCategories={allCategories}
            allTags={allTags}
            onClearAll={onClearAll}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AdminMenuFiltersContent({
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedTags,
  onTagsChange,
  filters,
  onFiltersChange,
  allCategories,
  allTags,
  onClearAll,
}) {
  const categoryAnchor = useComboboxAnchor();
  const tagAnchor = useComboboxAnchor();

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium sr-only">Search</Label>
        <InputGroup className="h-10">
          <InputGroupInput
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title or description..."
          />
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="space-y-4 mt-2 border-y py-4">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="filter-recommended"
            className="text-sm cursor-pointer"
          >
            Recommended
          </Label>
          <Switch
            id="filter-recommended"
            checked={filters.showRecommended}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, showRecommended: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="filter-veg" className="text-sm cursor-pointer">
            Veg Only
          </Label>
          <Switch
            id="filter-veg"
            checked={filters.isVeg === true}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, isVeg: checked ? true : null })
            }
          />
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <Label className="text-sm font-medium">Categories</Label>

        <Combobox
          items={allCategories}
          onValueChange={onCategoriesChange}
          value={selectedCategories}
          multiple
        >
          <div ref={categoryAnchor}>
            <ComboboxInput placeholder="Select categories" />
          </div>

          <ComboboxContent anchor={categoryAnchor}>
            <ComboboxEmpty>No categories found</ComboboxEmpty>
            <ComboboxList>
              {allCategories
                .filter((cat) => !selectedCategories.includes(cat))
                .map((cat) => (
                  <ComboboxItem key={cat} value={cat}>
                    {cat}
                  </ComboboxItem>
                ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedCategories.map((cat) => (
              <Badge key={cat} variant="secondary" className="gap-1 pr-1">
                {cat}
                <button
                  onClick={() =>
                    onCategoriesChange(
                      selectedCategories.filter((c) => c !== cat),
                    )
                  }
                >
                  <XIcon data-icon="inline-end" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 mt-4">
        <Label className="text-sm font-medium">Tags</Label>
        <Combobox
          value={selectedTags}
          items={allTags}
          onValueChange={onTagsChange}
          multiple
        >
          <div ref={tagAnchor}>
            <ComboboxInput className="h-10" placeholder="Select tags..." />
          </div>
          <ComboboxContent anchor={tagAnchor}>
            <ComboboxList>
              <ComboboxEmpty>No tags found</ComboboxEmpty>

              {allTags
                .filter((tag) => !selectedTags.includes(tag))
                .map((tag) => (
                  <ComboboxItem key={tag} value={tag}>
                    {tag}
                  </ComboboxItem>
                ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  onClick={() =>
                    onTagsChange(selectedTags.filter((t) => t !== tag))
                  }
                >
                  <XIcon data-icon="inline-end" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={onClearAll}
        >
          <ArrowClockwiseIcon />
          Clear All
        </Button>
      </div>
    </>
  );
}
