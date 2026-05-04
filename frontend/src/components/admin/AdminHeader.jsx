import { cn } from "@/lib/utils";

export default function AdminHeader({ title, description, className }) {
  return (
    <div className={cn("px-4 pt-2", className)}>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
