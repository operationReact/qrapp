import { cn } from "@/lib/utils";

export const TitledSection = ({ children, className, ...props }) => {
  return (
    <section
      className={cn(
        " bg-white rounded-lg flex flex-col gap-4 scroll-mt-4",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
};

export const TitledSectionHeader = ({
  children,
  icon,
  className,
  startContent,
  endContent,
  ...props
}) => {
  return (
    <div
      className={cn("flex justify-between items-center", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        {icon && icon}
        <div>{startContent}</div>
      </div>
      {endContent}
    </div>
  );
};

export const TitledSectionTitle = ({ children, className, ...props }) => {
  return (
    <h2
      className={cn("text-base font-semibold sm:text-xl", className)}
      {...props}
    >
      {children}
    </h2>
  );
};

export const TitledSectionSubtitle = ({ children, className, ...props }) => {
  return (
    <p
      className={cn("text-sm text-muted-foreground sm:text-base", className)}
      {...props}
    >
      {children}
    </p>
  );
};

export const TitledSectionContent = ({ children, className, ...props }) => {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
};

export const TitledSectionFooter = ({ children, className, ...props }) => {
  return (
    <div className={cn("px-2 py-0.5", className)} {...props}>
      {children}
    </div>
  );
};
