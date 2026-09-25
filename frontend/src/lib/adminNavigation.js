import {
  BowlFoodIcon, CalendarCheckIcon, ChartBarIcon, ChartLineUpIcon, CubeIcon,
  ForkKnifeIcon, KeyIcon, LightningIcon, ListPlusIcon, MagicWandIcon,
  QueueIcon, ShieldCheckIcon, SlidersIcon, SparkleIcon, TerminalWindowIcon,
  TicketIcon, TrophyIcon, UsersThreeIcon, UserCircleIcon, ShoppingCartSimpleIcon,
  StorefrontIcon,
  ConfettiIcon,
} from "@phosphor-icons/react";
import { ROLE } from "./roles";

export const ADMIN_NAVIGATION = [
  { section: "Control", items: [
    { to: "/admin/control-center", label: "Control Center", icon: ShieldCheckIcon, roles: [ROLE.SUPER_ADMIN] },
  ] },
  { section: "Workspace", items: [{ to: "/admin", label: "Dashboard", roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] }] },
  { section: "Menu", items: [
    { to: "/admin/menu", label: "Menu Items", icon: BowlFoodIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
    { to: "/admin/combos", label: "Combos", icon: CubeIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/classification", label: "Recommendation Setup", icon: ForkKnifeIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/combo-campaigns", label: "BYOC Campaigns", icon: SparkleIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
  ] },
  { section: "Operations", items: [
    { to: "/admin/vendors", label: "Vendor Management", icon: StorefrontIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
    { to: "/admin/kitchen-queue", label: "Kitchen Queue", icon: QueueIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER, ROLE.KITCHEN_STAFF] },
    { to: "/admin/party-orders", label: "Party Orders", icon: UsersThreeIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
    { to: "/admin/hall-of-happiness", label: "Hall of Happiness", icon: ConfettiIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
    { to: "/admin/pre-orders", label: "Pre-Orders", icon: CalendarCheckIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
  ] },
  { section: "Offers", items: [
    { to: "/admin/promotions", label: "Promotions", icon: TicketIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
    { to: "/admin/milestones", label: "Milestones", icon: TrophyIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
  ] },
  { section: "Growth Tools", items: [
    { to: "/admin/item-recommendations", label: "Item Pairings", icon: ListPlusIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/auto-suggestions", label: "Auto Suggestions", icon: MagicWandIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/upsell-rules", label: "Upsell Rules", icon: LightningIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/category-pairings", label: "Category Pairings", icon: KeyIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
  ] },
  { section: "Analytics", items: [
    { to: "/admin/analytics", label: "Overview", icon: ChartLineUpIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/analytics/sales", label: "Sales", icon: ChartBarIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/analytics/orders", label: "Orders", icon: ShoppingCartSimpleIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/analytics/menu", label: "Menu", icon: ForkKnifeIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/analytics/users", label: "Users", icon: UserCircleIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
  ] },
  { section: "System", items: [
    { to: "/admin/global-controls", label: "Settings", icon: SlidersIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN] },
    { to: "/admin/ops-center", label: "Operations Center", icon: TerminalWindowIcon, roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
  ] },
];
