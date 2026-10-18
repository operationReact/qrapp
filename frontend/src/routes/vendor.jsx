import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, MessageSquare, Plus, Save, Send, Trash2, AlertTriangle, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { RoleGuard } from "@/components/RoleGuard";
import { ROLE } from "@/lib/roles";
import {
  addVendorBillComment, createVendorBill, listVendorBills, updateVendorBill, vendorErrorMessage,
} from "@/services/vendor-bill-service";
import {
  EDITABLE_VENDOR_BILL_STATUSES, VENDOR_BILL_EVENT_LABELS, VENDOR_BILL_STATUS, formatDateTime, formatInr,
  latestCorrectionMessage, lineTotal,
} from "@/lib/vendorBills";

export const Route = createFileRoute("/vendor")({
  component: () => <RoleGuard roles={[ROLE.VENDOR]}><VendorPortal /></RoleGuard>,
});

const newKey = () => Math.random().toString(36).slice(2);
const newItem = () => ({ key: newKey(), description: "", quantity: "1", unit: "pcs", unitPrice: "" });

function VendorPortal() {
  const queryClient = useQueryClient();
  const { activeLocation, activeLocationId } = useActiveLocation();
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const billsQuery = useQuery({
    queryKey: ["vendor-bills", activeLocationId],
    queryFn: () => listVendorBills(activeLocationId),
    enabled: Boolean(activeLocationId),
  });
  const bills = billsQuery.data || [];
  const selected = bills.find((bill) => bill.id === selectedId) || null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vendor-bills", activeLocationId] });

  const commentMutation = useMutation({
    mutationFn: (message) => addVendorBillComment(activeLocationId, selected.id, message),
    onSuccess: () => { refresh(); toast.success("Comment sent"); },
    onError: (error) => toast.error(vendorErrorMessage(error)),
  });

  function handleSaved(saved) {
    refresh();
    setCreating(false);
    setSelectedId(saved.id);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1200px] space-y-6 bg-[#F8F7F4] p-4 pb-12 text-[#1F1A17] md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8A7F74]">Vendor portal</p>
          <h1 className="text-2xl font-bold">Your bills</h1>
          <p className="mt-1 text-sm text-[#8A7F74]">
            {activeLocation?.name ? `${activeLocation.name} · ` : ""}Create bills for stock you supply to the food court.
          </p>
        </div>
        <Button
          onClick={() => { setCreating(true); setSelectedId(null); }}
          className="h-11 rounded-[10px] bg-[#B5482C] px-5 font-semibold text-white hover:bg-[#953A22]"
        >
          <FilePlus2 className="size-[18px]" /> New bill
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card className="h-fit rounded-[16px] border-[#E8E2DB] bg-white">
          <CardHeader className="border-b border-[#F0EBE5] pb-4">
            <CardTitle className="text-[15px]">Bills <span className="font-normal text-[#8A7F74]">({bills.length})</span></CardTitle>
          </CardHeader>
          <CardContent className="max-h-[36rem] space-y-2 overflow-y-auto p-3">
            {billsQuery.isLoading && <p className="py-8 text-center text-sm text-[#8A7F74]">Loading bills…</p>}
            {!billsQuery.isLoading && bills.length === 0 && (
              <p className="py-8 text-center text-sm text-[#8A7F74]">No bills yet. Create your first bill.</p>
            )}
            {bills.map((bill) => {
              const status = VENDOR_BILL_STATUS[bill.status] || VENDOR_BILL_STATUS.DRAFT;
              const active = !creating && selected?.id === bill.id;
              return (
                <button
                  type="button"
                  key={bill.id}
                  onClick={() => { setSelectedId(bill.id); setCreating(false); }}
                  className={`w-full rounded-[12px] border p-3 text-left transition ${active ? "border-[#B5482C] bg-[#FBF1EE]" : "border-[#E8E2DB] hover:bg-[#FAF8F5]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{bill.billNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-[#8A7F74]">
                    <span className="truncate">{bill.invoiceNumber || "No invoice no."}</span>
                    <span className="font-semibold text-[#1F1A17]">{formatInr(bill.totalAmount)}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <section className="min-w-0">
          {creating && (
            <BillEditor key="new-bill" locationId={activeLocationId} bill={null} onSaved={handleSaved} />
          )}
          {!creating && selected && (
            <BillDetail
              key={`${selected.id}-${selected.updatedAt}`}
              bill={selected}
              locationId={activeLocationId}
              onSaved={handleSaved}
              commentPending={commentMutation.isPending}
              onComment={(message) => commentMutation.mutate(message)}
            />
          )}
          {!creating && !selected && (
            <Card className="grid min-h-80 place-items-center rounded-[16px] border-[#E8E2DB] bg-white">
              <div className="text-center">
                <ReceiptText className="mx-auto size-10 text-[#C9BFB4]" />
                <p className="mt-3 text-sm text-[#8A7F74]">Select a bill to view it, or create a new one.</p>
              </div>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}

function BillDetail({ bill, locationId, onSaved, commentPending, onComment }) {
  const status = VENDOR_BILL_STATUS[bill.status] || VENDOR_BILL_STATUS.DRAFT;
  const editable = EDITABLE_VENDOR_BILL_STATUSES.includes(bill.status);
  const correction = bill.status === "CORRECTION_REQUESTED" ? latestCorrectionMessage(bill) : null;

  return (
    <div className="space-y-5">
      <Card className="rounded-[16px] border-[#E8E2DB] bg-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8A7F74]">{bill.billNumber}</p>
            <h2 className="text-xl font-bold">{bill.invoiceNumber || "Bill without invoice number"}</h2>
            <p className="mt-1 text-sm text-[#8A7F74]">Invoice date {bill.invoiceDate || "—"} · Last updated {formatDateTime(bill.updatedAt)}</p>
          </div>
          <div className="text-right">
            <Badge className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</Badge>
            <p className="mt-2 text-2xl font-bold">{formatInr(bill.totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      {correction && (
        <div className="flex gap-3 rounded-[14px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Admin asked for a correction</p>
            <p className="mt-1 whitespace-pre-wrap">{correction}</p>
          </div>
        </div>
      )}

      {editable ? (
        <BillEditor locationId={locationId} bill={bill} onSaved={onSaved} />
      ) : (
        <Card className="rounded-[16px] border-[#E8E2DB] bg-white">
          <CardHeader className="pb-3"><CardTitle className="text-[15px]">Line items</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-5 pt-0">
            <ItemsReadOnly items={bill.items} />
          </CardContent>
        </Card>
      )}

      {bill.status === "PAID" && (
        <Card className="rounded-[16px] border-emerald-200 bg-emerald-50">
          <CardContent className="p-5 text-sm text-emerald-900">
            <p className="font-semibold">Paid {formatInr(bill.paidAmount)} via {bill.paymentMethod}</p>
            <p className="mt-1">Reference: {bill.paymentReference || "—"} · {formatDateTime(bill.paidAt)}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-[16px] border-[#E8E2DB] bg-white">
          <CardHeader className="pb-3"><CardTitle className="text-[15px]">Activity</CardTitle></CardHeader>
          <CardContent className="p-5 pt-0"><Timeline events={bill.events} /></CardContent>
        </Card>
        <Card className="rounded-[16px] border-[#E8E2DB] bg-white">
          <CardHeader className="pb-3"><CardTitle className="text-[15px]">Comments</CardTitle></CardHeader>
          <CardContent className="p-5 pt-0"><CommentBox pending={commentPending} onSend={onComment} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function BillEditor({ locationId, bill, onSaved }) {
  const isNew = !bill;
  const [invoiceNumber, setInvoiceNumber] = useState(bill?.invoiceNumber || "");
  const [invoiceDate, setInvoiceDate] = useState(bill?.invoiceDate || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(bill?.notes || "");
  const [items, setItems] = useState(() => (bill?.items?.length
    ? bill.items.map((item) => ({
      key: newKey(), description: item.description, quantity: String(item.quantity), unit: item.unit, unitPrice: String(item.unitPrice),
    }))
    : [newItem()]));

  const total = useMemo(() => items.reduce((sum, item) => sum + lineTotal(item.quantity, item.unitPrice), 0), [items]);

  const updateItem = (key, field, value) =>
    setItems((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  const removeItem = (key) => setItems((rows) => (rows.length > 1 ? rows.filter((row) => row.key !== key) : rows));

  const saveMutation = useMutation({
    mutationFn: (submit) => {
      const payload = {
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        notes: notes.trim() || null,
        items: items
          .filter((item) => item.description.trim())
          .map((item) => ({
            description: item.description.trim(),
            quantity: Number(item.quantity),
            unit: item.unit.trim() || "pcs",
            unitPrice: Number(item.unitPrice || 0),
          })),
      };
      return isNew
        ? createVendorBill(locationId, payload, submit)
        : updateVendorBill(locationId, bill.id, payload, submit);
    },
    onSuccess: (saved, submit) => {
      toast.success(submit ? "Bill submitted to admin" : "Draft saved");
      onSaved(saved);
    },
    onError: (error) => toast.error(vendorErrorMessage(error)),
  });

  return (
    <Card className="rounded-[16px] border-[#E8E2DB] bg-white">
      <CardHeader className="border-b border-[#F0EBE5] pb-4">
        <CardTitle className="text-[15px]">{isNew ? "New bill" : "Edit bill"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invoice-number">Invoice number</Label>
            <Input id="invoice-number" className="h-11 rounded-[10px]" placeholder="e.g. INV-2041" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-date">Invoice date</Label>
            <Input id="invoice-date" type="date" className="h-11 rounded-[10px]" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="hidden grid-cols-[minmax(0,2.4fr)_90px_90px_120px_120px_40px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#8A7F74] md:grid">
            <span>Description</span><span>Qty</span><span>Unit</span><span>Unit price</span><span className="text-right">Total</span><span />
          </div>
          {items.map((item) => (
            <div key={item.key} className="grid gap-2 rounded-[12px] border border-[#EFE9E2] p-3 md:grid-cols-[minmax(0,2.4fr)_90px_90px_120px_120px_40px] md:items-center md:border-0 md:p-0">
              <Input aria-label="Item description" className="h-10 rounded-[10px]" placeholder="Item description" value={item.description} onChange={(e) => updateItem(item.key, "description", e.target.value)} />
              <Input aria-label="Quantity" type="number" min="0" step="any" className="h-10 rounded-[10px]" value={item.quantity} onChange={(e) => updateItem(item.key, "quantity", e.target.value)} />
              <Input aria-label="Unit" className="h-10 rounded-[10px]" placeholder="pcs" value={item.unit} onChange={(e) => updateItem(item.key, "unit", e.target.value)} />
              <Input aria-label="Unit price" type="number" min="0" step="0.01" className="h-10 rounded-[10px]" placeholder="₹" value={item.unitPrice} onChange={(e) => updateItem(item.key, "unitPrice", e.target.value)} />
              <span className="text-right text-sm font-semibold md:pr-1">{formatInr(lineTotal(item.quantity, item.unitPrice))}</span>
              <button type="button" aria-label="Remove item" onClick={() => removeItem(item.key)} className="grid h-10 place-items-center rounded-[10px] text-[#8A7F74] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" disabled={items.length === 1}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setItems((rows) => [...rows, newItem()])} className="h-10 rounded-[10px] border-dashed">
            <Plus className="size-4" /> Add item
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bill-notes">Notes for admin (optional)</Label>
          <Textarea id="bill-notes" className="rounded-[10px]" rows={3} placeholder="Delivery details, batch numbers, anything the admin should know" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0EBE5] pt-4">
          <p className="text-sm text-[#8A7F74]">Total <span className="ml-2 text-xl font-bold text-[#1F1A17]">{formatInr(total)}</span></p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(false)} className="h-11 rounded-[10px]">
              <Save className="size-4" /> Save draft
            </Button>
            <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(true)} className="h-11 rounded-[10px] bg-[#B5482C] text-white hover:bg-[#953A22]">
              <Send className="size-4" /> Submit to admin
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemsReadOnly({ items }) {
  return (
    <table className="w-full min-w-[480px] text-left text-sm">
      <thead className="text-xs uppercase tracking-wide text-[#8A7F74]">
        <tr><th className="py-2 font-semibold">Item</th><th className="py-2 font-semibold">Qty</th><th className="py-2 font-semibold">Price</th><th className="py-2 text-right font-semibold">Total</th></tr>
      </thead>
      <tbody className="divide-y divide-[#F0EBE5]">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="py-2.5">{item.description}</td>
            <td className="py-2.5">{item.quantity} {item.unit}</td>
            <td className="py-2.5">{formatInr(item.unitPrice)}</td>
            <td className="py-2.5 text-right font-semibold">{formatInr(item.lineTotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Timeline({ events = [] }) {
  if (!events.length) return <p className="text-sm text-[#8A7F74]">No activity yet.</p>;
  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="relative pl-5">
          <span className="absolute left-0 top-1.5 size-2.5 rounded-full bg-[#B5482C]" />
          <p className="text-sm font-semibold">{VENDOR_BILL_EVENT_LABELS[event.eventType] || event.eventType}</p>
          <p className="text-xs text-[#8A7F74]">{event.actorName || event.actorRole} · {formatDateTime(event.createdAt)}</p>
          {event.message && <p className="mt-1 whitespace-pre-wrap rounded-[10px] bg-[#FAF8F5] p-2.5 text-sm">{event.message}</p>}
        </li>
      ))}
    </ol>
  );
}

function CommentBox({ pending, onSend }) {
  const [message, setMessage] = useState("");
  const submit = () => {
    const text = message.trim();
    if (!text) return;
    onSend(text);
    setMessage("");
  };
  return (
    <div className="space-y-3">
      <Textarea className="rounded-[10px]" rows={3} placeholder="Write a comment for the admin team" value={message} onChange={(e) => setMessage(e.target.value)} />
      <div className="flex justify-end">
        <Button type="button" disabled={pending || !message.trim()} onClick={submit} className="h-10 rounded-[10px] bg-[#1F1A17] text-white hover:bg-black">
          <MessageSquare className="size-4" /> Post comment
        </Button>
      </div>
    </div>
  );
}
