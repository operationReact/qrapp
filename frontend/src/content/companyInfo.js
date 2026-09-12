export const companyProfile = {
  brandName: "BRO & BRO Food Court",
  legalName: "BRO&BRO HOSPITALITY LLP",
  llpin: "ADA-6061",
  email: "admin@broandbro.in",
  phone: "9247583407",
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  registeredAddress:
    "G-1 Satish Residency, Vasanth Nagar Colony, Pragatinagar, Hyderabad - 500090, Telangana, India",
  registeredAddressLines: [
    "G-1 Satish Residency,",
    "Vasanth Nagar Colony,",
    "Pragatinagar,",
    "Hyderabad - 500090,",
    "Telangana, India",
  ],
  fssaiNumber: "23625029005070",
  businessDescription:
    "Technology-enabled food destinations for corporate communities.",
  supportEmail: "admin@broandbro.in",
  supportPhone: "9247583407",
  grievanceEmail: "admin@broandbro.in",
  grievancePhone: "9247583407",
};

export const footerSections = [
  {
    title: "Company",
    items: [
      { label: "About Us", to: "/about-us" },
      { label: "Contact Us", to: "/contact-us" },
    ],
  },
  {
    title: "Customer",
    items: [
      { label: "Help & Support", to: "/help-support" },
      { label: "FAQs", to: "/faqs" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Terms & Conditions", to: "/terms-and-conditions" },
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Refund & Cancellation Policy", to: "/refund-cancellation-policy" },
      { label: "Grievance Redressal", to: "/grievance-redressal" },
    ],
  },
  {
    title: "Food & Safety",
    items: [
      { label: "Food Safety", to: "/food-safety" },
      { label: "FSSAI Information", to: "/fssai-information" },
    ],
  },
  {
    title: "Business",
    items: [{ label: "Business Information", to: "/business-information" }],
  },
];

const siteOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
};

const absoluteUrl = (path) => {
  const origin = siteOrigin();
  return origin ? new URL(path, origin).toString() : path;
};

export const ldJson = (value) => ({
  type: "application/ld+json",
  children: JSON.stringify(value),
});

export const buildBreadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const buildOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": ["Organization", "FoodEstablishment"],
  name: companyProfile.brandName,
  legalName: companyProfile.legalName,
  url: absoluteUrl("/"),
  description: companyProfile.businessDescription,
  email: companyProfile.email,
  telephone: companyProfile.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "G-1 Satish Residency, Vasanth Nagar Colony, Pragatinagar",
    addressLocality: companyProfile.city,
    addressRegion: companyProfile.state,
    addressCountry: companyProfile.country,
    postalCode: "500090",
  },
});

export const buildWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: companyProfile.brandName,
  url: absoluteUrl("/"),
});

export const buildPageHead = ({ title, description, path, breadcrumbs, schemas = [] }) => {
  const meta = [
    { title: `${title} | BRO & BRO Food Court` },
    { name: "description", content: description },
    { name: "robots", content: "index,follow" },
    { property: "og:title", content: `${title} | BRO & BRO Food Court` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: `${title} | BRO & BRO Food Court` },
    { name: "twitter:description", content: description },
  ];

  const links = siteOrigin()
    ? [{ rel: "canonical", href: absoluteUrl(path) }]
    : [];

  const breadcrumbItems =
    breadcrumbs || [{ name: "Home", path: "/" }, { name: title, path }];

  return {
    meta: [
      ...meta,
      { "script:ld+json": buildOrganizationSchema() },
      { "script:ld+json": buildBreadcrumbSchema(breadcrumbItems) },
      ...schemas.map((schema) => ({ "script:ld+json": schema })),
    ],
    links,
  };
};

export const companyInfoPages = {
  aboutUs: {
    badge: "Company",
    title: "About Us",
    description:
      "Learn how BRO & BRO Food Court serves corporate communities with food-court experiences and digital ordering.",
    sections: [
      {
        title: "Who we are",
        paragraphs: [
          "BRO & BRO Food Court is the consumer-facing food brand of BRO&BRO HOSPITALITY LLP.",
          "The business combines physical food-court operations with a digital ordering experience designed for corporate communities.",
        ],
      },
      {
        title: "Current business model",
        bullets: [
          "Physical food destinations inside or around corporate environments.",
          "Food and beverage ordering through the existing web application.",
          "A brand experience designed around convenience, speed, and consistency.",
        ],
      },
      {
        title: "Growth vision",
        bullets: [
          "Strengthen the current food-court locations.",
          "Replicate the model across nearby corporate buildings.",
          "Build a localized network of food destinations over time.",
        ],
      },
    ],
  },
  contactUs: {
    badge: "Company",
    title: "Contact Us",
    description:
      "Official business contact information for BRO & BRO Food Court and BRO&BRO HOSPITALITY LLP.",
    sections: [
      {
        title: "Business contact",
        details: [
          { label: "Brand", value: companyProfile.brandName },
          { label: "Legal business name", value: companyProfile.legalName },
          { label: "Email", value: companyProfile.email, href: `mailto:${companyProfile.email}` },
          { label: "Phone", value: companyProfile.phone, href: `tel:+91${companyProfile.phone}` },
        ],
      },
      {
        title: "Location",
        details: [
          { label: "Business location", value: `${companyProfile.city}, ${companyProfile.state}, ${companyProfile.country}` },
          { label: "Registered / mailing address", value: companyProfile.registeredAddressLines },
        ],
      },
    ],
  },
  helpSupport: {
    badge: "Customer",
    title: "Help & Support",
    description:
      "Guidance for orders, payments, accounts, and general support on the BRO & BRO Food Court platform.",
    sections: [
      {
        title: "Support categories",
        bullets: [
          "Orders: how to place, review, and complete an order.",
          "Payments: what to do if a payment fails or a charge is duplicated.",
          "Account: login, profile, and password-related help.",
          "Food or order issues: what to do if an item is missing or incorrect.",
          "General support: business information, policies, and website help.",
        ],
      },
      {
        title: "Support contact",
        details: [
          { label: "Email", value: companyProfile.supportEmail, href: `mailto:${companyProfile.supportEmail}` },
          { label: "Phone", value: companyProfile.supportPhone, href: `tel:+91${companyProfile.supportPhone}` },
        ],
      },
    ],
  },
  faqs: {
    badge: "Customer",
    title: "FAQs",
    description:
      "Frequently asked questions about ordering, payments, support, and business information.",
    sections: [
      {
        title: "Frequently asked questions",
        faqs: [
          {
            question: "How do I place an order?",
            answer:
              "Browse the menu, add items to your cart, and complete checkout through the existing ordering flow.",
          },
          {
            question: "How do I add an item to my cart?",
            answer:
              "Open a menu item and use the add-to-cart controls already provided in the current UI.",
          },
          {
            question: "How do I modify my cart?",
            answer:
              "Use the quantity controls or remove items directly from the cart view before checkout.",
          },
          {
            question: "How can I complete payment?",
            answer:
              "Use the payment options shown in checkout. The exact options are determined by the existing application flow.",
          },
          {
            question: "What happens if my payment fails?",
            answer:
              "Retry the payment after checking your network, balance, or selected payment method. If the issue continues, contact support.",
          },
          {
            question: "How can I cancel an order?",
            answer:
              "Cancellation depends on the order stage. Contact support as early as possible after placing the order.",
          },
          {
            question: "How can I contact support?",
            answer:
              `Use ${companyProfile.supportEmail} or ${companyProfile.supportPhone}.`,
          },
          {
            question: "Where can I find food-safety information?",
            answer:
              "Open the Food Safety or FSSAI Information page from the footer.",
          },
          {
            question: "Where can I find the FSSAI number?",
            answer:
              `It is shown on the Food Safety, FSSAI Information, and Business Information pages as FSSAI License / Registration No. ${companyProfile.fssaiNumber}.`,
          },
        ],
      },
    ],
  },
  terms: {
    badge: "Legal",
    title: "Terms & Conditions",
    description:
      "Terms for using the BRO & BRO Food Court website and ordering platform.",
    sections: [
      {
        title: "Introduction",
        paragraphs: [
          "These terms govern use of the BRO & BRO Food Court website and related ordering services.",
          "By using the site, you agree to the terms that apply to menu browsing, ordering, payments, and account use.",
        ],
      },
      {
        title: "About BRO & BRO",
        paragraphs: [
          "BRO & BRO Food Court is the consumer-facing food brand operated by BRO&BRO HOSPITALITY LLP.",
        ],
      },
      {
        title: "Use of the website",
        bullets: [
          "Provide accurate information when placing an order or updating your account.",
          "Do not misuse the website, abuse promotions, or attempt unauthorized access.",
          "Respect item availability, pricing, and operational limits shown in the application.",
        ],
      },
      {
        title: "Orders, payments, refunds, and changes",
        bullets: [
          "Orders are accepted only when successfully processed by the application and its payment flow.",
          "Refunds and cancellations follow the published refund and cancellation policy.",
          "Prices, menu items, and availability may change without prior notice.",
        ],
      },
      {
        title: "Contact information",
        paragraphs: [
          `Email: ${companyProfile.email}`,
          `Phone: ${companyProfile.phone}`,
        ],
      },
    ],
  },
  privacy: {
    badge: "Legal",
    title: "Privacy Policy",
    description:
      "How the BRO & BRO Food Court website handles customer and account information.",
    sections: [
      {
        title: "Information collected",
        bullets: [
          "Account information such as name and phone number.",
          "Order details entered during checkout.",
          "Payment-related information handled through the existing payment flow.",
          "Device and browser information used by the application and its services.",
        ],
      },
      {
        title: "How information is used",
        bullets: [
          "To create and manage customer accounts.",
          "To process and support orders and payments.",
          "To provide customer support and maintain site security.",
        ],
      },
      {
        title: "Sharing and retention",
        bullets: [
          "Information may be shared with service providers only as needed to run the website and process orders.",
          "We keep data only as long as needed for the operational and legal purposes of the business.",
        ],
      },
      {
        title: "Contact",
        details: [
          { label: "Email", value: companyProfile.email, href: `mailto:${companyProfile.email}` },
          { label: "Phone", value: companyProfile.phone, href: `tel:+91${companyProfile.phone}` },
        ],
      },
    ],
  },
  refundCancellation: {
    badge: "Legal",
    title: "Refund & Cancellation Policy",
    description:
      "Refund and cancellation guidance for the current BRO & BRO Food Court ordering model.",
    sections: [
      {
        title: "Order cancellation",
        bullets: [
          "Orders can usually be cancelled only before preparation begins.",
          "Once preparation starts, cancellation may no longer be possible.",
          "If payment was taken but the order was not created, contact support immediately.",
        ],
      },
      {
        title: "Refund situations",
        bullets: [
          "Duplicate payment.",
          "Payment failure with a successful debit.",
          "Incorrect or missing order items reported promptly.",
          "Food quality concerns that can be verified by the business.",
        ],
      },
      {
        title: "Support",
        details: [
          { label: "Email", value: companyProfile.email, href: `mailto:${companyProfile.email}` },
          { label: "Phone", value: companyProfile.phone, href: `tel:+91${companyProfile.phone}` },
        ],
        paragraphs: [
          "Refund processing depends on the payment method and the status of the order in the system.",
        ],
      },
    ],
  },
  foodSafety: {
    badge: "Food & Safety",
    title: "Food Safety",
    description:
      "Food safety, hygiene, and FSSAI information for the BRO & BRO Food Court business.",
    sections: [
      {
        title: "Food safety commitment",
        bullets: [
          "Food is handled and prepared with appropriate hygiene and care.",
          "Operational practices should support safe preparation and service.",
          "Customers should review ingredients and alert the business about concerns.",
        ],
      },
      {
        title: "FSSAI license / registration",
        paragraphs: [
          `FSSAI License / Registration No. ${companyProfile.fssaiNumber}`,
          "You can verify the licence through the official FoSCoS / FSSAI verification facility.",
        ],
        links: [
          {
            label: "Official FoSCoS portal",
            href: "https://foscos.fssai.gov.in/",
          },
        ],
      },
    ],
  },
  fssai: {
    badge: "Food & Safety",
    title: "FSSAI Information",
    description:
      "Official food-business licence / registration information associated with BRO&BRO HOSPITALITY LLP.",
    sections: [
      {
        title: "Licence information",
        details: [
          { label: "Legal business name", value: companyProfile.legalName },
          { label: "FSSAI License / Registration No.", value: companyProfile.fssaiNumber },
          { label: "Business location", value: `${companyProfile.city}, ${companyProfile.state}, ${companyProfile.country}` },
        ],
      },
      {
        title: "Verification",
        paragraphs: [
          "This number should be verified through the official FSSAI / FoSCoS verification facility.",
        ],
        links: [
          {
            label: "Verify on FoSCoS",
            href: "https://foscos.fssai.gov.in/",
          },
        ],
      },
    ],
  },
  businessInfo: {
    badge: "Business",
    title: "Business Information",
    description:
      "The official business identity and contact information for BRO & BRO Food Court.",
    sections: [
      {
        title: "Identity",
        details: [
          { label: "Brand name", value: companyProfile.brandName },
          { label: "Legal business name", value: companyProfile.legalName },
          { label: "LLPIN", value: companyProfile.llpin },
          { label: "Business location", value: `${companyProfile.city}, ${companyProfile.state}, ${companyProfile.country}` },
        ],
      },
      {
        title: "Registered / mailing address",
        paragraphs: companyProfile.registeredAddressLines,
      },
      {
        title: "Business contact",
        details: [
          { label: "Email", value: companyProfile.email, href: `mailto:${companyProfile.email}` },
          { label: "Phone", value: companyProfile.phone, href: `tel:+91${companyProfile.phone}` },
          { label: "FSSAI License / Registration No.", value: companyProfile.fssaiNumber },
        ],
      },
      {
        title: "Business summary",
        paragraphs: [
          "Bro & Bro Food Court is a consumer-facing food brand operated by BRO&BRO HOSPITALITY LLP.",
          companyProfile.businessDescription,
        ],
      },
    ],
  },
  grievance: {
    badge: "Legal",
    title: "Grievance Redressal",
    description:
      "How customers can raise formal issues with BRO & BRO Food Court.",
    sections: [
      {
        title: "What constitutes a grievance",
        bullets: [
          "Missing or incorrect order items.",
          "Payment issues or duplicate charges.",
          "Order-related complaints that need formal review.",
          "Policy or website issues that need attention.",
        ],
      },
      {
        title: "How to submit a grievance",
        details: [
          { label: "Email", value: companyProfile.grievanceEmail, href: `mailto:${companyProfile.grievanceEmail}` },
          { label: "Phone", value: companyProfile.grievancePhone, href: `tel:+91${companyProfile.grievancePhone}` },
        ],
        bullets: [
          "Include your order details, contact number, and a clear description of the issue.",
        ],
      },
      {
        title: "What to include",
        bullets: [
          "Your name and phone number.",
          "Order number or payment reference.",
          "A clear description of the issue and the desired resolution.",
        ],
      },
    ],
  },
};
