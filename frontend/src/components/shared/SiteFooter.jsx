export default function SiteFooter() {
  return (
    <footer
      aria-label="Business information"
      className="mt-auto border-t border-border/70 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="container-premium py-5 sm:py-6">
        <p className="text-sm font-medium leading-6 text-foreground">
          BRO &amp; BRO Food Court
        </p>
        <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
          Operated by{" "}
          <span className="font-semibold tracking-wide text-foreground">
            BRO&amp;BRO HOSPITALITY LLP
          </span>
          .
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          © 2026 BRO&amp;BRO HOSPITALITY LLP. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
