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
              "You can cancel from the Orders page within 1 minute of placing the order, as long as preparation has not started. After that, contact support.",
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
      "Terms for using the BRO & BRO Food Court website and location-based food ordering platform.",
    sections: [
      {
        title: "Version and acceptance",
        details: [
          { label: "Terms version", value: "2026-09" },
          { label: "Effective date", value: "24 September 2026" },
          { label: "Operator", value: companyProfile.legalName },
        ],
        paragraphs: [
          "These Terms & Conditions (Terms) govern your use of the BRO & BRO Food Court website, web application, account, menu, ordering, wallet and related services in India (Platform). The Platform is operated under the brand BRO & BRO Food Court by BRO&BRO HOSPITALITY LLP.",
          "By creating an account, placing an order, using the wallet, or otherwise using a part of the Platform, you agree to these Terms. Account registration requires a positive acceptance of these Terms and the Privacy Policy. If you do not agree, do not create an account or use the relevant service.",
        ],
      },
      {
        title: "1. Eligibility, account and security",
        bullets: [
          "You must provide truthful, current and complete information, including your mobile number, name where requested, selected food-court location and customer company.",
          "Registration uses a WhatsApp verification code and a password. Keep your password, phone and login token secure and do not share access or allow another person to place orders through your account.",
          "You are responsible for activity carried out through your account and must promptly contact support if you suspect unauthorised access or an incorrect account detail.",
          "The Platform collects optional date-of-birth and special-date information in the profile flow. The Privacy Policy explains how personal information is handled; these Terms do not repeat that policy.",
          "The registration flow does not currently perform an age verification check. You must use the Platform only if you are legally capable of agreeing to these Terms; a parent or legal guardian must supervise any use by a person who cannot legally contract.",
        ],
      },
      {
        title: "2. Locations, menu and availability",
        bullets: [
          "The Platform is configured around participating food-court locations. Your selected location and customer company help determine the services and menu available to you.",
          "Menu items are associated with a location and may be marked unavailable, hidden, deleted, pre-order-only or limited by operational inventory. An item in a cart is not a guarantee that it will remain available.",
          "Descriptions, images, vegetarian indicators, tags and prices are supplied through the operating system and may change. Images are illustrative and the prepared item may reasonably differ.",
          "Some items are prepared in-house and some may be associated with an external vendor. Vendor assignment is an operational relationship; it does not create a direct account or payment relationship between you and a vendor outside the order shown on the Platform.",
        ],
      },
      {
        title: "3. Orders and acceptance",
        bullets: [
          "You place an order by submitting the items, quantities, phone number and selected payment method shown at checkout. The server records an order with an order number and an initial status; this is not a promise that every item will be prepared or available.",
          "The Platform or the relevant food-stall operation may be unable to fulfil an order because of availability, operational capacity, location or payment status. The order status shown in the Platform is the source for the current operational state.",
          "Pre-orders are a separate flow. Only items tagged for pre-order may be scheduled, and the selected scheduled date and time are recorded for operational handling. No preparation or hand-off time is guaranteed unless expressly shown and confirmed.",
          "You must check the order number, items and amount shown or returned by the Platform and contact support promptly about an apparent error.",
        ],
      },
      {
        title: "4. Prices, taxes and offers",
        bullets: [
          "The amount calculated at checkout is based on the selling-price snapshots and any valid promotion or combo discount applied by the server. Prices and availability can change before an order is submitted.",
          "The current order calculation does not add a delivery fee and records tax as zero. This describes the present application configuration, not a promise that future orders will never include applicable taxes or charges. Any amount displayed at checkout is the amount to review before submission.",
          "Promotions, coupons, combo campaigns and milestone rewards are conditional benefits. Eligibility, validity, expiry, usage limits, stacking and discount value are determined by the applicable promotion configuration and server validation. A reward shown in the app is not a cash entitlement.",
          "No referral programme or referral benefit was identified in the current customer application. If one is introduced, its specific conditions will be shown with that programme and will form part of the applicable offer.",
        ],
      },
      {
        title: "5. Payments",
        bullets: [
          "The currently implemented checkout methods are Razorpay online payment, authenticated wallet payment, and Pay at Stall when enabled by the operator. The Platform does not currently expose a separate COD or UPI payment method; UPI availability, if any, is controlled by the Razorpay checkout and its providers.",
          "Razorpay payments are processed through Razorpay and may use the payment instruments and verification steps offered by that provider. A payment may fail, remain pending or be debited without the Platform immediately receiving confirmation.",
          "Wallet payments require an authenticated account and sufficient wallet balance. Wallet top-ups are initiated and verified through Razorpay; wallet debits for an order are recorded as successful when the server completes the debit.",
          "Pay at Stall creates an order without collecting money through the Platform and leaves the payment status pending. The participating stall’s operational instructions and the amount shown for the order govern payment at the stall.",
          "Do not retry a payment repeatedly after a debit or pending result. Keep the order number and provider reference and contact support so the transaction can be reconciled.",
        ],
      },
      {
        title: "6. Preparation, hand-off and delivery operations",
        bullets: [
          "Food preparation is performed by the relevant BRO & BRO food-court operation or an associated vendor. Those operations are responsible for preparing the selected items and updating operational order statuses.",
          "The current customer flow is location-based and does not collect a delivery address or publish a guaranteed delivery time, delivery fee or delivery service-level commitment. The Platform must not be understood as promising doorstep delivery unless a future checkout explicitly offers and confirms it.",
          "Statuses such as placed, preparing, ready, delivered and completed reflect operational updates and may be delayed or corrected. Delays can result from demand, preparation, stock, staffing, payment confirmation, technology or other circumstances.",
          "Customers are responsible for selecting the correct location, being available for the applicable collection or hand-off arrangement, and following reasonable food-court or stall instructions.",
        ],
      },
      {
        title: "7. Cancellations, refunds and order issues",
        bullets: [
          "Customers can cancel from the Orders page within 1 minute of placing the order, as long as preparation has not started. Admin and kitchen staff can cancel before the order is completed, with a recorded reason. Completed orders cannot be cancelled; raise a support request from the Orders page for any issue. Wallet and online payments are refunded automatically; pay-at-stall refunds are handled manually by the stall team.",
          "If you need to request cancellation, or receive an incorrect, missing or materially damaged item, contact support as soon as possible with the order number, payment reference and a clear description. The operator will review the order status, preparation and payment records.",
          "The current backend does not define an automatic refund schedule, refund eligibility rule, refund amount, refund destination or refund timeline. Any refund, replacement, correction or other resolution is therefore subject to case review, applicable law, the payment provider’s process and the operator’s confirmed business policy.",
          "For a failed or apparently duplicated online payment, contact support before making another payment. A bank or payment-provider debit may require reconciliation before any action can be taken.",
        ],
      },
      {
        title: "8. Customer information and permitted use",
        bullets: [
          "You may submit profile information, order information, special-date details and notes or requests in the fields provided. Do not submit unlawful, abusive, fraudulent, defamatory, infringing, dangerous or confidential third-party information.",
          "You must not misuse offers, create duplicate accounts to obtain benefits, manipulate prices or order data, reverse engineer or disrupt the Platform, bypass authentication, access another person’s data, or use the Platform for an unlawful purpose.",
          "You grant the operator permission to use information you submit only as needed to operate, support, secure and improve the relevant Platform service, subject to the Privacy Policy and applicable law.",
        ],
      },
      {
        title: "9. Responsibilities of the operator, stalls and vendors",
        paragraphs: [
          "BRO&BRO HOSPITALITY LLP operates the Platform, account, order records, payment integrations, wallet records, promotions and customer support channels. The food-court and stall operations prepare and hand over food and manage operational status updates. A menu item may be linked to an external vendor for sourcing or fulfilment. Responsibilities may overlap operationally, but the Platform cannot promise that a vendor or stall will always be available or that every menu description will be error-free.",
          "Nothing in these Terms excludes or limits a right or remedy that cannot lawfully be excluded or limited under applicable Indian law.",
        ],
      },
      {
        title: "10. Intellectual property and availability",
        bullets: [
          "The Platform software, brand, layout, text, graphics and other content are owned by or licensed to the operator or its licensors. You receive a limited, non-transferable permission to use the Platform for personal, lawful ordering and account purposes.",
          "The Platform may be changed, suspended or unavailable for maintenance, security, provider failure, connectivity, force majeure or other operational reasons. The operator does not guarantee uninterrupted access, error-free content, uninterrupted payment processing or a particular result.",
        ],
      },
      {
        title: "11. Liability, suspension and termination",
        bullets: [
          "To the extent permitted by law, the operator is not responsible for indirect, incidental, special or consequential loss, loss of data, or loss caused by a payment provider, network, vendor, stall, force majeure event or information you supplied incorrectly. This does not limit liability that cannot lawfully be limited.",
          "The operator may suspend or terminate access, cancel or decline an order, or disable a benefit where reasonably necessary for security, fraud prevention, misuse, operational reasons, non-payment or breach of these Terms. Amounts already paid will be handled subject to applicable law and the confirmed order/payment records.",
        ],
      },
      {
        title: "12. Governing law, support and changes",
        paragraphs: [
          "These Terms are governed by the laws of India. Any dispute will be handled by the courts having lawful jurisdiction, with Hyderabad, Telangana proposed as the forum because the operator’s registered address is in Hyderabad. This jurisdiction wording requires confirmation by the operator’s legal adviser before production publication.",
          `For order, account, payment or policy support, contact ${companyProfile.supportEmail} or ${companyProfile.supportPhone}. Include your name, registered phone number, order number or payment reference, and the issue. Registered / mailing address: ${companyProfile.registeredAddress}.`,
          "The operator may update these Terms by publishing a new version and effective date. Material changes should be presented for acceptance where required. Continued use after the effective date means the updated Terms apply to future use; existing orders remain subject to the Terms and order records applicable when placed, except where a change is required by law.",
        ],
      },
      {
        title: "Privacy Policy",
        paragraphs: [
          "The Privacy Policy separately explains collection, use, sharing, retention, security and rights relating to personal information. It is incorporated by reference only for those privacy matters; these Terms do not replace or restate the Privacy Policy.",
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
          "Customers can cancel within 1 minute of placing the order, before preparation begins.",
          "Admin and kitchen staff can cancel before the order is completed. Completed orders cannot be cancelled; raise a support request from the Orders page instead.",
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
