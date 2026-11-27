import { Link, useRouter } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Global fallback for unmatched routes.
 *
 * Registered on the router as `defaultNotFoundComponent`, so any deep link to
 * an unknown path (a stale link, a mistyped URL, a removed page, or a deep link
 * opened from the Android TWA / a future iOS wrapper) lands here instead of the
 * router's bare default. Always offers a way back so the user is never stranded
 * on a dead screen — important for both Play Store and App Store review, which
 * routinely probe deep links and navigation edge cases.
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <main
      className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 px-6 text-center"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
      }}
    >
      <img
        src="/bro-logo.png"
        alt="Bro & Bro"
        className="h-16 w-16 rounded-2xl object-contain"
      />
      <p className="text-5xl font-semibold text-primary">404</p>
      <h1 className="text-xl font-semibold text-foreground">
        We couldn&apos;t find that page
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for may have moved or no longer exists.
        Let&apos;s get you back to something delicious.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => router.history.back()}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Go back
        </button>
        <Link to="/" className={cn(buttonVariants({ size: "lg" }))}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}
