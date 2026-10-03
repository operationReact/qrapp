export const foodCourtKeys = {
  all: ["food-court"],
  list: () => [...foodCourtKeys.all, "list"],
  summary: (id, month) => [...foodCourtKeys.all, "summary", id, month],
  stalls: (id) => [...foodCourtKeys.all, "stalls", id],
  tenants: (id) => [...foodCourtKeys.all, "tenants", id],
  leases: (id) => [...foodCourtKeys.all, "leases", id],
  rents: (id, month) => [...foodCourtKeys.all, "rents", id, month],
  deposits: (id) => [...foodCourtKeys.all, "deposits", id],
  expenses: (id, month) => [...foodCourtKeys.all, "expenses", id, month],
  actionItems: (id) => [...foodCourtKeys.all, "action-items", id],
};
