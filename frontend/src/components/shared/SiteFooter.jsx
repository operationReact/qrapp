import { Link } from "@tanstack/react-router";
import { footerSections, companyProfile } from "@/content/companyInfo";
import { Separator } from "@/components/ui/separator";

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

export default function SiteFooter() {
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
