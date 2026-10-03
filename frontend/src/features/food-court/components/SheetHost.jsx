import { useFc } from "../context";
import {
  LeaseDetailSheet,
  LeaseFormSheet,
  LeaseTerminateSheet,
  StallDetailSheet,
  StallFormSheet,
  TenantDetailSheet,
  TenantFormSheet,
} from "./CoreSheets";
import {
  DepositDetailSheet,
  DepositFormSheet,
  DepositSettleSheet,
  ExpenseFormSheet,
  RentAdjustSheet,
  RentDetailSheet,
  RentPaymentSheet,
} from "./FinanceSheets";
import { ActionFormSheet, FoodCourtFormSheet, LandlordFormSheet, PropertyLeaseFormSheet } from "./OpsSheets";

const SHEETS = {
  "stall-detail": StallDetailSheet,
  "stall-form": StallFormSheet,
  "tenant-detail": TenantDetailSheet,
  "tenant-form": TenantFormSheet,
  "lease-detail": LeaseDetailSheet,
  "lease-form": LeaseFormSheet,
  "lease-terminate": LeaseTerminateSheet,
  "rent-detail": RentDetailSheet,
  "rent-payment": RentPaymentSheet,
  "rent-adjust": RentAdjustSheet,
  "deposit-detail": DepositDetailSheet,
  "deposit-form": DepositFormSheet,
  "deposit-settle": DepositSettleSheet,
  "expense-form": ExpenseFormSheet,
  "action-form": ActionFormSheet,
  "food-court-form": FoodCourtFormSheet,
  "landlord-form": LandlordFormSheet,
  "property-lease-form": PropertyLeaseFormSheet,
};

export function CoreSheetHost() {
  const { sheet } = useFc();
  if (!sheet) return null;
  const Component = SHEETS[sheet.type];
  // Remount per stack entry so each sheet starts with fresh form state.
  return Component ? <Component key={`${sheet.type}-${JSON.stringify(Object.keys(sheet.props))}-${sheet.props.stallId ?? sheet.props.tenantId ?? sheet.props.leaseId ?? sheet.props.invoiceId ?? sheet.props.depositId ?? sheet.props.itemId ?? sheet.props.expenseId ?? "new"}`} {...sheet.props} /> : null;
}
