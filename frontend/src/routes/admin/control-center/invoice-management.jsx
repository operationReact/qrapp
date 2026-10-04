import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImagePlus, Save, Upload } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ROLE } from "@/lib/roles";
import { getInvoiceAssetPreview, getInvoiceConfiguration, saveInvoiceConfiguration, uploadInvoiceAsset } from "@/services/invoice-configuration-service";

export const Route = createFileRoute("/admin/control-center/invoice-management")({
  component: () => <RoleGuard roles={ROLE.SUPER_ADMIN}><InvoiceManagement /></RoleGuard>,
});

const defaults = {
  invoicePrefix: "BB",
  invoiceNumberFormat: "BB/{FY}/{SEQ}",
  invoiceTitle: "",
  businessName: "",
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
  footerText: "",
};

function Field({ label, className = "", ...props }) {
  return <label className={`grid gap-1.5 text-xs font-semibold text-[#5C554E] ${className}`}>
    <span>{label}</span>
    <Input className="h-10 rounded-xl border-[#E7E0D8] bg-white" {...props} />
  </label>;
}

function Section({ title, children }) {
  return <Card className="gap-4 rounded-2xl border-[#E7E0D8] bg-[#FFFEFC] py-4 shadow-[0_8px_30px_rgba(42,35,30,0.04)] sm:gap-6 sm:py-6">
    <CardHeader className="px-4 pb-1 sm:px-6 sm:pb-3"><CardTitle className="text-base text-[#24211F]">{title}</CardTitle></CardHeader>
    <CardContent className="px-4 sm:px-6">{children}</CardContent>
  </Card>;
}

function InvoiceManagement() {
  const [form, setForm] = useState(defaults);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["invoice-configuration", "global"],
    queryFn: getInvoiceConfiguration,
  });

  useEffect(() => {
    if (query.data) setForm({ ...defaults, ...query.data });
  }, [query.data]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = useMutation({
    mutationFn: () => saveInvoiceConfiguration(form),
    onSuccess: (data) => {
      setForm({ ...defaults, ...data });
      queryClient.invalidateQueries({ queryKey: ["invoice-configuration", "global"] });
      toast.success("Invoice configuration saved");
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save invoice configuration"),
  });
  const upload = useMutation({
    mutationFn: ({ type, file }) => uploadInvoiceAsset(type, file),
    onSuccess: (data, variables) => {
      const fields = {
        logo: ["logoAssetUrl", "logoAssetKey"],
        signature: ["signatureAssetUrl", "signatureAssetKey"],
        "payment-qr": ["paymentQrAssetUrl", "paymentQrAssetKey"],
      }[variables.type] || [];
      setForm((current) => fields.reduce(
        (next, field) => ({ ...next, ...(data?.[field] ? { [field]: data[field] } : {}) }),
        current,
      ));
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not upload invoice asset"),
  });

  const displayOptions = [
    ["showGstin", "Show GSTIN"], ["showFssai", "Show FSSAI"], ["showPan", "Show PAN"],
    ["showHsnSac", "Show HSN/SAC"], ["showCustomerAddress", "Show customer address"],
    ["showPaymentQr", "Show payment QR"], ["showOrderId", "Show order ID"], ["showSignature", "Show signature"],
  ];

  return <main className="min-h-screen bg-[#F8F5F0] px-3 py-4 pb-24 text-[#24211F] sm:px-4 sm:py-6 md:px-8 md:pb-8">
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8893C]">Super Admin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Invoice Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756D64]">Configure the shared seller identity, brand presentation, and invoice details used across all locations.</p>
          </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <Section title="Business details"><div className="grid gap-3 md:grid-cols-2 md:gap-4">
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
          <Section title="Invoice settings"><div className="grid gap-3 md:grid-cols-3 md:gap-4">
            <Field label="Invoice title" value={form.invoiceTitle || ""} onChange={(e) => update("invoiceTitle", e.target.value)} />
            <Field label="Invoice prefix" value={form.invoicePrefix || ""} onChange={(e) => update("invoicePrefix", e.target.value)} />
            <Field label="Number format" value={form.invoiceNumberFormat || ""} onChange={(e) => update("invoiceNumberFormat", e.target.value)} />
          </div></Section>
          <Section title="Branding and assets"><div className="grid gap-4 md:grid-cols-2">
            <Field label="Primary color" type="color" value={form.primaryColor || defaults.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} />
            <Field label="Accent color" type="color" value={form.accentColor || defaults.accentColor} onChange={(e) => update("accentColor", e.target.value)} />
            <AssetUpload label="Logo" type="logo" value={form.logoAssetUrl} onUpload={(file) => upload.mutate({ type: "logo", file })} />
            <AssetUpload label="Payment QR" type="payment-qr" value={form.paymentQrAssetUrl} onUpload={(file) => upload.mutate({ type: "payment-qr", file })} />
          </div></Section>
        </div>
        <div className="space-y-5">
          <Section title="Signature"><div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E7E0D8] bg-[#FBF8F3] p-3.5">
              <div>
                <p className="text-sm font-semibold text-[#24211F]">Show on invoice</p>
                <p className="mt-0.5 text-xs leading-5 text-[#756D64]">Add an authorised signatory block to the PDF.</p>
              </div>
              <Switch
                checked={Boolean(form.signatureEnabled)}
                onCheckedChange={(value) => update("signatureEnabled", value)}
                aria-label="Enable signature"
              />
            </div>
            <div className="rounded-2xl border border-[#E7E0D8] bg-white p-1.5">
              <div className="grid grid-cols-2 gap-1">
                {[["TEXT", "Typed signature"], ["UPLOADED", "Image signature"]].map(([type, label]) => {
                  const selected = form.signatureType === type;
                  return <button
                    key={type}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update("signatureType", type)}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold transition-colors ${selected ? "bg-[#24211F] text-white shadow-sm" : "text-[#756D64] hover:bg-[#F8F5F0]"}`}
                  >
                    {selected && <Check className="size-3.5" />}
                    {label}
                  </button>;
                })}
              </div>
            </div>
            {form.signatureType === "TEXT" ? <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <Field label="Signatory name" value={form.signatoryName || ""} placeholder="e.g. Rahul Sharma" onChange={(e) => update("signatoryName", e.target.value)} />
                <Field label="Designation" value={form.signatoryDesignation || ""} placeholder="e.g. Authorised Signatory" onChange={(e) => update("signatoryDesignation", e.target.value)} />
              </div>
              <div className="rounded-2xl border border-dashed border-[#DCCFBE] bg-[#FFFCF7] px-4 py-3 text-right">
                <p className="font-serif text-lg italic text-[#24211F]">{form.signatoryName || "Signatory name"}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8893C]">{form.signatoryDesignation || "Authorised Signatory"}</p>
              </div>
            </div> : <AssetUpload label="Signature image" type="signature" value={form.signatureAssetUrl} onUpload={(file) => upload.mutate({ type: "signature", file })} />}
          </div></Section>
          <Section title="Display options"><div className="grid gap-3">{displayOptions.map(([key, label]) => <Toggle key={key} label={label} checked={form[key]} onChange={(value) => update(key, value)} />)}</div></Section>
          <Section title="Footer"><Field label="Footer text" value={form.footerText || ""} onChange={(e) => update("footerText", e.target.value)} /></Section>
          <div className="sticky bottom-3 z-20 -mx-1 rounded-2xl bg-[#F8F5F0]/95 p-1 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0">
            <Button className="h-12 w-full rounded-xl bg-[#24211F] text-base hover:bg-[#3A3530]" disabled={save.isPending || query.isLoading} onClick={() => save.mutate()}><Save className="size-4" />{save.isPending ? "Saving..." : "Save configuration"}</Button>
          </div>
        </div>
      </div>
    </div>
  </main>;
}

function Toggle({ label, checked, onChange }) {
  return <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#EEE8E0] px-3 py-2.5 text-sm"><span className="leading-5">{label}</span><Switch checked={Boolean(checked)} onCheckedChange={onChange} /></div>;
}

function AssetUpload({ label, type, value, onUpload }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!value) {
      setPreview("");
      return undefined;
    }
    getInvoiceAssetPreview(type)
      .then((url) => {
        objectUrl = url;
        if (active) setPreview(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => {
        if (active) setPreview("");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [type, value]);

  return <div className="space-y-2"><p className="text-xs font-semibold text-[#5C554E]">{label}</p><div className="flex flex-col gap-3 sm:flex-row sm:items-center">{preview ? <img src={preview} alt={`${label} preview`} className="size-16 rounded-xl border border-[#E7E0D8] bg-white object-contain p-1" /> : <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-[#F5F1EB] text-[#B8893C]"><ImagePlus className="size-5" /></div>}<label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E7E0D8] px-3 py-2 text-xs font-semibold hover:bg-[#F8F5F0] sm:w-auto"><Upload className="size-3.5" /> Upload<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} /></label></div></div>;
}
