import { useEffect, useState } from "react";
import { apiClient } from "@/services";
import { updateCurrentUser } from "@/services/auth-service";
import { validateLocationCompanySelection } from "@/lib/authRegistrationFlow";
import { extractApiError } from "@/lib/apiError";
import { Button } from "@/components/ui/button";

export default function RequiredWorkplaceSetup({ user, onComplete, onSignOut }) {
  const [locationId, setLocationId] = useState(user.defaultLocation?.active === false ? "" : String(user.defaultLocation?.id || ""));
  const [companyId, setCompanyId] = useState("");
  const [locations, setLocations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingLocations(true);
    apiClient.get("/api/locations/public").then(({data}) => {
      if (!active) return;
      const items = Array.isArray(data) ? data : (data?.content || data?.data || data?.locations || []);
      setLocations(items.filter(item => item.active !== false && item.isActive !== false));
    }).catch(() => { if (active) setError("Unable to load food courts. Please try again."); })
      .finally(() => { if (active) setLoadingLocations(false); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    let active = true;
    setCompanies([]);
    setCompanyId("");
    if (!locationId) { setLoadingCompanies(false); return; }
    setLoadingCompanies(true);
    apiClient.get("/api/locations/" + encodeURIComponent(locationId) + "/customer-companies")
      .then(({data}) => { if (active) setCompanies(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setError("Unable to load companies. Please try again."); })
      .finally(() => { if (active) setLoadingCompanies(false); });
    return () => { active = false; };
  }, [locationId, retry]);

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateLocationCompanySelection({ locationId, companyId, locations, companies });
    if (validation) { setError(validation); return; }
    setSaving(true); setError("");
    try {
      const profile = await updateCurrentUser({ defaultLocationId: Number(locationId), customerCompanyId: Number(companyId) });
      if (!profile?.defaultLocation?.id || !profile?.customerCompany?.id) throw new Error("Incomplete workplace profile");
      localStorage.setItem("active-location", JSON.stringify({ ...profile.defaultLocation, selectedByUser: true }));
      onComplete(profile);
    } catch (err) { setError(extractApiError(err, "Could not save your workplace. Please try again.")); }
    finally { setSaving(false); }
  };
  return <main className="auth-register-page flex w-full items-center justify-center">
    <div className="w-full max-w-md">
      <div className="auth-register-topbar"><img src="/bro-logo.png" alt="Bro & Bro" className="auth-register-logo" /><button type="button" className="auth-inline-retry" onClick={onSignOut}>Sign out</button></div>
      <section className="auth-register-panel">
        <div className="auth-register-heading"><span className="auth-register-eyebrow">YOUR WORKPLACE</span><h1>Complete your profile</h1><p>Choose your default food court and company to see the right menu and offers.</p></div>
        {error && <div className="auth-form-error" role="alert">{error} <button type="button" className="auth-inline-retry" onClick={() => {setError("");setRetry(n=>n+1);}}>Try again</button></div>}
        <form className="auth-register-form" onSubmit={submit}>
          <label htmlFor="required-location" className="font-medium">Default location</label>
          <select className="auth-workplace-select" id="required-location" required disabled={loadingLocations || saving} value={locationId} onChange={e=>{setLocationId(e.target.value);setCompanyId("");setError("");}}>
            <option value="">{loadingLocations ? "Loading locations..." : "Choose your location"}</option>
            {locations.map(item=><option key={item.id} value={String(item.id)}>{item.name || item.title}</option>)}
          </select>
          <label htmlFor="required-company" className="font-medium">Company</label>
          <select className="auth-workplace-select" id="required-company" required disabled={!locationId || loadingCompanies || saving} value={companyId} onChange={e=>setCompanyId(e.target.value)}>
            <option value="">{loadingCompanies ? "Loading companies..." : "Choose your company"}</option>
            {companies.map(item=><option key={item.id} value={String(item.id)}>{item.name}</option>)}
          </select>
          {locationId && !loadingCompanies && companies.length===0 && <p className="auth-field-hint">No companies are available for this location. Choose another location or contact Bro & Bro.</p>}
          <Button type="submit" className="auth-primary-action" disabled={saving || loadingLocations || loadingCompanies || !locationId || !companyId}>{saving ? "Saving..." : "Save and continue"}</Button>
        </form>
      </section>
    </div>
  </main>;
}
