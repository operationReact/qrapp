import PropTypes from "prop-types";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon, TrashIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchAddonGroups,
  createAddonGroup,
  updateAddonGroup,
  deleteAddonGroup,
  fetchAttachedAddonGroupIds,
  attachAddonGroup,
  detachAddonGroup,
} from "@/services/addon-service";

const EMPTY_OPTION = { name: "", priceDelta: "0", active: true };
const EMPTY_GROUP = { name: "", minSelect: 0, maxSelect: 1, active: true, options: [{ ...EMPTY_OPTION }] };

function toForm(group) {
  return {
    id: group.id,
    name: group.name,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    active: group.active,
    options: group.options.length
      ? group.options.map((o) => ({ name: o.name, priceDelta: String(o.priceDelta), active: o.active }))
      : [{ ...EMPTY_OPTION }],
  };
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    minSelect: Number(form.minSelect),
    maxSelect: Number(form.maxSelect),
    active: form.active,
    options: form.options
      .filter((o) => o.name.trim())
      .map((o, i) => ({
        name: o.name.trim(),
        priceDelta: Number(o.priceDelta || 0),
        active: o.active,
        displayOrder: i,
      })),
  };
}

function validate(form) {
  if (!form.name.trim()) return "Group name is required";
  const min = Number(form.minSelect);
  const max = Number(form.maxSelect);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < 1 || min > max) {
    return "Min must be 0 or more, max at least 1, and min not above max";
  }
  if (!form.options.some((o) => o.name.trim())) return "Add at least one option";
  return null;
}

function GroupEditor({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);

  const setOption = (index, patch) =>
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) }));

  const submit = (e) => {
    e.preventDefault();
    const error = validate(form);
    if (error) return toast.error(error);
    onSave(toPayload(form));
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 space-y-1">
          <Label htmlFor="addon-name">Group name</Label>
          <Input id="addon-name" value={form.name} maxLength={120}
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Extra toppings" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="addon-min">Min select</Label>
          <Input id="addon-min" type="number" min={0} value={form.minSelect}
            onChange={(e) => setForm({ ...form, minSelect: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="addon-max">Max select</Label>
          <Input id="addon-max" type="number" min={1} value={form.maxSelect}
            onChange={(e) => setForm({ ...form, maxSelect: e.target.value })} />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="addon-active" checked={form.active}
            onCheckedChange={(v) => setForm({ ...form, active: v === true })} />
          <Label htmlFor="addon-active">Active</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Options</Label>
        {form.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input aria-label={`Option ${i + 1} name`} value={opt.name} maxLength={120}
              onChange={(e) => setOption(i, { name: e.target.value })} placeholder="Option name" />
            <Input aria-label={`Option ${i + 1} price`} type="number" min={0} step="0.01" className="w-24"
              value={opt.priceDelta} onChange={(e) => setOption(i, { priceDelta: e.target.value })} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove option ${i + 1}`}
              onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}>
              <XIcon className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm"
          onClick={() => setForm((f) => ({ ...f, options: [...f.options, { ...EMPTY_OPTION }] }))}>
          <PlusIcon className="size-4" /> Add option
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save group"}</Button>
      </div>
    </form>
  );
}

GroupEditor.propTypes = {
  initial: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

export default function AddonGroupsSection({ itemId }) {
  const qc = useQueryClient();
  const { activeLocationId } = useActiveLocation();
  const [editing, setEditing] = useState(null); // null | "new" | form object
  const [pendingId, setPendingId] = useState(null);

  const groupsKey = ["addon-groups", activeLocationId];
  const attachedKey = ["addon-attached", activeLocationId, itemId];

  const { data: groups = [], isLoading } = useQuery({
    queryKey: groupsKey,
    queryFn: () => fetchAddonGroups(activeLocationId),
    enabled: !!activeLocationId,
  });

  const { data: attachedIds = [] } = useQuery({
    queryKey: attachedKey,
    queryFn: () => fetchAttachedAddonGroupIds(activeLocationId, itemId),
    enabled: !!activeLocationId && !!itemId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: groupsKey });
    qc.invalidateQueries({ queryKey: attachedKey });
  };

  const saveMut = useMutation({
    mutationFn: ({ id, body }) =>
      id ? updateAddonGroup(activeLocationId, id, body) : createAddonGroup(activeLocationId, body),
    onSuccess: () => {
      toast.success("Add-on group saved");
      setEditing(null);
      refresh();
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to save add-on group"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAddonGroup(activeLocationId, id),
    onSuccess: () => {
      toast.success("Add-on group deleted");
      refresh();
    },
    onError: () => toast.error("Failed to delete add-on group"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ groupId, attach }) =>
      attach
        ? attachAddonGroup(activeLocationId, itemId, groupId)
        : detachAddonGroup(activeLocationId, itemId, groupId),
    onMutate: ({ groupId }) => setPendingId(groupId),
    onSuccess: refresh,
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to update add-ons for this item"),
    onSettled: () => setPendingId(null),
  });

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Add-ons</p>
          <p className="text-[11px] text-muted-foreground">
            Tick the groups this item offers. Groups are shared across items at this location.
          </p>
        </div>
        {editing === null && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing("new")}>
            <PlusIcon className="size-4" /> New group
          </Button>
        )}
      </div>

      {editing !== null && (
        <GroupEditor
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? { ...EMPTY_GROUP, options: [{ ...EMPTY_OPTION }] } : editing}
          saving={saveMut.isPending}
          onCancel={() => setEditing(null)}
          onSave={(body) => saveMut.mutate({ id: editing === "new" ? null : editing.id, body })}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading add-on groups…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No add-on groups yet. Create one to get started.</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => {
            const attached = attachedIds.includes(group.id);
            return (
              <li key={group.id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                <Checkbox
                  id={`addon-attach-${group.id}`}
                  checked={attached}
                  disabled={pendingId === group.id}
                  onCheckedChange={(v) => toggleMut.mutate({ groupId: group.id, attach: v === true })}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`addon-attach-${group.id}`} className="font-semibold">
                    {group.name}
                    {!group.active && <span className="ml-2 text-[11px] text-muted-foreground">(inactive)</span>}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Choose {group.minSelect}–{group.maxSelect} · {group.options.map((o) => o.name).join(", ") || "no options"}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${group.name}`}
                  onClick={() => setEditing(toForm(group))}>
                  <PencilSimpleIcon className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${group.name}`}
                  disabled={deleteMut.isPending}
                  onClick={() => window.confirm(`Delete "${group.name}" everywhere?`) && deleteMut.mutate(group.id)}>
                  <TrashIcon className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

AddonGroupsSection.propTypes = {
  itemId: PropTypes.number.isRequired,
};
