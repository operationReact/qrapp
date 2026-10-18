import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, MessageSquare, Plus, Save, Send, Trash2, AlertTriangle, ReceiptText } from "lucide-react";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import {
  addVendorBillComment, createVendorBill, listVendorBills, listVendorLocations, updateVendorBill, vendorErrorMessage,
} from "@/services/vendor-bill-service";
import {
  EDITABLE_VENDOR_BILL_STATUSES, VENDOR_BILL_EVENT_LABELS, VENDOR_BILL_STATUS, formatDateTime, formatInr,
  latestCorrectionMessage, lineTotal,
} from "@/lib/vendorBills";
import "../../styles/vendor-portal.css";

export const Route = createFileRoute("/vendor/")({
  component: VendorPortal,
});

const newKey = () => Math.random().toString(36).slice(2);
const UNIT_OPTIONS = ["pcs", "kg", "g", "litre", "ml", "box", "packet", "dozen", "bag", "bottle", "can", "carton"];

function UnitSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const options = useMemo(() => [...new Set([...UNIT_OPTIONS, value].filter(Boolean))], [value]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!buttonRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false);
    };
    const onScroll = (e) => {
      if (!listRef.current?.contains(e.target)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(!open);
  };

  return (
    <>
      <button type="button" ref={buttonRef} aria-label="Unit" aria-haspopup="listbox" aria-expanded={open} className="vp-input vp-select" onClick={toggle}>
        {value}
      </button>
      {open && pos && createPortal(
        <ul ref={listRef} role="listbox" className="vp-unit-list" style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {options.map((unit) => (
            <li key={unit} role="option" aria-selected={unit === value} className={unit === value ? "is-active" : undefined} onClick={() => { onChange(unit); setOpen(false); }}>
              {unit}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}
const newItem = () => ({ key: newKey(), description: "", quantity: "1", unit: "pcs", unitPrice: "" });
const statusKeyOf = (bill) => (VENDOR_BILL_STATUS[bill?.status] ? bill.status : "DRAFT");

function StatusPill({ status }) {
  const key = statusKeyOf(status);
  return <span className={`vp-status vp-status--${key}`}>{VENDOR_BILL_STATUS[key].label}</span>;
}

function VendorPortal() {
  const queryClient = useQueryClient();
  const { activeLocationId } = useActiveLocation();
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const locationsQuery = useQuery({
    queryKey: ["vendor-locations"],
    queryFn: listVendorLocations,
  });
  const vendorLocations = locationsQuery.data || [];
  const vendorLocation = vendorLocations.find((location) => String(location.id) === String(activeLocationId))
    || vendorLocations[0] || null;
  const locationId = vendorLocation?.id ?? null;

  const billsQuery = useQuery({
    queryKey: ["vendor-bills", locationId],
    queryFn: () => listVendorBills(locationId),
    enabled: Boolean(locationId),
  });
  const bills = billsQuery.data || [];
  const selected = bills.find((bill) => bill.id === selectedId) || null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vendor-bills", locationId] });

  const commentMutation = useMutation({
    mutationFn: (message) => addVendorBillComment(locationId, selected.id, message),
    onSuccess: () => { refresh(); toast.success("Comment sent"); },
    onError: (error) => toast.error(vendorErrorMessage(error)),
  });

  function handleSaved(saved) {
    refresh();
    setCreating(false);
    setSelectedId(saved.id);
  }

  return (
    <div className="vp-body">
      <header className="vp-header">
        <div>
          <p className="vp-eyebrow">Vendor portal</p>
          <h1 className="vp-title">Your bills</h1>
          <p className="vp-subtitle">
            {vendorLocation?.name ? `${vendorLocation.name} · ` : ""}Create bills for stock you supply to the food court.
          </p>
        </div>
        <button
          type="button"
          className="vp-btn vp-btn--primary"
          onClick={() => { setCreating(true); setSelectedId(null); }}
        >
          <FilePlus2 size={18} /> New bill
        </button>
      </header>

      <div className="vp-layout">
        <aside className="vp-card vp-list-card">
          <div className="vp-card__head">
            <h2 className="vp-card__title">Bills</h2>
            <span className="vp-count">{bills.length}</span>
          </div>
          <div className="vp-list">
            {billsQuery.isLoading && <p className="vp-empty">Loading bills…</p>}
            {!billsQuery.isLoading && bills.length === 0 && (
              <p className="vp-empty">No bills yet. Create your first bill.</p>
            )}
            {bills.map((bill) => {
              const active = !creating && selected?.id === bill.id;
              return (
                <button
                  type="button"
                  key={bill.id}
                  onClick={() => { setSelectedId(bill.id); setCreating(false); }}
                  className={`vp-bill${active ? " is-active" : ""}`}
                >
                  <div className="vp-bill__top">
                    <span className="vp-bill__number">{bill.billNumber}</span>
                    <StatusPill status={bill} />
                  </div>
                  <div className="vp-bill__bottom">
                    <span className="vp-bill__meta">{bill.invoiceNumber || "No invoice no."}</span>
                    <span className="vp-bill__amount">{formatInr(bill.totalAmount)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="vp-stack">
          {creating && (
            <BillEditor key="new-bill" locationId={locationId} bill={null} onSaved={handleSaved} />
          )}
          {!creating && selected && (
            <BillDetail
              key={`${selected.id}-${selected.updatedAt}`}
              bill={selected}
              locationId={locationId}
              onSaved={handleSaved}
              commentPending={commentMutation.isPending}
              onComment={(message) => commentMutation.mutate(message)}
            />
          )}
          {!creating && !selected && (
            <div className="vp-card vp-placeholder">
              <div>
                <span className="vp-placeholder__icon"><ReceiptText size={26} /></span>
                <h3>No bill selected</h3>
                <p>Select a bill to view it, or create a new one.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BillDetail({ bill, locationId, onSaved, commentPending, onComment }) {
  const editable = EDITABLE_VENDOR_BILL_STATUSES.includes(bill.status);
  const correction = bill.status === "CORRECTION_REQUESTED" ? latestCorrectionMessage(bill) : null;

  return (
    <div className="vp-stack">
      <div className="vp-card vp-summary">
        <div>
          <p className="vp-eyebrow">{bill.billNumber}</p>
          <h2 className="vp-summary__title">{bill.invoiceNumber || "Bill without invoice number"}</h2>
          <p className="vp-summary__meta">
            Invoice date {bill.invoiceDate || "—"} · Last updated {formatDateTime(bill.updatedAt)}
          </p>
        </div>
        <div className="vp-summary__aside">
          <StatusPill status={bill} />
          <p className="vp-summary__total">{formatInr(bill.totalAmount)}</p>
        </div>
      </div>

      {correction && (
        <div className="vp-alert vp-alert--danger">
          <AlertTriangle size={20} />
          <div>
            <p className="vp-alert__title">Admin asked for a correction</p>
            <p className="vp-alert__body">{correction}</p>
          </div>
        </div>
      )}

      {editable ? (
        <BillEditor locationId={locationId} bill={bill} onSaved={onSaved} />
      ) : (
        <div className="vp-card">
          <div className="vp-card__head"><h3 className="vp-card__title">Line items</h3></div>
          <div className="vp-card__body">
            <ItemsReadOnly items={bill.items} />
          </div>
        </div>
      )}

      {bill.status === "PAID" && (
        <div className="vp-alert vp-alert--success">
          <div>
            <p className="vp-alert__title">Paid {formatInr(bill.paidAmount)} via {bill.paymentMethod}</p>
            <p className="vp-alert__body">Reference: {bill.paymentReference || "—"} · {formatDateTime(bill.paidAt)}</p>
          </div>
        </div>
      )}

      <div className="vp-grid-2">
        <div className="vp-card">
          <div className="vp-card__head"><h3 className="vp-card__title">Activity</h3></div>
          <div className="vp-card__body"><Timeline events={bill.events} /></div>
        </div>
        <div className="vp-card">
          <div className="vp-card__head"><h3 className="vp-card__title">Comments</h3></div>
          <div className="vp-card__body"><CommentBox pending={commentPending} onSend={onComment} /></div>
        </div>
      </div>
    </div>
  );
}

function BillEditor({ locationId, bill, onSaved }) {
  const isNew = !bill;
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
    <div className="vp-card">
      <div className="vp-card__head">
        <h3 className="vp-card__title">{isNew ? "New bill" : "Edit bill"}</h3>
      </div>
      <div className="vp-card__body vp-stack" style={{ gap: 20 }}>
        <div className="vp-form-grid vp-form-grid--two">
          <label className="vp-field">
            <span>Invoice number</span>
            <input className="vp-input" value={isNew ? "Assigned automatically on save" : (bill.invoiceNumber || "")} readOnly />
          </label>
          <label className="vp-field">
            <span>Invoice date</span>
            <input type="date" className="vp-input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </label>
        </div>

        <div className="vp-items">
          <div className="vp-items__head">
            <span>Description</span><span>Qty</span><span>Unit</span><span>Unit price</span><span className="is-right">Total</span><span />
          </div>
          {items.map((item) => (
            <div key={item.key} className="vp-item">
              <label className="vp-item__cell"><span className="vp-item__cap">Description</span><input aria-label="Item description" className="vp-input" placeholder="Item description" value={item.description} onChange={(e) => updateItem(item.key, "description", e.target.value)} /></label>
              <label className="vp-item__cell"><span className="vp-item__cap">Qty</span><input aria-label="Quantity" type="number" min="0" step="any" className="vp-input" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(item.key, "quantity", e.target.value)} /></label>
              <label className="vp-item__cell"><span className="vp-item__cap">Unit</span><UnitSelect value={item.unit} onChange={(unit) => updateItem(item.key, "unit", unit)} /></label>
              <label className="vp-item__cell"><span className="vp-item__cap">Price per unit (₹)</span><input aria-label="Unit price" type="number" min="0" step="0.01" className="vp-input" placeholder="Price per unit ₹" value={item.unitPrice} onChange={(e) => updateItem(item.key, "unitPrice", e.target.value)} /></label>
              <span className="vp-item__total">{formatInr(lineTotal(item.quantity, item.unitPrice))}</span>
              <button type="button" aria-label="Remove item" onClick={() => removeItem(item.key)} className="vp-item__remove" disabled={items.length === 1}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setItems((rows) => [...rows, newItem()])} className="vp-btn vp-btn--dashed vp-btn--sm">
            <Plus size={16} /> Add item
          </button>
        </div>

        <label className="vp-field">
          <span>Notes for admin (optional)</span>
          <textarea className="vp-input vp-textarea" rows={3} placeholder="Delivery details, batch numbers, anything the admin should know" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="vp-footer">
          <p className="vp-footer__total">Total <span className="vp-footer__amount">{formatInr(total)}</span></p>
          <div className="vp-footer__actions">
            <button type="button" className="vp-btn vp-btn--ghost" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(false)}>
              <Save size={16} /> Save draft
            </button>
            <button type="button" className="vp-btn vp-btn--primary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(true)}>
              <Send size={16} /> Submit to admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemsReadOnly({ items }) {
  return (
    <div className="vp-table-wrap">
      <table className="vp-table">
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th className="is-right">Total</th></tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td>{item.quantity} {item.unit}</td>
              <td>{formatInr(item.unitPrice)}</td>
              <td className="is-right">{formatInr(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Timeline({ events = [] }) {
  if (!events.length) return <p className="vp-muted">No activity yet.</p>;
  return (
    <ol className="vp-timeline">
      {events.map((event) => (
        <li key={event.id} className="vp-timeline__item">
          <p className="vp-timeline__title">{VENDOR_BILL_EVENT_LABELS[event.eventType] || event.eventType}</p>
          <p className="vp-timeline__meta">{event.actorName || event.actorRole} · {formatDateTime(event.createdAt)}</p>
          {event.message && <p className="vp-timeline__message">{event.message}</p>}
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
    <div className="vp-comment">
      <textarea className="vp-input vp-textarea" rows={3} placeholder="Write a comment for the admin team" value={message} onChange={(e) => setMessage(e.target.value)} />
      <div className="vp-comment__actions">
        <button type="button" className="vp-btn vp-btn--dark vp-btn--sm" disabled={pending || !message.trim()} onClick={submit}>
          <MessageSquare size={16} /> Post comment
        </button>
      </div>
    </div>
  );
}
