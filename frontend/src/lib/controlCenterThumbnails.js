/**
 * Control Center Premium 3D Thumbnail Configuration
 * 
 * Centralized mapping for colorful 3D miniature illustration thumbnails.
 * Each thumbnail represents the dashboard function with a small 3D rendered scene.
 * 
 * Note: These can be SVG, WebP, or PNG. SVG is preferred for scalability.
 */

export const CONTROL_CENTER_THUMBNAILS = {
  users: {
    src: "/assets/control-center/users-thumbnail.svg",
    alt: "",
  },
  locations: {
    src: "/assets/control-center/locations-thumbnail.svg",
    alt: "",
  },
  customerCompanies: {
    src: "/assets/control-center/customer-companies-thumbnail.svg",
    alt: "",
  },
  vendors: {
    src: "/assets/control-center/vendors-thumbnail.svg",
    alt: "",
  },
  access: {
    src: "/assets/control-center/access-thumbnail.svg",
    alt: "",
  },
  payments: {
    src: "/assets/control-center/payment-management-thumbnail.svg",
    alt: "",
  },
  partyOrders: {
    src: "/assets/control-center/party-orders-thumbnail.svg",
    alt: "",
  },
  hallOfHappiness: {
    src: "/assets/control-center/hall-of-happiness-thumbnail.svg",
    alt: "",
  },
};

export function getThumbnailAsset(theme) {
  return CONTROL_CENTER_THUMBNAILS[theme] || CONTROL_CENTER_THUMBNAILS.users;
}
