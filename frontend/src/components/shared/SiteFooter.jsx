import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { footerSections, companyProfile } from "@/content/companyInfo";
import { Separator } from "@/components/ui/separator";
import {
  CaretDownIcon,
  EnvelopeSimpleIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";

function FooterLinkList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label}>
          <Link
            to={item.to}
            className="text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FooterSection({ title, items }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
        {title}
      </h3>
      <FooterLinkList items={items} />
    </div>
  );
}

function MetaBlock({ label, children }) {
  return (
    <div className="space-y-0.5 text-sm leading-6">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

function MobileFooterAccordion({ section, isOpen, onToggle, index }) {
  const contentId = `mobile-footer-section-${index}`;

  return (
    <div className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span>{section.title}</span>
        <CaretDownIcon
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>
      <div
        id={contentId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 pb-2">
            {section.items.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className="block py-1 text-[13px] leading-5 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MobileSiteFooter() {
  const [openSection, setOpenSection] = useState(null);
  const sectionTitles = {
    Customer: "Customer Support",
    Legal: "Legal & Policies",
  };

  return (
    <footer
      aria-label="Mobile business information"
      className="border-t border-border/70 bg-card/95 pb-[calc(var(--app-mobile-menu-height)+var(--app-safe-bottom)+1rem)] backdrop-blur supports-[backdrop-filter]:bg-card/85"
    >
      <div className="w-full px-5 py-6">
        <section aria-labelledby="mobile-footer-brand" className="space-y-3">
          <div className="flex items-center gap-3">
            <img
              src="/bro-logo.png"
              alt="BRO & BRO Food Court"
              className="size-11 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <h2
                id="mobile-footer-brand"
                className="text-[17px] font-bold leading-5 tracking-tight text-foreground"
              >
                BRO &amp; BRO
              </h2>
              <p className="text-xs text-muted-foreground">Food Court</p>
            </div>
          </div>
          <p className="max-w-[320px] text-[13px] leading-5 text-muted-foreground">
            {companyProfile.businessDescription}
          </p>
        </section>

        <section
          aria-label="Contact information"
          className="mt-5 space-y-2 border-y border-border/70 py-4"
        >
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              companyProfile.registeredAddress,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-primary"
          >
            <MapPinIcon className="size-4 shrink-0 text-primary" />
            <span>{companyProfile.city}, {companyProfile.state}</span>
          </a>
          <a
            href={`mailto:${companyProfile.email}`}
            className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-primary"
          >
            <EnvelopeSimpleIcon className="size-4 shrink-0 text-primary" />
            <span className="truncate">{companyProfile.email}</span>
          </a>
          <a
            href={`tel:+91${companyProfile.phone}`}
            className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-primary"
          >
            <PhoneIcon className="size-4 shrink-0 text-primary" />
            <span>{companyProfile.phone}</span>
          </a>
        </section>

        <nav aria-label="Footer links" className="mt-3">
          {footerSections.map((section, index) => (
            <MobileFooterAccordion
              key={section.title}
              section={{
                ...section,
                title: sectionTitles[section.title] || section.title,
              }}
              index={index}
              isOpen={openSection === index}
              onToggle={() =>
                setOpenSection((current) => (current === index ? null : index))
              }
            />
          ))}
        </nav>

        <section
          aria-label="Food safety trust information"
          className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5"
        >
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground">
              FSSAI Registered
            </p>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Registration No. {companyProfile.fssaiNumber}
            </p>
          </div>
          <Link
            to="/fssai-information"
            className="ml-auto shrink-0 text-[11px] font-semibold text-primary"
          >
            Details
          </Link>
        </section>

        <div className="mt-5 border-t border-border/70 pt-3 text-center">
          <p className="text-[11px] text-muted-foreground">
            © 2026 BRO&amp;BRO HOSPITALITY LLP
          </p>
          <p className="mt-1 flex flex-wrap justify-center gap-x-2 text-[11px] text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-primary">
              Privacy
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/terms-and-conditions" className="hover:text-primary">
              Terms
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/refund-cancellation-policy" className="hover:text-primary">
              Refund Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function DesktopSiteFooter() {
  return (
    <footer
      aria-label="Business information"
      className="mt-auto border-t border-border/70 bg-card/95 pb-[calc(var(--app-mobile-menu-height)+var(--app-safe-bottom)+1rem)] backdrop-blur supports-[backdrop-filter]:bg-card/85 md:pb-8"
    >
      <div className="container-premium py-7 sm:py-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(18rem,1fr)_minmax(0,1.6fr)]">
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <img
                src="/bro-logo.png"
                alt="BRO & BRO Food Court"
                className="size-12 shrink-0 rounded-xl object-cover"
              />
              <div className="space-y-2">
                <p className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  BRO &amp; BRO Food Court
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  A brand of{" "}
                  <span className="font-semibold text-foreground">
                    BRO&amp;BRO HOSPITALITY LLP
                  </span>
                  .
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {companyProfile.businessDescription}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MetaBlock label="Business identity">
                <div>BRO&amp;BRO HOSPITALITY LLP</div>
                <div>LLPIN: {companyProfile.llpin}</div>
              </MetaBlock>
              <MetaBlock label="Location">
                <div>
                  {companyProfile.city}, {companyProfile.state}, {companyProfile.country}
                </div>
                <div>FSSAI License / Registration No. {companyProfile.fssaiNumber}</div>
              </MetaBlock>
              <MetaBlock label="Contact">
                <a
                  href={`mailto:${companyProfile.email}`}
                  className="block transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                >
                  {companyProfile.email}
                </a>
                <a
                  href={`tel:+91${companyProfile.phone}`}
                  className="block transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                >
                  {companyProfile.phone}
                </a>
              </MetaBlock>
            </div>
          </section>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 xl:grid-cols-5">
            {footerSections.map((section) => (
              <FooterSection key={section.title} {...section} />
            ))}
          </nav>
        </div>

        <Separator className="my-6 bg-border/70" />

        <div className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 BRO&amp;BRO HOSPITALITY LLP. All rights reserved.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link to="/privacy-policy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-foreground">
              Terms &amp; Conditions
            </Link>
            <Link to="/refund-cancellation-policy" className="hover:text-foreground">
              Refund &amp; Cancellation Policy
            </Link>
            <Link to="/grievance-redressal" className="hover:text-foreground">
              Grievance Redressal
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function SiteFooter() {
  return (
    <>
      <div className="md:hidden">
        <MobileSiteFooter />
      </div>
      <div className="hidden md:block">
        <DesktopSiteFooter />
      </div>
    </>
  );
}
