/**
 * Control Center 3D Icon Configuration
 * 
 * Centralized mapping for premium 3D dashboard icons.
 * Includes graceful fallback to existing Lucide icons if 3D assets fail to load.
 */

import {
  Users,
  Building2,
  UsersRound,
  Store,
  KeyRound,
  CreditCard,
  CalendarDays,
  Heart,
} from "lucide-react";

export const CONTROL_CENTER_ICON_ASSETS = {
  users: {
    webp: "/assets/control-center-icons/users-3d.webp",
    png: "/assets/control-center-icons/users-3d.png",
    fallback: Users,
    alt: "Users",
  },
  locations: {
    webp: "/assets/control-center-icons/locations-3d.webp",
    png: "/assets/control-center-icons/locations-3d.png",
    fallback: Building2,
    alt: "Locations",
  },
  customerCompanies: {
    webp: "/assets/control-center-icons/customer-companies-3d.webp",
    png: "/assets/control-center-icons/customer-companies-3d.png",
    fallback: UsersRound,
    alt: "Customer Companies",
  },
  vendors: {
    webp: "/assets/control-center-icons/vendors-3d.webp",
    png: "/assets/control-center-icons/vendors-3d.png",
    fallback: Store,
    alt: "Vendors",
  },
  access: {
    webp: "/assets/control-center-icons/access-3d.webp",
    png: "/assets/control-center-icons/access-3d.png",
    fallback: KeyRound,
    alt: "Access Management",
  },
  payments: {
    webp: "/assets/control-center-icons/payments-3d.webp",
    png: "/assets/control-center-icons/payments-3d.png",
    fallback: CreditCard,
    alt: "Payments",
  },
  partyOrders: {
    webp: "/assets/control-center-icons/party-orders-3d.webp",
    png: "/assets/control-center-icons/party-orders-3d.png",
    fallback: CalendarDays,
    alt: "Party Orders",
  },
  hallOfHappiness: {
    webp: "/assets/control-center-icons/hall-of-happiness-3d.webp",
    png: "/assets/control-center-icons/hall-of-happiness-3d.png",
    fallback: Heart,
    alt: "Hall of Happiness",
  },
};

/**
 * Get icon configuration by theme key
 */
export function getControlCenterIcon(theme) {
  return CONTROL_CENTER_ICON_ASSETS[theme] || CONTROL_CENTER_ICON_ASSETS.users;
}
