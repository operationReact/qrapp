import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCombo, useComboMutations } from "@/hooks/useCombos";
import { menuOptions, categoriesOptions } from "@/query/options/menu";
import { signatureProductListOptions } from "@/query/options/combos";
import { extractApiError } from "@/lib/apiError";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  MinusIcon,
  ClockIcon,
  CalendarBlankIcon,
  PackageIcon,
} from "@phosphor-icons/react";
import { ButtonGroup } from "@/components/ui/button-group";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";

const TIME_SLOTS = ["BREAKFAST", "LUNCH", "EVENING", "FULL_DAY", "CUSTOM"];
const COMBO_TYPES = ["VEG", "NON_VEG", "MIXED"];
const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

const BLANK_SCHEDULE = {
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "12:00",
  isActive: true,
};

const BLANK_FORM = {
  comboName: "",
  shortName: "",
  description: "",
  categoryId: "",
  comboType: "VEG",
  comboPrice: "",
  imageUrl: "",
  timeSlot: "LUNCH",
  isFeatured: false,
  isPreorderEligible: false,
  isSignatureCombo: false,
  displayPriority: 0,
  items: [],
  schedules: [],
  signatureProducts: [],
};

function buildPayload(form) {
  return {
    comboName: form.comboName.trim(),
    shortName: form.shortName.trim(),
    description: form.description.trim() || null,
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    comboType: form.comboType,
    comboPrice: Number(form.comboPrice),
    imageUrl: form.imageUrl.trim() || null,
    timeSlot: form.timeSlot,
    isFeatured: form.isFeatured,
    isPreorderEligible: form.isPreorderEligible,
    isSignatureCombo: form.isSignatureCombo,
    displayPriority: Number(form.displayPriority) || 0,
    items: form.items.map((it, idx) => ({
      menuItemId: Number(it.menuItemId),
      quantity: Number(it.quantity) || 1,
      sortOrder: Number(it.sortOrder ?? idx),
    })),
    schedules: form.schedules.map((s) => ({
      dayOfWeek: Number(s.dayOfWeek),
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: !!s.isActive,
    })),
    signatureProducts: form.signatureProducts.map((sp) => ({
      signatureProductId: Number(sp.signatureProductId),
      quantity: Number(sp.quantity) || 1,
    })),
  };
}

export default function ComboForm({ comboId }) {
  const navigate = useNavigate();
  const isEdit = Boolean(comboId);

  const [form, setForm] = useState(BLANK_FORM);
  const [addingItemId, setAddingItemId] = useState("");
  const [addingSigId, setAddingSigId] = useState("");

  const { data: comboData, isLoading: comboLoading } = useCombo(comboId);
  const mutations = useComboMutations(() => {
    toast.success(isEdit ? "Combo updated" : "Combo created");
    navigate({ to: "/admin/combos" });
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    ...menuOptions({ all: true }),
    enabled: true,
  });
  const { data: categories } = useQuery(categoriesOptions);
  const { data: sigProductsData, isLoading: sigLoading } = useQuery(
    signatureProductListOptions({
      isComboAttachable: true,
      isActive: true,
      size: 100,
    }),
  );

  const menuItemList = useMemo(() => menuItems || [], [menuItems]);
  const categoriesList = useMemo(() => categories || [], [categories]);
  const sigProductList = useMemo(
    () => sigProductsData?.content ?? sigProductsData ?? [],
    [sigProductsData],
  );

  const lastSyncedIdRef = useRef(null);
  useEffect(() => {
    if (!comboData) return;
    if (lastSyncedIdRef.current === comboData.id) return;
    lastSyncedIdRef.current = comboData.id;
    setForm({
      comboName: comboData.comboName ?? "",
      shortName: comboData.shortName ?? "",
      description: comboData.description ?? "",
      categoryId: comboData.categoryId ? String(comboData.categoryId) : "",
      comboType: comboData.comboType ?? "VEG",
      comboPrice:
        comboData.comboPrice != null ? String(comboData.comboPrice) : "",
      imageUrl: comboData.imageUrl ?? "",
      timeSlot: comboData.timeSlot ?? "LUNCH",
      isFeatured: !!comboData.isFeatured,
      isPreorderEligible: !!comboData.isPreorderEligible,
      isSignatureCombo: !!comboData.isSignatureCombo,
      displayPriority: comboData.displayPriority ?? 0,
      items: (comboData.items ?? []).map((it, idx) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity ?? 1,
        sortOrder: it.sortOrder ?? idx,
      })),
      schedules: (comboData.schedules ?? []).map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime:
          typeof s.startTime === "string"
            ? s.startTime.slice(0, 5)
            : s.startTime,
        endTime:
          typeof s.endTime === "string" ? s.endTime.slice(0, 5) : s.endTime,
        isActive: !!s.isActive,
      })),
      signatureProducts: (comboData.signatureProducts ?? []).map((sp) => ({
        signatureProductId: sp.signatureProductId,
        quantity: sp.quantity ?? 1,
      })),
    });
  }, [comboData]);

  const totalPrice = useMemo(() => {
    return form.items.reduce((acc, it) => {
      const mi = menuItemList.find((m) => m.id === Number(it.menuItemId));
      const price = mi?.price ?? mi?.sellingPrice ?? 0;
      return acc + Number(price) * (Number(it.quantity) || 1);
    }, 0);
  }, [form.items, menuItemList]);

  const comboPriceNum = Number(form.comboPrice) || 0;
  const savings = totalPrice - comboPriceNum;
  const priceInvalid =
    form.items.length >= 2 && comboPriceNum >= totalPrice && totalPrice > 0;

  const title = isEdit ? "Edit Combo" : "Create Combo";
  const subtitle = isEdit
    ? "Update the details of this combo offering"
    : "Build a new combo offering";
  const saveLabel = isEdit ? "Save Changes" : "Create Combo";
  const isMutating = Boolean(mutations?.busy);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const addItem = () => {
    if (!addingItemId) return;
    const id = Number(addingItemId);
    if (form.items.some((i) => Number(i.menuItemId) === id)) return;
    set("items", [
      ...form.items,
      { menuItemId: id, quantity: 1, sortOrder: form.items.length },
    ]);
    setAddingItemId("");
  };

  const updateItemQty = (idx, delta) => {
    set(
      "items",
      form.items.map((it, i) => {
        if (i !== idx) return it;
        const q = Math.max(1, Number(it.quantity) + delta);
        return { ...it, quantity: q };
      }),
    );
  };

  const removeItem = (idx) =>
    set(
      "items",
      form.items.filter((_, i) => i !== idx),
    );

  const addSig = () => {
    if (!addingSigId) return;
    const id = Number(addingSigId);
    if (form.signatureProducts.some((s) => Number(s.signatureProductId) === id))
      return;
    set("signatureProducts", [
      ...form.signatureProducts,
      { signatureProductId: id, quantity: 1 },
    ]);
    setAddingSigId("");
  };

  const updateSigQty = (idx, delta) => {
    set(
      "signatureProducts",
      form.signatureProducts.map((it, i) => {
        if (i !== idx) return it;
        const q = Math.max(1, Number(it.quantity) + delta);
        return { ...it, quantity: q };
      }),
    );
  };

  const removeSig = (idx) =>
    set(
      "signatureProducts",
      form.signatureProducts.filter((_, i) => i !== idx),
    );

  const addSchedule = () =>
    set("schedules", [...form.schedules, { ...BLANK_SCHEDULE }]);

  const updateSchedule = (idx, patch) =>
    set(
      "schedules",
      form.schedules.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );

  const removeSchedule = (idx) =>
    set(
      "schedules",
      form.schedules.filter((_, i) => i !== idx),
    );

  const validate = () => {
    if (!form.comboName.trim()) return "Combo name is required";
    if (!form.shortName.trim()) return "Short name is required";
    if (!form.comboPrice || Number(form.comboPrice) <= 0)
      return "Combo price must be greater than 0";
    if (form.items.length < 2) return "A combo needs at least 2 items";
    const dupes = form.items
      .map((i) => i.menuItemId)
      .filter((id, idx, arr) => arr.indexOf(id) !== idx);
    if (dupes.length > 0) return "Duplicate menu items are not allowed";
    for (const s of form.schedules) {
      if (!s.startTime || !s.endTime) return "Schedule times are required";
      if (s.startTime >= s.endTime)
        return "Schedule end time must be after start time";
    }
    if (totalPrice > 0 && comboPriceNum >= totalPrice) {
      return "Combo price must be less than the original price";
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    const payload = buildPayload(form);
    try {
      if (isEdit) {
        await mutations.update(comboId, payload);
      } else {
        await mutations.create(payload);
      }
    } catch (e) {
      toast.error(extractApiError(e, "Failed to save combo"));
    }
  };

  const getDayLabel = (dayValue) => {
    return DAYS.find((day) => day.value === dayValue)?.label;
  };

  const availableMenuItems = menuItemList.filter(
    (m) => !form.items.some((it) => Number(it.menuItemId) === Number(m.id)),
  );
  const availableSigItems = sigProductList.filter(
    (p) =>
      !form.signatureProducts.some(
        (s) => Number(s.signatureProductId) === Number(p.id),
      ),
  );

  if (isEdit && comboLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading combo…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-background">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => navigate({ to: "/admin/combos" })}
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

      <div className="px-4 pt-5 flex flex-col gap-5 pb-5">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">Basic Info</FieldLegend>
            <FieldDescription>
              Name, describe, and categorise this combo.
            </FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="combo-name">Combo Name *</FieldLabel>
                <Input
                  id="combo-name"
                  value={form.comboName}
                  onChange={(e) => set("comboName", e.target.value)}
                  placeholder="Lunch Feast"
                  maxLength={150}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="short-name">Short Name *</FieldLabel>
                <Input
                  id="short-name"
                  value={form.shortName}
                  onChange={(e) => set("shortName", e.target.value)}
                  placeholder="LunchFeast"
                  maxLength={60}
                />
                <FieldDescription>
                  Used in compact displays. Max 60 chars.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Complete lunch combo with sides"
                  className="min-h-[80px] resize-none"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="image-url">Image URL</FieldLabel>
                <Input
                  id="image-url"
                  value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <Select
                    value={form.categoryId || "none"}
                    onValueChange={(v) =>
                      set("categoryId", v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      {categoriesList.find(
                        (c) => String(c.id) === form.categoryId,
                      )?.name || "Select category"}
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="none">— None —</SelectItem>
                      {categoriesList.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Time Slot *</FieldLabel>
                  <Select
                    value={form.timeSlot}
                    onValueChange={(v) => set("timeSlot", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Combo Type *</FieldLabel>
                  <Select
                    value={form.comboType}
                    onValueChange={(v) => set("comboType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMBO_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="display-priority">
                    Display Priority
                  </FieldLabel>
                  <Input
                    id="display-priority"
                    type="number"
                    min="0"
                    value={form.displayPriority}
                    onChange={(e) => set("displayPriority", e.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </FieldSet>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">
              Items{" "}
              <span className="text-muted-foreground font-normal text-sm">
                (min 2)
              </span>
            </FieldLegend>
            <FieldDescription>
              Bundle products that make sense together.
            </FieldDescription>
            <FieldGroup>
              {form.items.length === 0 && (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyDescription>No items added yet</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              <div className="flex flex-col gap-3">
                {form.items.map((item, idx) => {
                  const mi = menuItemList.find(
                    (m) => Number(m.id) === Number(item.menuItemId),
                  );
                  return (
                    <div
                      key={`${item.menuItemId}-${idx}`}
                      className="rounded-lg border border-border bg-background p-2"
                    >
                      <div className="flex gap-3">
                        {mi?.image ? (
                          <img
                            src={mi.image}
                            alt={mi.name}
                            className="size-10 rounded-sm object-cover bg-muted shrink-0"
                          />
                        ) : (
                          <div className="size-10 rounded-sm bg-muted shrink-0 flex items-center justify-center">
                            <PackageIcon
                              size={20}
                              className="text-muted-foreground"
                            />
                          </div>
                        )}
                        <div className="flex-1 flex justify-between min-w-0">
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-foreground line-clamp-1 text-sm">
                                {mi?.name ?? `Item #${item.menuItemId}`}
                              </h3>
                              {mi?.price != null && (
                                <p className="text-sm text-muted-foreground">
                                  ₹{mi.price} each
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <ButtonGroup>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => updateItemQty(idx, -1)}
                                aria-label="Decrease quantity"
                              >
                                <MinusIcon size={12} weight="bold" />
                              </Button>
                              <span className="border-y w-5 grid place-items-center text-center font-medium text-foreground">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => updateItemQty(idx, 1)}
                                aria-label="Increase quantity"
                              >
                                <PlusIcon size={12} weight="bold" />
                              </Button>
                            </ButtonGroup>

                            <Button
                              variant="destructive"
                              size="icon-sm"
                              onClick={() => removeItem(idx)}
                              aria-label="Remove item"
                            >
                              <TrashIcon />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Select
                  value={addingItemId}
                  onValueChange={setAddingItemId}
                  disabled={menuLoading}
                  alignItemWithTrigger={false}
                >
                  <SelectTrigger className="flex-1">
                    {menuLoading
                      ? "Loading items"
                      : availableMenuItems.find(
                          (item) => String(item.id) === addingItemId,
                        )?.name || "Select menu item to add"}
                  </SelectTrigger>
                  <SelectContent>
                    {availableMenuItems.length === 0 && (
                      <SelectItem value="__empty" disabled>
                        No more items to add
                      </SelectItem>
                    )}
                    {availableMenuItems.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                        {m.price != null ? ` — ₹${m.price}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="branded-secondary"
                  onClick={addItem}
                  disabled={!addingItemId}
                  aria-label="Add item"
                >
                  <PlusIcon />
                </Button>
              </div>
            </FieldGroup>
          </FieldSet>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">Pricing</FieldLegend>
            <FieldDescription>
              Set the bundle price and see the savings.
            </FieldDescription>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted border border-border py-2 px-4">
                  <p className="text-xs text-secondary-foreground/70 font-medium">
                    Original Price
                  </p>
                  <p className="text-xl font-semibold mt-1 text-foreground">
                    ₹{totalPrice.toFixed(0)}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 px-4">
                  <p className="text-xs text-emerald-600 font-medium">
                    Savings
                  </p>
                  <p className="text-xl font-semibold mt-1 text-emerald-700 dark:text-emerald-400">
                    ₹{savings > 0 ? savings.toFixed(0) : 0}
                  </p>
                </div>
              </div>
              <Field data-invalid={priceInvalid}>
                <FieldLabel htmlFor="combo-price">Combo Price (₹) *</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <CurrencyInrIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="combo-price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.comboPrice}
                    onChange={(e) => set("comboPrice", e.target.value)}
                    aria-invalid={priceInvalid}
                  />
                </InputGroup>
                {priceInvalid && (
                  <FieldDescription className="text-destructive">
                    Must be less than original price ₹{totalPrice.toFixed(0)}
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
          </FieldSet>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">Availability</FieldLegend>
            <FieldDescription>
              Decide where and when this combo is offered.
            </FieldDescription>
            <FieldGroup>
              <OptionRow
                title="Featured Combo"
                subtitle="Show on homepage spotlight"
                checked={form.isFeatured}
                onChange={(v) => set("isFeatured", v)}
              />
              <OptionRow
                title="Preorder Eligible"
                subtitle="Allow advance booking"
                checked={form.isPreorderEligible}
                onChange={(v) => set("isPreorderEligible", v)}
              />
              <OptionRow
                title="Signature Combo"
                subtitle="Mark as a signature offering"
                checked={form.isSignatureCombo}
                onChange={(v) => set("isSignatureCombo", v)}
              />
            </FieldGroup>
          </FieldSet>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">
              <ClockIcon className="inline mr-1" size={16} weight="bold" />
              Schedule{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </FieldLegend>
            <FieldDescription>
              Limit when this combo is available by day & time.
            </FieldDescription>
            <FieldGroup>
              {form.schedules.length === 0 && (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyDescription>
                      No schedule, combo will be always available
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              <div className="flex flex-col gap-3">
                {form.schedules.map((s, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={String(s.dayOfWeek)}
                          onValueChange={(v) =>
                            updateSchedule(idx, { dayOfWeek: Number(v) })
                          }
                        >
                          <SelectTrigger size="sm" className="w-24">
                            <CalendarBlankIcon className="text-muted-foreground" />{" "}
                            {getDayLabel(form["schedules"][idx]?.dayOfWeek)}
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map((d) => (
                              <SelectItem key={d.value} value={String(d.value)}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 border rounded-md p-2 bg-muted">
                          <Label htmlFor={`schedule-active-${idx}`}>
                            Availability:
                          </Label>
                          <Switch
                            checked={s.isActive}
                            onCheckedChange={(v) =>
                              updateSchedule(idx, { isActive: v })
                            }
                            id={`schedule-active-${idx}`}
                            name={`schedule-active-${idx}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => removeSchedule(idx)}
                          aria-label="Remove schedule"
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={s.startTime}
                        onChange={(e) =>
                          updateSchedule(idx, { startTime: e.target.value })
                        }
                        className="flex-1 text-sm sm:text-base"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={s.endTime}
                        onChange={(e) =>
                          updateSchedule(idx, { endTime: e.target.value })
                        }
                        className="flex-1 text-sm sm:text-base"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={addSchedule}
              >
                <PlusIcon size={16} data-icon="inline-start" />
                Add Schedule
              </Button>
            </FieldGroup>
          </FieldSet>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <FieldSet>
            <FieldLegend className="font-semibold">
              Signature Products{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </FieldLegend>
            <FieldDescription>
              Attach combo-attachable signature products (bottles, sides, etc.)
            </FieldDescription>
            <FieldGroup>
              {form.signatureProducts.length === 0 && (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyDescription>
                      No signature products attached
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              <div className="flex flex-col gap-3">
                {form.signatureProducts.map((sp, idx) => {
                  const p = sigProductList.find(
                    (x) => Number(x.id) === Number(sp.signatureProductId),
                  );
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-background p-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground line-clamp-1 text-sm">
                          {p?.productName ??
                            p?.name ??
                            `Product #${sp.signatureProductId}`}
                        </p>
                        {p?.sellingPrice != null && (
                          <p className="text-xs text-muted-foreground">
                            ₹{p.sellingPrice}
                          </p>
                        )}
                      </div>
                      <ButtonGroup>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => updateSigQty(idx, -1)}
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon />
                        </Button>
                        <span className="border-y w-5 grid place-items-center text-center font-medium text-foreground">
                          {sp.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          className="text-primary"
                          onClick={() => updateSigQty(idx, 1)}
                          aria-label="Increase quantity"
                        >
                          <PlusIcon size={12} weight="bold" />
                        </Button>
                      </ButtonGroup>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => removeSig(idx)}
                        aria-label="Remove"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Select
                  value={addingSigId}
                  onValueChange={setAddingSigId}
                  disabled={sigLoading}
                  alignItemWithTrigger={false}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue
                      placeholder={
                        sigLoading ? "Loading…" : "Select signature product"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSigItems.length === 0 && (
                      <SelectItem value="__empty" disabled>
                        No products available
                      </SelectItem>
                    )}
                    {availableSigItems.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.productName ?? p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addSig}
                  disabled={!addingSigId}
                  className="shrink-0"
                  aria-label="Add signature product"
                >
                  <PlusIcon size={16} />
                </Button>
              </div>
            </FieldGroup>
          </FieldSet>
        </section>
      </div>

      <div className="sticky bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur border-t border-border px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Combo Price</p>
            <p className="text-2xl font-semibold text-foreground">
              ₹{comboPriceNum || 0}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-600">Savings</p>
            <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">
              ₹{savings > 0 ? savings.toFixed(0) : 0}
            </p>
          </div>
        </div>
        <Button
          className="w-full h-12"
          onClick={handleSave}
          disabled={isMutating || form.items.length < 2}
        >
          {isMutating ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}

function OptionRow({ title, subtitle, checked, onChange }) {
  return (
    <Field
      orientation="horizontal"
      className="items-center justify-between gap-3"
    >
      <FieldContent className="gap-0.5">
        <FieldLabel className="font-medium text-foreground">{title}</FieldLabel>
        <FieldDescription className="text-muted-foreground">
          {subtitle}
        </FieldDescription>
      </FieldContent>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}
