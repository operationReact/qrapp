import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useCombo, useComboMutations } from "@/hooks/useCombos";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FieldSet,
  FieldGroup,
  FieldLegend,
  Field,
  FieldLabel,
  FieldContent,
  FieldDescription,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

import {
  ArrowLeftIcon,
  CurrencyInrIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";

const SEEDED_ITEMS = [
  {
    id: 1,
    name: "Veg Meals",
    price: 120,
    quantity: 1,
    type: "VEG",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d",
  },
];

export default function ComboForm({ comboId }) {
  const navigate = useNavigate();
  const isEdit = Boolean(comboId);

  const [comboName, setComboName] = useState("");
  const [comboPrice, setComboPrice] = useState(149);
  const [featured, setFeatured] = useState(true);
  const [preorder, setPreorder] = useState(false);
  const [items, setItems] = useState(SEEDED_ITEMS);

  const { data: comboData } = useCombo(comboId);
  const mutations = useComboMutations();

  useEffect(() => {
    (async () => {
      await Promise.resolve();
      if (!comboData) return;

      if (comboData.comboName != null) setComboName(comboData.comboName);
      if (comboData.comboPrice != null) setComboPrice(comboData.comboPrice);
      if (comboData.isFeatured != null) setFeatured(comboData.isFeatured);
      if (comboData.isPreorderEligible != null)
        setPreorder(comboData.isPreorderEligible);

      if (Array.isArray(comboData.itemNames) && comboData.itemNames.length) {
        setItems(
          comboData.itemNames.map((name, idx) => ({
            id: idx + 1,
            name,
            price:
              typeof comboData.originalPrice === "number"
                ? Math.round(
                    comboData.originalPrice / comboData.itemNames.length,
                  )
                : 0,
            quantity: 1,
            type: comboData.comboType ?? "VEG",
            image:
              comboData.thumbnailUrl ??
              comboData.imageUrl ??
              "https://images.unsplash.com/photo-1546833999-b9f581a1996d",
          })),
        );
      } else if (Array.isArray(comboData.items) && comboData.items.length) {
        setItems(
          comboData.items.map((it, idx) => ({
            id: it.menuItemId ?? idx + 1,
            name: it.name ?? `Item #${it.menuItemId ?? idx + 1}`,
            price: it.price ?? 0,
            quantity: it.quantity ?? 1,
            type: it.type ?? comboData.comboType ?? "VEG",
            image:
              it.image ??
              comboData.thumbnailUrl ??
              comboData.imageUrl ??
              "https://images.unsplash.com/photo-1546833999-b9f581a1996d",
          })),
        );
      }
    })();
  }, [comboData]);

  const totalPrice = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  const savings = totalPrice - comboPrice;

  const title = isEdit ? "Edit Combo" : "Create Combo";
  const subtitle = isEdit
    ? "Update the details of this combo offering"
    : "Build combo offerings";
  const saveLabel = isEdit ? "Save Changes" : "Save Combo";
  const isMutating = Boolean(mutations?.busy);

  const handleSave = async () => {
    if (!isEdit) return;
    try {
      await mutations.update(comboId, {
        comboName,
        comboPrice: Number(comboPrice),
        isFeatured: featured,
        isPreorderEligible: preorder,
      });
    } catch {
      /* noop — query mutation surfaces its own state */
    }
  };

  return (
    <div className="min-h-screen relative bg-background">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => navigate(".")}
            aria-label="Back"
          >
            <ArrowLeftIcon />
          </Button>

          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="px-4 pt-5 flex flex-col gap-5 pb-32">
        {/* ── Combo group ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">Combo</FieldLegend>
            <FieldDescription>
              Name and describe this combo offering.
            </FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="combo-name">Combo Name</FieldLabel>
                <Input
                  id="combo-name"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="Lunch Feast"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="combo-description">Description</FieldLabel>
                <Textarea
                  id="combo-description"
                  placeholder="Complete lunch combo with sides"
                  className="min-h-[100px] resize-none"
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>

        {/* ── Add Items group ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">Add Items</FieldLegend>
            <FieldDescription className="text-sm text-muted-foreground">
              Bundle products that make sense together.
            </FieldDescription>
            <FieldGroup>
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-background p-3 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="size-20 rounded-lg object-cover bg-muted"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground line-clamp-1">
                              {item.name}
                            </h3>

                            <Badge
                              variant="outline"
                              className="mt-1 rounded-full border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30"
                            >
                              {item.type}
                            </Badge>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600"
                            aria-label={`Remove ${item.name}`}
                          >
                            <TrashIcon size={16} />
                          </Button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1 bg-muted rounded-md px-1 py-1">
                            <Button
                              variant="outline"
                              size="icon-xs"
                              aria-label="Decrease quantity"
                            >
                              <MinusGlyph />
                            </Button>

                            <span className="w-5 text-center text-sm font-semibold text-foreground">
                              {item.quantity}
                            </span>

                            <Button
                              variant="outline"
                              size="icon-xs"
                              className="text-primary"
                              aria-label="Increase quantity"
                            >
                              <PlusGlyph />
                            </Button>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Price
                            </p>

                            <p className="text-lg font-semibold text-foreground">
                              ₹{item.price}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full h-12 border-dashed">
                  <PlusIcon size={18} data-icon="inline-start" />
                  Add More Items
                </Button>
              </div>
            </FieldGroup>
          </FieldSet>
        </div>

        {/* ── Pricing group ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">Pricing</FieldLegend>
            <FieldDescription>
              Set the bundle price and see the savings.
            </FieldDescription>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted border border-border p-4">
                  <p className="text-xs text-muted-foreground">Original</p>

                  <p className="text-2xl font-semibold mt-2 text-foreground">
                    ₹{totalPrice}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <p className="text-xs text-emerald-600">Savings</p>

                  <p className="text-2xl font-semibold mt-2 text-emerald-700 dark:text-emerald-400">
                    ₹{savings}
                  </p>
                </div>
              </div>

              <Field>
                <FieldLabel htmlFor="combo-price">Combo Price</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <CurrencyInrIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="combo-price"
                    type="number"
                    value={comboPrice}
                    onChange={(e) => setComboPrice(Number(e.target.value))}
                  />
                </InputGroup>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>

        {/* ── Availability group ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">Availability</FieldLegend>
            <FieldDescription>
              Decide where and when this combo is offered.
            </FieldDescription>
            <FieldGroup>
              <OptionRow
                title="Featured Combo"
                subtitle="Show on homepage"
                checked={featured}
                onChange={setFeatured}
              />
              <OptionRow
                title="Preorder Eligible"
                subtitle="Allow advance booking"
                checked={preorder}
                onChange={setPreorder}
              />
            </FieldGroup>
          </FieldSet>
        </div>
      </div>

      {/* FOOTER */}
      <div className="sticky bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur border-t border-border px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Combo Price</p>

            <p className="text-2xl font-semibold text-foreground">
              ₹{comboPrice}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-emerald-600">Savings</p>

            <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">
              ₹{savings}
            </p>
          </div>
        </div>

        <Button
          className="w-full h-12"
          onClick={handleSave}
          disabled={isMutating}
        >
          {isMutating ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}

function OptionRow({ title, subtitle, checked, onChange }) {
  const id = useId();

  return (
    <Field
      orientation="horizontal"
      className="items-center justify-between gap-3"
    >
      <FieldContent className="gap-0.5">
        <FieldLabel className="font-medium text-foreground" htmlFor={id}>
          {title}
        </FieldLabel>
        <FieldDescription className="text-muted-foreground">
          {subtitle}
        </FieldDescription>
      </FieldContent>
      <Switch checked={checked} onCheckedChange={onChange} name={id} id={id} />
    </Field>
  );
}

function MinusGlyph() {
  return (
    <span aria-hidden className="leading-none text-base">
      −
    </span>
  );
}

function PlusGlyph() {
  return (
    <span aria-hidden className="leading-none text-base">
      +
    </span>
  );
}
