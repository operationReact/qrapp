import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

const toneStyles = {
  default: "bg-transparent",
  blue: "bg-blue-50/50 ring-blue-200/60 border border-blue-200/60",
  slate: "bg-slate-50/50 ring-slate-200/60 border border-slate-200/60",
  green: "bg-green-50/50 ring-green-200/60 border border-green-200/60",
  yellow: "bg-amber-50/50 ring-amber-200/60 border border-amber-200/60",
  red: "bg-red-50/50 ring-red-200/60 border border-red-200/60",
  cyan: "bg-cyan-50/50 ring-cyan-200/60 border border-cyan-200/60",
  neutral: "bg-neutral-50/50 ring-neutral-200/60 border border-neutral-200/60",
};

const Segment = ({ className, tone = "default", size, ...props }) => (
  <section
    data-slot="segment"
    data-tone={tone}
    data-size={size}
    className={cn(
      "group/segment flex flex-col gap-4 rounded-lg scroll-mt-4",
      toneStyles[tone] ?? toneStyles.default,
      size === "sm" && "gap-3 rounded-md",
      className,
    )}
    {...props}
  />
);

const SegmentHeader = ({ className, ...props }) => (
  <div
    data-slot="segment-header"
    className={cn("flex items-start justify-between gap-2", className)}
    {...props}
  />
);

const SegmentLabel = ({ icon, className, ...props }) => (
  <div
    data-slot="segment-label"
    className={cn("flex items-start gap-2 min-w-0", className)}
    {...props}
  >
    {icon && (
      <span
        data-slot="segment-icon"
        className="mt-0.5 shrink-0 text-muted-foreground translate-y-0.5
          group-data-[tone=blue]/segment:text-blue-700
          group-data-[tone=slate]/segment:text-slate-700
          group-data-[tone=green]/segment:text-green-700
          group-data-[tone=yellow]/segment:text-amber-700
          group-data-[tone=red]/segment:text-red-700
          group-data-[tone=cyan]/segment:text-cyan-700
          group-data-[tone=neutral]/segment:text-neutral-700"
      >
        {icon}
      </span>
    )}
    <div className="flex flex-col gap-0.5">{props.children}</div>
  </div>
);

const SegmentTitle = ({ className, ...props }) => (
  <h2
    data-slot="segment-title"
    className={cn(
      "text-sm font-bold sm:text-lg text-foreground leading-snug",
      "group-data-[tone=blue]/segment:text-blue-800",
      "group-data-[tone=slate]/segment:text-slate-800",
      "group-data-[tone=green]/segment:text-green-800",
      "group-data-[tone=yellow]/segment:text-amber-800",
      "group-data-[tone=red]/segment:text-red-800",
      "group-data-[tone=cyan]/segment:text-cyan-800",
      "group-data-[tone=neutral]/segment:text-neutral-800",
      className,
    )}
    {...props}
  />
);

const SegmentDescription = ({ className, ...props }) => (
  <p
    data-slot="segment-description"
    className={cn(
      "text-xs text-muted-foreground sm:text-sm",
      "group-data-[tone=green]/segment:text-green-700/80",
      "group-data-[tone=yellow]/segment:text-amber-700/80",
      "group-data-[tone=red]/segment:text-red-700/80",
      "group-data-[tone=cyan]/segment:text-cyan-700/80",
      className,
    )}
    {...props}
  />
);

const SegmentContent = ({ className, ...props }) => (
  <div data-slot="segment-content" className={cn(className)} {...props} />
);

const SegmentFooter = ({ className, ...props }) => (
  <div
    data-slot="segment-footer"
    className={cn("flex gap-2 px-2 py-0.5", className)}
    {...props}
  />
);

const SegmentActions = ({ className, ...props }) => (
  <div data-slot="segment-actions" className={cn("shrink-0 flex gap-2", className)} {...props} />
);

const SegmentAction = ({ className, variant = "outline", render, ...props }) => {
  const toneClasses = cn(
    "group-data-[tone=blue]/segment:border-blue-200 group-data-[tone=blue]/segment:text-blue-700 group-data-[tone=blue]/segment:hover:bg-blue-50",
    "group-data-[tone=green]/segment:border-green-200 group-data-[tone=green]/segment:text-green-700 group-data-[tone=green]/segment:hover:bg-green-50",
    "group-data-[tone=yellow]/segment:border-amber-200 group-data-[tone=yellow]/segment:text-amber-700 group-data-[tone=yellow]/segment:hover:bg-amber-50",
    "group-data-[tone=red]/segment:border-red-200 group-data-[tone=red]/segment:text-red-700 group-data-[tone=red]/segment:hover:bg-red-50",
    "group-data-[tone=cyan]/segment:border-cyan-200 group-data-[tone=cyan]/segment:text-cyan-700 group-data-[tone=cyan]/segment:hover:bg-cyan-50",
    "group-data-[tone=slate]/segment:border-slate-200 group-data-[tone=slate]/segment:text-slate-700 group-data-[tone=slate]/segment:hover:bg-slate-50",
    "group-data-[tone=neutral]/segment:border-neutral-300 group-data-[tone=neutral]/segment:text-neutral-700 group-data-[tone=neutral]/segment:hover:bg-neutral-100",
  );

  if (render) {
    return useRender({
      defaultTagName: "button",
      props: mergeProps({
        "data-slot": "segment-action",
        className: cn(buttonVariants({ variant }), toneClasses, className),
      }, props),
      render,
      state: { slot: "segment-action" },
    });
  }

  return (
    <Button
      data-slot="segment-action"
      variant={variant}
      className={cn(toneClasses, className)}
      {...props}
    />
  );
};

export {
  Segment,
  SegmentHeader,
  SegmentLabel,
  SegmentTitle,
  SegmentDescription,
  SegmentContent,
  SegmentFooter,
  SegmentActions,
  SegmentAction,
};
