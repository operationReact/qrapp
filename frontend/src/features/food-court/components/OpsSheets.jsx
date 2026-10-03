import { useState } from "react";
import { Button } from "@/components/ui/button";

import * as api from "../api";
import { useFc } from "../context";
import { formatCurrency, titleCase } from "../format";
import { useFcMutation, useLandlords } from "../hooks";
import { PAYMENT_METHOD_OPTIONS } from "./CoreSheets";
import {
  ConfirmDialog,
  DateField,
  FormSheet,
  MoneyField,
  SelectField,
  TextAreaField,
  TextField,
  emptyToNull,
  useFormState,
} from "./kit";

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => ({ value, label: titleCase(value) }));
const ACTION_STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"].map((value) => ({
  value,
  label: titleCase(value),
}));
const FOOD_COURT_STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "CLOSED"].map((value) => ({ value, label: titleCase(value) }));

export function ActionFormSheet({ itemId }) {
  const fc = useFc();
  const existing = itemId ? fc.actions.data?.find((item) => item.id === itemId) : null;
  const { values, bind, set } = useFormState({
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    priority: existing?.priority ?? "MEDIUM",
    status: existing?.status ?? "OPEN",
    dueDate: existing?.dueDate ?? "",
    assignedTo: existing?.assignedTo ?? "",
  });
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useFcMutation(
    (payload) => (existing ? api.updateActionItem(fc.foodCourtId, itemId, payload) : api.createActionItem(fc.foodCourtId, payload)),
    { success: existing ? "Action updated" : "Action added", failure: "Unable to save this action" },
  );
  const remove = useFcMutation(() => api.deleteActionItem(fc.foodCourtId, itemId), {
    success: "Action deleted",
    failure: "Unable to delete this action",
  });

  const submit = () => {
    const next = {};
    if (!values.title.trim()) next.title = "Give the action a title";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        title: values.title.trim(),
        description: emptyToNull(values.description.trim()),
        priority: values.priority,
        status: values.status,
        dueDate: emptyToNull(values.dueDate),
        assignedTo: emptyToNull(values.assignedTo.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={existing ? "Edit action" : "Add action"}
      onSubmit={submit}
      saving={save.isPending}
      submitLabel={existing ? "Save changes" : "Add action"}
    >
      <TextField label="Title" required error={errors.title} {...bind("title")} />
      <TextAreaField label="Description" {...bind("description")} />
      <SelectField label="Priority" value={values.priority} onChange={set("priority")} options={PRIORITY_OPTIONS} />
      {existing && <SelectField label="Status" value={values.status} onChange={set("status")} options={ACTION_STATUS_OPTIONS} />}
      <DateField label="Due date" {...bind("dueDate")} />
      <TextField label="Assigned to" {...bind("assignedTo")} />
      {existing && (
        <>
          <Button type="button" variant="ghost" className="min-h-11 w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
            Delete action
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Delete this action?"
            description={existing.title}
            confirmLabel="Delete"
            destructive
            pending={remove.isPending}
            onConfirm={() => remove.mutate(undefined, { onSuccess: () => { setConfirmDelete(false); fc.close(); } })}
          />
        </>
      )}
    </FormSheet>
  );
}

export function FoodCourtFormSheet({ foodCourt: existing, onSaved }) {
  const fc = useFc();
  const { values, bind, set } = useFormState({
    code: existing?.code ?? "",
    name: existing?.name ?? "",
    addressLine: existing?.addressLine ?? "",
    city: existing?.city ?? "",
    state: existing?.state ?? "",
    postalCode: existing?.postalCode ?? "",
    contactPhone: existing?.contactPhone ?? "",
    totalStalls: existing?.totalStalls ?? "",
    status: existing?.status ?? "ACTIVE",
    notes: existing?.notes ?? "",
  });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const save = useFcMutation(
    (payload) => (existing ? api.updateFoodCourt(existing.id, payload) : api.createFoodCourt(payload)),
    { success: existing ? "Food court updated" : "Food court created", failure: "Unable to save this food court" },
  );

  const payload = () => ({
    code: values.code.trim(),
    name: values.name.trim(),
    addressLine: emptyToNull(values.addressLine.trim()),
    city: emptyToNull(values.city.trim()),
    state: emptyToNull(values.state.trim()),
    postalCode: emptyToNull(values.postalCode.trim()),
    contactPhone: emptyToNull(values.contactPhone.trim()),
    totalStalls: values.totalStalls === "" ? null : Number(values.totalStalls),
    status: values.status,
    notes: emptyToNull(values.notes.trim()),
  });

  const submit = (override) => {
    const next = {};
    if (!values.code.trim()) next.code = "Enter a short code";
    if (!values.name.trim()) next.name = "Enter the food court name";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      { ...payload(), ...override },
      {
        onSuccess: (saved) => {
          onSaved?.(saved);
          fc.close();
        },
      },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={existing ? "Edit food court" : "Add food court"}
      onSubmit={() => submit()}
      saving={save.isPending}
      submitLabel={existing ? "Save changes" : "Create"}
    >
      <TextField label="Name" required error={errors.name} {...bind("name")} />
      <TextField label="Code" required error={errors.code} {...bind("code")} />
      <TextField label="Address" {...bind("addressLine")} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="City" {...bind("city")} />
        <TextField label="State" {...bind("state")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="PIN code" inputMode="numeric" {...bind("postalCode")} />
        <TextField label="Contact phone" type="tel" {...bind("contactPhone")} />
      </div>
      <TextField label="Planned stalls" type="number" inputMode="numeric" min="0" {...bind("totalStalls")} />
      <SelectField label="Status" value={values.status} onChange={set("status")} options={FOOD_COURT_STATUS_OPTIONS} />
      <TextAreaField label="Notes" {...bind("notes")} />
      {existing && existing.status === "ACTIVE" && (
        <>
          <Button type="button" variant="ghost" className="min-h-11 w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirm(true)}>
            Deactivate food court
          </Button>
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title="Deactivate this food court?"
            description="It stays in the system with all its history but is marked inactive."
            confirmLabel="Deactivate"
            destructive
            pending={save.isPending}
            onConfirm={() => { setConfirm(false); submit({ status: "INACTIVE" }); }}
          />
        </>
      )}
    </FormSheet>
  );
}

export function LandlordFormSheet({ landlord: existing }) {
  const fc = useFc();
  const { values, bind } = useFormState({
    name: existing?.name ?? "",
    contactPhone: existing?.contactPhone ?? "",
    contactEmail: existing?.contactEmail ?? "",
    addressLine: existing?.addressLine ?? "",
    notes: existing?.notes ?? "",
  });
  const [errors, setErrors] = useState({});
  const save = useFcMutation(
    (payload) => (existing ? api.updateLandlord(fc.foodCourtId, existing.id, payload) : api.createLandlord(fc.foodCourtId, payload)),
    { success: "Landlord saved", failure: "Unable to save the landlord" },
  );

  const submit = () => {
    const next = {};
    if (!values.name.trim()) next.name = "Enter the landlord's name";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        name: values.name.trim(),
        contactPhone: emptyToNull(values.contactPhone.trim()),
        contactEmail: emptyToNull(values.contactEmail.trim()),
        addressLine: emptyToNull(values.addressLine.trim()),
        notes: emptyToNull(values.notes.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={existing ? "Edit landlord" : "Add landlord"}
      onSubmit={submit}
      saving={save.isPending}
    >
      <TextField label="Name" required error={errors.name} {...bind("name")} />
      <TextField label="Phone" type="tel" {...bind("contactPhone")} />
      <TextField label="Email" type="email" {...bind("contactEmail")} />
      <TextField label="Address" {...bind("addressLine")} />
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}

export function PropertyLeaseFormSheet({ lease: existing }) {
  const fc = useFc();
  const landlords = useLandlords(fc.foodCourtId);
  const { values, bind, set } = useFormState({
    landlordId: existing?.landlordId ?? "",
    startDate: existing?.startDate ?? "",
    endDate: existing?.endDate ?? "",
    monthlyRent: existing?.monthlyRent ?? "",
    depositAmount: existing?.depositAmount ?? "",
    rentDueDay: existing?.rentDueDay ?? "",
    paymentMethod: existing?.paymentMethod ?? "BANK_TRANSFER",
    notes: existing?.notes ?? "",
  });
  const [errors, setErrors] = useState({});
  const save = useFcMutation(
    (payload) =>
      existing ? api.updatePropertyLease(fc.foodCourtId, existing.id, payload) : api.createPropertyLease(fc.foodCourtId, payload),
    { success: "Property lease saved", failure: "Unable to save the property lease" },
  );
  const landlordOptions = (landlords.data || []).map((item) => ({ value: item.id, label: item.name }));

  const submit = () => {
    const next = {};
    if (!values.landlordId) next.landlordId = "Choose the landlord";
    if (!(Number(values.monthlyRent) > 0)) next.monthlyRent = "Enter the monthly lease amount";
    if (values.startDate && values.endDate && values.endDate < values.startDate) next.endDate = "End date must be after the start date";
    if (values.rentDueDay !== "" && (Number(values.rentDueDay) < 1 || Number(values.rentDueDay) > 28)) next.rentDueDay = "Use a day from 1 to 28";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        landlordId: values.landlordId,
        startDate: emptyToNull(values.startDate),
        endDate: emptyToNull(values.endDate),
        monthlyRent: Number(values.monthlyRent),
        depositAmount: values.depositAmount === "" ? null : Number(values.depositAmount),
        rentDueDay: values.rentDueDay === "" ? null : Number(values.rentDueDay),
        paymentMethod: emptyToNull(values.paymentMethod),
        notes: emptyToNull(values.notes.trim()),
      },
      { onSuccess: fc.close },
    );
  };

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && fc.close()}
      title={existing ? "Edit property lease" : "Add property lease"}
      description={existing ? `Currently ${formatCurrency(existing.monthlyRent)} / month` : undefined}
      onSubmit={submit}
      saving={save.isPending}
    >
      <SelectField label="Landlord" required error={errors.landlordId} value={values.landlordId} onChange={set("landlordId")} options={landlordOptions} placeholder={landlords.isLoading ? "Loading…" : "Choose landlord"} />
      {!landlordOptions.length && !landlords.isLoading && (
        <Button type="button" variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => fc.open("landlord-form")}>
          + Add landlord first
        </Button>
      )}
      <MoneyField label="Monthly lease (₹)" required error={errors.monthlyRent} {...bind("monthlyRent")} />
      <MoneyField label="Security deposit paid (₹)" {...bind("depositAmount")} />
      <div className="grid grid-cols-2 gap-3">
        <DateField label="Start date" {...bind("startDate")} />
        <DateField label="End date" error={errors.endDate} {...bind("endDate")} />
      </div>
      <TextField label="Rent due day (1–28)" type="number" inputMode="numeric" min="1" max="28" error={errors.rentDueDay} {...bind("rentDueDay")} />
      <SelectField label="Payment method" value={values.paymentMethod} onChange={set("paymentMethod")} options={PAYMENT_METHOD_OPTIONS} />
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}


