import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  useActionItems,
  useDashboard,
  useDeposits,
  useExpenses,
  useLeases,
  useRents,
  useStalls,
  useTenants,
} from "./hooks";
import { buildStallRows, buildTenantRows } from "./format";

const FoodCourtContext = createContext(null);

export function FoodCourtProvider({ foodCourt, month, setMonth, children }) {
  const foodCourtId = foodCourt?.id ?? null;
  const dashboard = useDashboard(foodCourtId, month);
  const stalls = useStalls(foodCourtId);
  const tenants = useTenants(foodCourtId);
  const leases = useLeases(foodCourtId);
  const rents = useRents(foodCourtId, month);
  const allRents = useRents(foodCourtId, null);
  const deposits = useDeposits(foodCourtId);
  const expenses = useExpenses(foodCourtId, month);
  const actions = useActionItems(foodCourtId);

  // Sheets stack so detail → edit → back returns to the detail.
  const [stack, setStack] = useState([]);
  const open = useCallback((type, props = {}) => setStack((current) => [...current, { type, props }]), []);
  const close = useCallback(() => setStack((current) => current.slice(0, -1)), []);
  const closeAll = useCallback(() => setStack([]), []);

  const stallRows = useMemo(
    () => buildStallRows({ stalls: stalls.data, leases: leases.data, tenants: tenants.data, invoices: rents.data }),
    [stalls.data, leases.data, tenants.data, rents.data],
  );
  const tenantRows = useMemo(
    () => buildTenantRows({ tenants: tenants.data, leases: leases.data, stalls: stalls.data, invoices: rents.data }),
    [tenants.data, leases.data, stalls.data, rents.data],
  );

  const value = {
    foodCourt,
    foodCourtId,
    month,
    setMonth,
    dashboard,
    stalls,
    tenants,
    leases,
    rents,
    allRents,
    deposits,
    expenses,
    actions,
    stallRows,
    tenantRows,
    sheet: stack[stack.length - 1] ?? null,
    open,
    close,
    closeAll,
  };

  return <FoodCourtContext.Provider value={value}>{children}</FoodCourtContext.Provider>;
}

export function useFc() {
  const value = useContext(FoodCourtContext);
  if (!value) throw new Error("useFc must be used inside FoodCourtProvider");
  return value;
}
