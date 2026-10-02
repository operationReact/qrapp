import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FilterSheet({ open, onOpenChange, onApply, filters, locations, canGlobal }) {
  const [status, setStatus] = useState(filters.status || "");
  const [consent, setConsent] = useState(filters.consent || "");
  const [locationId, setLocationId] = useState(filters.locationId || "");
  const [fromDate, setFromDate] = useState(filters.fromDate || "");
  const [toDate, setToDate] = useState(filters.toDate || "");
  const [orderId, setOrderId] = useState(filters.orderId || "");

  useEffect(() => {
    setStatus(filters.status || "");
    setConsent(filters.consent || "");
    setLocationId(filters.locationId || "");
    setFromDate(filters.fromDate || "");
    setToDate(filters.toDate || "");
    setOrderId(filters.orderId || "");
  }, [filters, open]);

  const handleApply = () => {
    onApply({
      status,
      consent,
      locationId,
      fromDate,
      toDate,
      orderId,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setStatus("");
    setConsent("");
    setLocationId("");
    setFromDate("");
    setToDate("");
    setOrderId("");
  };

  const activeCount = [status, consent, locationId, fromDate, toDate, orderId].filter(
    Boolean
  ).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition"
        onClick={() => onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-lg animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--cc-border)] px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <h2 className="font-semibold text-[var(--cc-text)]">
            Filters {activeCount > 0 && <span className="text-xs text-muted-foreground ml-2">({activeCount})</span>}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-[var(--cc-page)] rounded transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Status */}
          <div>
            <label className="text-sm font-semibold text-[var(--cc-text)] block mb-3">
              Status
            </label>
            <div className="space-y-2">
              {[
                { value: "", label: "All" },
                { value: "PENDING_REVIEW", label: "Pending Review" },
                { value: "APPROVED", label: "Approved" },
                { value: "PUBLISHED", label: "Published" },
                { value: "REJECTED", label: "Rejected" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[var(--cc-page)]"
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[var(--cc-text)]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Consent */}
          <div>
            <label className="text-sm font-semibold text-[var(--cc-text)] block mb-3">
              Consent
            </label>
            <div className="space-y-2">
              {[
                { value: "", label: "All" },
                { value: "PENDING", label: "Pending" },
                { value: "GRANTED", label: "Granted" },
                { value: "REVOKED", label: "Revoked" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[var(--cc-page)]"
                >
                  <input
                    type="radio"
                    name="consent"
                    value={opt.value}
                    checked={consent === opt.value}
                    onChange={(e) => setConsent(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[var(--cc-text)]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location */}
          {(canGlobal || locations.length > 1) && (
            <div>
              <label className="text-sm font-semibold text-[var(--cc-text)] block mb-3">
                Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full h-10 rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm"
              >
                <option value="">{canGlobal ? "All Locations" : "My Locations"}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="text-sm font-semibold text-[var(--cc-text)] block mb-3">
              Date Range
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Order ID */}
          <div>
            <label className="text-sm font-semibold text-[var(--cc-text)] block mb-3">
              Order ID
            </label>
            <Input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Optional"
              className="h-10"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-[var(--cc-border)] bg-white px-4 py-3 flex gap-2 rounded-b-3xl">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button
            className="flex-1 bg-[var(--cc-primary)] hover:bg-[var(--cc-primary-dark)]"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}
