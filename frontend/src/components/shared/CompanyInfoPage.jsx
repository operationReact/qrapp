import { Link } from "@tanstack/react-router";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function SectionText({ paragraphs = [] }) {
  if (!paragraphs.length) return null;

  return (
    <div className="space-y-3 text-sm leading-6 text-muted-foreground">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function SectionList({ bullets = [] }) {
  if (!bullets.length) return null;

  return (
    <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
      {bullets.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionDetails({ details = [] }) {
  if (!details.length) return null;

  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {details.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border/70 bg-background/60 p-4"
        >
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm leading-6 text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionLinks({ links = [] }) {
  if (!links.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-9 px-3 text-sm",
          )}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

function SectionFaqs({ faqs = [] }) {
  if (!faqs.length) return null;

  return (
    <div className="grid gap-3">
      {faqs.map((item) => (
        <article
          key={item.question}
          className="rounded-2xl border border-border/70 bg-background/60 p-4"
        >
          <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {item.answer}
          </p>
        </article>
      ))}
    </div>
  );
}

export default function CompanyInfoPage({ page }) {
  return (
    <div className="page-shell bg-background">
      <div className="container-premium py-4 sm:py-6">
        <Link
          className={buttonVariants({
            size: "sm",
            variant: "ghost",
            className: "w-fit px-0 text-muted-foreground hover:text-foreground",
          })}
          to="/"
        >
          <CaretLeftIcon weight="bold" />
          Back to Home
        </Link>

        <Card className="mt-3 overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/60 bg-card/50">
            <Badge variant="outline" className="w-fit">
              {page.badge}
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {page.title}
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {page.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 py-6">
            {page.sections.map((section, index) => (
              <section key={section.title} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">
                    {section.title}
                  </h2>
                  {index === 0 && <Separator className="mt-3" />}
                </div>
                <SectionText paragraphs={section.paragraphs} />
                <SectionList bullets={section.bullets} />
                <SectionDetails details={section.details} />
                <SectionLinks links={section.links} />
                <SectionFaqs faqs={section.faqs} />
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
