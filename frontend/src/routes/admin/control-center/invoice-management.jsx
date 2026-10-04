import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, ImagePlus, Save, Upload } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { ROLE } from "@/lib/roles";
import { getInvoiceConfiguration, saveInvoiceConfiguration, uploadInvoiceAsset } from "@/services/invoice-configuration-service";

export const Route = createFileRoute("/admin/control-center/invoice-management")({
  component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><InvoiceManagement /></RoleGuard>,
});

const defaults = {
  invoicePrefix: "BB",
  invoiceNumberFormat: "BB/{FY}/{SEQ}",
  invoiceTitle: "TAX INVOICE",
  businessName: "Bro & Bro Hospitality LLP",
  signatureType: "TEXT",
  signatureEnabled: false,
  showGstin: true,
  showFssai: true,
  showPan: true,
  showCustomerAddress: true,
  showPaymentQr: true,
  showHsnSac: true,
  showSignature: true,
  showOrderId: true,
  primaryColor: "#171717",
  accentColor: "#B8893C",
  templateCode: "BRO_AND_BRO_MODERN",
  footerText: "GOOD FOOD. GOOD MOOD. GOOD COMPANY.",
};

function Field({ label, className = "", ...props }) {
  return <label className={`grid gap-1.5 text-xs font-semibold text-[#5C554E] ${className}`}>
    <span>{label}</span>
    <Input className="h-10 rounded-xl border-[#E7E0D8] bg-white" {...props} />
  </label>;
}

function Section({ title, children }) {
  return <Card className="border-[#E7E0D8] bg-[#FFFEFC] shadow-[0_8px_30px_rgba(42,35,30,0.04)]">
    <CardHeader className="pb-3"><CardTitle className="text-base text-[#24211F]">{title}</CardTitle></CardHeader>
    <CardContent>{children}</CardContent>
  </Card>;
}

function InvoiceManagement() {
  const { availableLocations, activeLocationId, isAllLocations } = useActiveLocation();
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [form, setForm] = useState(defaults);
  const queryClient = useQueryClient();
  const locationId = selectedLocationId || (!isAllLocations ? activeLocationId : "");
  const query = useQuery({
    queryKey: ["invoice-configuration", locationId],
    queryFn: () => getInvoiceConfiguration(locationId),
    enabled: Boolean(locationId),
  });

  useEffect(() => {
    if (!selectedLocationId && !isAllLocations && activeLocationId) setSelectedLocationId(String(activeLocationId));
  }, [activeLocationId, isAllLocations, selectedLocationId]);

  useEffect(() => {
    if (query.data) setForm({ ...defaults, ...query.data });
  }, [query.data]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = useMutation({
    mutationFn: () => saveInvoiceConfiguration(locationId, { ...form, locationId: Number(locationId) }),
    onSuccess: (data) => {
      setForm({ ...defaults, ...data });
      queryClient.invalidateQueries({ queryKey: ["invoice-configuration", locationId] });
      toast.success("Invoice configuration saved");
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save invoice configuration"),
  });
  const upload = useMutation({
    mutationFn: ({ type, file }) => uploadInvoiceAsset(locationId, type, file),
    onSuccess: (data) => setForm({ ...defaults, ...data }),
    onError: (error) => toast.error(error.response?.data?.message || "Could not upload invoice asset"),
  });

  const locations = useMemo(() => availableLocations || [], [availableLocations]);
  const displayOptions = [
    ["showGstin", "Show GSTIN"], ["showFssai", "Show FSSAI"], ["showPan", "Show PAN"],
    ["showHsnSac", "Show HSN/SAC"], ["showCustomerAddress", "Show customer address"],
    ["showPaymentQr", "Show payment QR"], ["showOrderId", "Show order ID"], ["showSignature", "Show signature"],
  ];

  return <main className="min-h-screen bg-[#F8F5F0] px-4 py-6 text-[#24211F] md:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8893C]">Super Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Invoice Management</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#756D64]">Configure the seller identity, brand presentation, and optional invoice details for each location.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#E7E0D8] bg-white px-3 py-2">
          <FileText className="size-4 text-[#B8893C]" />
          <select aria-label="Invoice location" value={locationId || ""} onChange={(event) => setSelectedLocationId(event.target.value)} className="max-w-[220px] bg-transparent text-sm font-semibold outline-none">
            <option value="" disabled>Select location</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name || `Location ${location.id}`}</option>)}
          </select>
        </div>
      </header>

      {!locationId && <div className="rounded-2xl border border-dashed border-[#D9C7AD] bg-[#FFFDF8] p-8 text-center text-sm text-[#756D64]">Select a location to manage its invoice configuration.</div>}
      {locationId && <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <Section title="Business details"><div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" value={form.businessName || ""} onChange={(e) => update("businessName", e.target.value)} />
            <Field label="Trade name" value={form.tradeName || ""} onChange={(e) => update("tradeName", e.target.value)} />
            <Field label="GSTIN" value={form.gstin || ""} onChange={(e) => update("gstin", e.target.value)} />
            <Field label="FSSAI license" value={form.fssaiLicense || ""} onChange={(e) => update("fssaiLicense", e.target.value)} />
            <Field label="PAN" value={form.pan || ""} onChange={(e) => update("pan", e.target.value)} />
            <Field label="Phone" value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} />
            <Field label="Email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
            <Field label="Website" value={form.website || ""} onChange={(e) => update("website", e.target.value)} />
            <Field className="sm:col-span-2" label="Registered address" value={form.registeredAddress || ""} onChange={(e) => update("registeredAddress", e.target.value)} />
            <Field label="City" value={form.city || ""} onChange={(e) => update("city", e.target.value)} />
            <Field label="State" value={form.state || ""} onChange={(e) => update("state", e.target.value)} />
            <Field label="State code" value={form.stateCode || ""} onChange={(e) => update("stateCode", e.target.value)} />
            <Field label="Pincode" value={form.pincode || ""} onChange={(e) => update("pincode", e.target.value)} />
          </div></Section>
          <Section title="Invoice settings"><div className="grid gap-4 sm:grid-cols-3">
            <Field label="Invoice title" value={form.invoiceTitle || ""} onChange={(e) => update("invoiceTitle", e.target.value)} />
            <Field label="Invoice prefix" value={form.invoicePrefix || ""} onChange={(e) => update("invoicePrefix", e.target.value)} />
            <Field label="Number format" value={form.invoiceNumberFormat || ""} onChange={(e) => update("invoiceNumberFormat", e.target.value)} />
          </div></Section>
          <Section title="Branding and assets"><div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary color" type="color" value={form.primaryColor || defaults.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} />
            <Field label="Accent color" type="color" value={form.accentColor || defaults.accentColor} onChange={(e) => update("accentColor", e.target.value)} />
            <AssetUpload label="Logo" type="logo" value={form.logoAssetUrl} onUpload={(file) => upload.mutate({ type: "logo", file })} />
            <AssetUpload label="Payment QR" type="payment-qr" value={form.paymentQrAssetUrl} onUpload={(file) => upload.mutate({ type: "payment-qr", file })} />
          </div></Section>
        </div>
        <div className="space-y-5">
          <Section title="Signature"><div className="space-y-4">
            <Toggle label="Enable signature" checked={form.signatureEnabled} onChange={(value) => update("signatureEnabled", value)} />
            <div className="flex gap-2"><Button type="button" variant={form.signatureType === "TEXT" ? "default" : "outline"} onClick={() => update("signatureType", "TEXT")}>Text</Button><Button type="button" variant={form.signatureType === "UPLOADED" ? "default" : "outline"} onClick={() => update("signatureType", "UPLOADED")}>Uploaded</Button></div>
            {form.signatureType === "TEXT" ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Signatory name" value={form.signatoryName || ""} onChange={(e) => update("signatoryName", e.target.value)} /><Field label="Designation" value={form.signatoryDesignation || ""} onChange={(e) => update("signatoryDesignation", e.target.value)} /></div> : <AssetUpload label="Signature image" type="signature" value={form.signatureAssetUrl} onUpload={(file) => upload.mutate({ type: "signature", file })} />}
          </div></Section>
          <Section title="Display options"><div className="grid gap-3">{displayOptions.map(([key, label]) => <Toggle key={key} label={label} checked={form[key]} onChange={(value) => update(key, value)} />)}</div></Section>
          <Section title="Footer"><Field label="Footer text" value={form.footerText || ""} onChange={(e) => update("footerText", e.target.value)} /></Section>
          <Button className="h-11 w-full rounded-xl bg-[#24211F] hover:bg-[#3A3530]" disabled={save.isPending || query.isLoading} onClick={() => save.mutate()}><Save className="size-4" />{save.isPending ? "Saving..." : "Save configuration"}</Button>
        </div>
      </div>}
    </div>
  </main>;
}

function Toggle({ label, checked, onChange }) {
  return <div className="flex items-center justify-between rounded-xl border border-[#EEE8E0] px-3 py-2.5 text-sm"><span>{label}</span><Switch checked={Boolean(checked)} onCheckedChange={onChange} /></div>;
}

function AssetUpload({ label, type, value, onUpload }) {
  return <div className="space-y-2"><p className="text-xs font-semibold text-[#5C554E]">{label}</p><div className="flex items-center gap-3">{value ? <img src={value} alt={`${label} preview`} className="size-14 rounded-lg border border-[#E7E0D8] object-contain p-1" /> : <div className="grid size-14 place-items-center rounded-lg bg-[#F5F1EB] text-[#B8893C]"><ImagePlus className="size-5" /></div>}<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E7E0D8] px-3 py-2 text-xs font-semibold hover:bg-[#F8F5F0]"><Upload className="size-3.5" /> Upload<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} /></label></div></div>;
}
