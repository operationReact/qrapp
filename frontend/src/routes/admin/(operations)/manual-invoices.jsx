import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { ROLE } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  cancelManualInvoice, createManualInvoice, finalizeManualInvoice,
  getManualInvoice, getManualInvoicePdfUrl, listManualInvoices, updateManualInvoice,
} from "@/services/manual-invoice-service";

export const Route = createFileRoute("/admin/(operations)/manual-invoices")({
  component: () => (
    <RoleGuard roles={[ROLE.SUPER_ADMIN, ROLE.ADMIN]}>
      <ManualInvoicesPage />
    </RoleGuard>
  ),
});

const SOURCE_TYPES = [
  { value: "PARTY_EVENT", label: "Party / Event" },
  { value: "BULK_ORDER", label: "Bulk Order" },
  { value: "REGULAR_ORDER", label: "Regular Order" },
];
const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "FINALIZED", label: "Finalized" },
  { value: "CANCELLED", label: "Cancelled" },
];
const STATUS_STYLE = {
  DRAFT: "bg-amber-100 text-amber-800",
  FINALIZED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const INDIAN_STATES = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"],
  ["05", "Uttarakhand"], ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"], ["10", "Bihar"], ["11", "Sikkim"], ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"], ["16", "Tripura"],
  ["17", "Meghalaya"], ["18", "Assam"], ["19", "West Bengal"], ["20", "Jharkhand"],
  ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["25", "Daman and Diu"], ["26", "Dadra and Nagar Haveli and Daman and Diu"], ["27", "Maharashtra"],
  ["29", "Karnataka"], ["30", "Goa"], ["31", "Lakshadweep"],
  ["32", "Kerala"], ["33", "Tamil Nadu"], ["34", "Puducherry"], ["35", "Andaman and Nicobar Islands"],
  ["36", "Telangana"], ["37", "Andhra Pradesh"], ["38", "Ladakh"],
];
const STATE_NAME_BY_CODE = new Map(INDIAN_STATES);
STATE_NAME_BY_CODE.set("28", "Andhra Pradesh");

const emptyLine = () => ({ description: "", hsnSac: "", quantity: "1", unitPrice: "0", gstRate: "18" });
const emptyForm = () => ({
  sourceType: "PARTY_EVENT",
  linkType: "STANDALONE",
  linkedOrderId: "",
  linkedReference: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerGstin: "",
  customerAddress: "",
  placeOfSupply: "",
  placeOfSupplyState: "",
  notes: "",
  discountAmount: "0",
  lineItems: [emptyLine()],
});

function money(value) {
  return `INR ${Number(value ?? 0).toFixed(2)}`;
}

function isValidGstin(value) {
  return !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value);
}

function toPayload(form) {
  return {
    sourceType: form.sourceType,
    linkType: form.linkType,
    linkedOrderId: form.linkType === "LINKED" && form.linkedOrderId ? Number(form.linkedOrderId) : null,
    linkedReference: form.linkedReference || null,
    invoiceDate: form.invoiceDate || null,
    customerName: form.customerName,
    customerPhone: form.customerPhone || null,
    customerEmail: form.customerEmail || null,
    customerGstin: form.customerGstin || null,
    customerAddress: form.customerAddress || null,
    placeOfSupply: form.placeOfSupply || null,
    placeOfSupplyStateCode: form.placeOfSupplyState
      ? INDIAN_STATES.find(([, name]) => name === form.placeOfSupplyState)?.[0] || null
      : null,
    notes: form.notes || null,
    discountAmount: Number(form.discountAmount || 0),
    lineItems: form.lineItems.map((l) => ({
      description: l.description,
      hsnSac: l.hsnSac,
      quantity: Number(l.quantity || 0),
      unitPrice: Number(l.unitPrice || 0),
      gstRate: Number(l.gstRate || 0),
    })),
  };
}

function ManualInvoicesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null); // null | {} (new) | invoice (edit)

  const params = { status, sourceType, search, page, size: 20 };
  const query = useQuery({
    queryKey: ["manual-invoices", params],
    queryFn: () => listManualInvoices(params),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["manual-invoices"] });

  const finalize = useMutation({
    mutationFn: (id) => finalizeManualInvoice(id),
    onSuccess: () => { toast.success("Invoice finalized"); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || "Could not finalize"),
  });
  const cancel = useMutation({
    mutationFn: ({ id, reason }) => cancelManualInvoice(id, reason),
    onSuccess: () => { toast.success("Invoice cancelled"); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || "Could not cancel"),
  });

  const openPdf = async (id) => {
    try {
      const url = await getManualInvoicePdfUrl(id);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open PDF");
    }
  };

  const rows = query.data?.content ?? [];
  const totalPages = query.data?.totalPages ?? 1;

  return (
    <main className="min-h-screen bg-[#F8F5F0] px-3 py-4 pb-24 text-[#24211F] sm:px-4 sm:py-6 md:px-8 md:pb-8">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link to="/admin" className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E7E0D8] bg-white px-3 text-sm font-semibold text-[#5C554E] transition hover:border-[#B8893C] hover:text-[#24211F]">
              <ArrowLeft className="size-4" aria-hidden="true" /> Back to Dashboard
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8893C]">Operations</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Manual Invoices</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756D64]">
              Raise GST invoices for party events, bulk and regular orders. Drafts are editable;
              finalized invoices are immutable and carry a global manual number.
            </p>
          </div>
          <Button className="h-11 w-full rounded-xl bg-[#24211F] hover:bg-[#3A3530] md:w-auto" onClick={() => setEditing(emptyForm())}>
            <Plus className="size-4" /> New invoice
          </Button>
        </header>

        <Card className="rounded-2xl border-[#E7E0D8] bg-[#FFFEFC]">
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
            <CardTitle className="text-base">Register</CardTitle>
            <div className="grid w-full gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Input
                placeholder="Search number or customer"
                value={search}
                onChange={(e) => { setPage(0); setSearch(e.target.value); }}
                className="h-10 w-full rounded-xl border-[#E7E0D8] bg-white sm:w-56"
              />
              <Select value={status || "all"} onValueChange={(v) => { setPage(0); setStatus(v === "all" ? "" : v); }}>
                <SelectTrigger className="h-10 w-full rounded-xl border-[#E7E0D8] bg-white sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((s) => <SelectItem key={s.value || "all"} value={s.value || "all"}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sourceType || "all"} onValueChange={(v) => { setPage(0); setSourceType(v === "all" ? "" : v); }}>
                <SelectTrigger className="h-10 w-full rounded-xl border-[#E7E0D8] bg-white sm:w-40"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {SOURCE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="space-y-3 sm:hidden">
              {query.isLoading && <p className="py-8 text-center text-sm text-[#756D64]">Loading…</p>}
              {!query.isLoading && rows.length === 0 && <p className="py-8 text-center text-sm text-[#756D64]">No manual invoices yet.</p>}
              {rows.map((row) => (
                <article key={row.id} className="rounded-xl border border-[#E7E0D8] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.customerName}</p>
                      <p className="mt-1 text-xs text-[#756D64]">{row.invoiceNumber || "Draft"} · {row.invoiceDate}</p>
                    </div>
                    <Badge className={`${STATUS_STYLE[row.status] || ""} shrink-0 border-0`}>{row.status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#756D64]">
                    <div><span className="block uppercase tracking-wide text-[10px]">Source</span><span className="font-medium text-[#24211F]">{SOURCE_TYPES.find((s) => s.value === row.sourceType)?.label || row.sourceType}</span></div>
                    <div className="text-right"><span className="block uppercase tracking-wide text-[10px]">Total</span><span className="font-semibold text-[#24211F]">{money(row.grandTotal)}</span></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[#F0EBE5] pt-3">
                    <Button size="sm" variant="outline" className="h-9 flex-1 rounded-lg" onClick={() => openPdf(row.id)}>
                      <FileText className="size-3.5" /> PDF
                    </Button>
                    {row.status === "DRAFT" && (
                      <>
                        <RowEdit id={row.id} onReady={setEditing} />
                        <Button type="button" size="sm" variant="default"
                          className="h-9 rounded-lg !bg-emerald-700 !text-white hover:!bg-emerald-800"
                          onClick={() => finalize.mutate(row.id)}>
                          Finalize
                        </Button>
                      </>
                    )}
                    {row.status !== "CANCELLED" && (
                      <CancelButton onCancel={(reason) => cancel.mutate({ id: row.id, reason })} />
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-[#756D64]">Loading…</TableCell></TableRow>
                )}
                {!query.isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-[#756D64]">No manual invoices yet.</TableCell></TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-semibold">{row.invoiceNumber || "—"}</TableCell>
                    <TableCell>{row.invoiceDate}</TableCell>
                    <TableCell>{SOURCE_TYPES.find((s) => s.value === row.sourceType)?.label || row.sourceType}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell className="text-right">{money(row.grandTotal)}</TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_STYLE[row.status] || ""} border-0`}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => openPdf(row.id)}>
                          <FileText className="size-3.5" /> PDF
                        </Button>
                        {row.status === "DRAFT" && (
                          <>
                            <RowEdit id={row.id} onReady={setEditing} />
                            <Button type="button" size="sm" variant="default"
                              className="h-8 rounded-lg !bg-emerald-700 !text-white hover:!bg-emerald-800"
                              onClick={() => finalize.mutate(row.id)}>
                              Finalize
                            </Button>
                          </>
                        )}
                        {row.status !== "CANCELLED" && (
                          <CancelButton onCancel={(reason) => cancel.mutate({ id: row.id, reason })} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-[#756D64]">
                <span>Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editing && (
        <InvoiceFormDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}
    </main>
  );
}

function RowEdit({ id, onReady }) {
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const data = await getManualInvoice(id);
      onReady({
        id: data.id,
        sourceType: data.sourceType,
        linkType: data.linkType,
        linkedOrderId: data.linkedOrderId ? String(data.linkedOrderId) : "",
        linkedReference: data.linkedReference || "",
        invoiceDate: data.invoiceDate,
        customerName: data.customerName || "",
        customerPhone: data.customerPhone || "",
        customerEmail: data.customerEmail || "",
        customerGstin: data.customerGstin || "",
        customerAddress: data.customerAddress || "",
        placeOfSupply: data.placeOfSupply || "",
        placeOfSupplyState: STATE_NAME_BY_CODE.get(String(data.placeOfSupplyStateCode || "").padStart(2, "0")) || "",
        notes: data.notes || "",
        discountAmount: String(data.discountAmount ?? 0),
        lineItems: (data.lineItems || []).map((l) => ({
          description: l.description, hsnSac: l.hsnSac,
          quantity: String(l.quantity), unitPrice: String(l.unitPrice), gstRate: String(l.gstRate),
        })),
      });
    } catch {
      toast.error("Could not load invoice");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={loading} onClick={load}>Edit</Button>
  );
}

function CancelButton({ onCancel }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <>
      <Button size="sm" variant="outline" className="h-8 rounded-lg text-rose-700" onClick={() => setOpen(true)}>Cancel</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel invoice</DialogTitle></DialogHeader>
          <p className="text-sm text-[#756D64]">Cancellation is permanent. The corrected invoice must be reissued separately.</p>
          <Textarea placeholder="Reason for cancellation (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Keep invoice</Button>
            <Button className="bg-rose-700 hover:bg-rose-800" disabled={reason.trim().length < 3}
              onClick={() => { onCancel(reason.trim()); setOpen(false); setReason(""); }}>Cancel invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InvoiceFormDialog({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const isEdit = Boolean(initial.id);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setLine = (idx, key, value) =>
    setForm((f) => ({ ...f, lineItems: f.lineItems.map((l, i) => (i === idx ? { ...l, [key]: value } : l)) }));
  const addLine = () => setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLine()] }));
  const removeLine = (idx) =>
    setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));

  const totals = useMemo(() => {
    let taxable = 0; let tax = 0;
    form.lineItems.forEach((l) => {
      const lineTaxable = Number(l.quantity || 0) * Number(l.unitPrice || 0);
      taxable += lineTaxable;
      tax += (lineTaxable * Number(l.gstRate || 0)) / 100;
    });
    const discount = Number(form.discountAmount || 0);
    return { taxable, tax, grand: taxable + tax - discount };
  }, [form.lineItems, form.discountAmount]);

  const save = useMutation({
    mutationFn: () => (isEdit
      ? updateManualInvoice(initial.id, toPayload(form))
      : createManualInvoice(toPayload(form))),
    onSuccess: () => { toast.success(isEdit ? "Draft updated" : "Draft created"); onSaved(); },
    onError: (e) => toast.error(e.response?.data?.code || e.response?.data?.message || "Could not save invoice"),
  });

  const gstinValid = isValidGstin(form.customerGstin.trim().toUpperCase());
  const valid = form.customerName.trim()
    && gstinValid
    && form.lineItems.length > 0
    && form.lineItems.every((l) => l.description.trim() && l.hsnSac.trim()
      && Number(l.quantity) > 0 && Number(l.gstRate) >= 0)
    && (form.linkType === "STANDALONE" || form.linkedOrderId);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader><DialogTitle>{isEdit ? "Edit draft invoice" : "New manual invoice"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Labeled label="Source type">
              <Select value={form.sourceType} onValueChange={(v) => set("sourceType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Labeled>
            <Labeled label="Link type">
              <Select value={form.linkType} onValueChange={(v) => set("linkType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDALONE">Standalone</SelectItem>
                  <SelectItem value="LINKED">Linked</SelectItem>
                </SelectContent>
              </Select>
            </Labeled>
            <Labeled label="Invoice date">
              <Input type="date" value={form.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} />
            </Labeled>
          </div>
          {form.linkType === "LINKED" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Linked order ID">
                <Input value={form.linkedOrderId} onChange={(e) => set("linkedOrderId", e.target.value)} placeholder="Order primary key" />
              </Labeled>
              <Labeled label="Reference (optional)">
                <Input value={form.linkedReference} onChange={(e) => set("linkedReference", e.target.value)} />
              </Labeled>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Customer name"><Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} /></Labeled>
            <Labeled label="Customer phone"><Input value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} /></Labeled>
            <Labeled label="Customer email"><Input value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} /></Labeled>
            <Labeled label="Customer GSTIN">
              <Input maxLength={15} value={form.customerGstin} onChange={(e) => set("customerGstin", e.target.value.toUpperCase())} />
              {!gstinValid && <span className="font-normal text-rose-600">Enter a valid 15-character GSTIN.</span>}
            </Labeled>
            <Labeled label="Place of supply"><Input value={form.placeOfSupply} onChange={(e) => set("placeOfSupply", e.target.value)} /></Labeled>
            <Labeled label="State">
              <Select value={form.placeOfSupplyState || "none"} onValueChange={(value) => set("placeOfSupplyState", value === "none" ? "" : value)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select state</SelectItem>
                  {INDIAN_STATES.map(([, name]) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Labeled>
            <Labeled label="Customer address" className="sm:col-span-2"><Input value={form.customerAddress} onChange={(e) => set("customerAddress", e.target.value)} /></Labeled>
          </div>

          <div className="rounded-xl border border-[#E7E0D8] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Line items</p>
              <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={addLine}><Plus className="size-3.5" /> Add line</Button>
            </div>
            <div className="space-y-2">
              {form.lineItems.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-12 sm:col-span-4"><Labeled label="Description"><Input value={line.description} onChange={(e) => setLine(idx, "description", e.target.value)} /></Labeled></div>
                  <div className="col-span-4 sm:col-span-2"><Labeled label="HSN/SAC"><Input value={line.hsnSac} onChange={(e) => setLine(idx, "hsnSac", e.target.value)} /></Labeled></div>
                  <div className="col-span-3 sm:col-span-1"><Labeled label="Qty"><Input type="number" value={line.quantity} onChange={(e) => setLine(idx, "quantity", e.target.value)} /></Labeled></div>
                  <div className="col-span-5 sm:col-span-2"><Labeled label="Unit price"><Input type="number" value={line.unitPrice} onChange={(e) => setLine(idx, "unitPrice", e.target.value)} /></Labeled></div>
                  <div className="col-span-4 sm:col-span-2"><Labeled label="GST %"><Input type="number" value={line.gstRate} onChange={(e) => setLine(idx, "gstRate", e.target.value)} /></Labeled></div>
                  <div className="col-span-1 flex justify-end pb-1">
                    <Button size="icon" variant="ghost" className="size-9 text-rose-600" disabled={form.lineItems.length === 1} onClick={() => removeLine(idx)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Discount amount"><Input type="number" value={form.discountAmount} onChange={(e) => set("discountAmount", e.target.value)} /></Labeled>
            <Labeled label="Notes"><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Labeled>
          </div>

          <div className="rounded-xl bg-[#F5F1EB] p-3 text-sm">
            <div className="flex justify-between"><span>Taxable</span><span>{money(totals.taxable)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>{money(totals.tax)}</span></div>
            <div className="mt-1 flex justify-between font-semibold"><span>Estimated total</span><span>{money(totals.grand)}</span></div>
            <p className="mt-1 text-xs text-[#9a9087]">Final figures are recalculated by the server on save.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button className="bg-[#24211F] hover:bg-[#3A3530]" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : isEdit ? "Save draft" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Labeled({ label, className = "", children }) {
  return (
    <label className={`grid gap-1 text-xs font-semibold text-[#5C554E] ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
