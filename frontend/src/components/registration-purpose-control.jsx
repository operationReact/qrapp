import { cloneElement, createElement } from "react";
import {
  BuildingsIcon,
  CalendarIcon,
  HeartIcon,
  LockKeyIcon,
  MapPinIcon,
  TagIcon,
  TextTIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const PURPOSE_RULES = [
  { matches: ["location", "address"], icon: MapPinIcon, color: "text-sky-500" },
  { matches: ["company", "organization", "business"], icon: BuildingsIcon, color: "text-violet-500" },
  { matches: ["date", "birthday", "anniversary", "milestone"], icon: CalendarIcon, color: "text-amber-500" },
  { matches: ["special", "occasion", "memory"], icon: HeartIcon, color: "text-rose-500" },
  { matches: ["custom", "label", "other"], icon: TagIcon, color: "text-emerald-500" },
  { matches: ["password", "secret", "security"], icon: LockKeyIcon, color: "text-indigo-500" },
  { matches: ["name", "person"], icon: UserCircleIcon, color: "text-blue-500" },
];

function iconForPurpose({ type, label, placeholder }) {
  const purpose = `${type || ""} ${label || ""} ${placeholder || ""}`.toLowerCase();
  if (type === "date") return { icon: CalendarIcon, color: "text-amber-500" };
  return PURPOSE_RULES.find(({ matches }) => matches.some((word) => purpose.includes(word)))
    || { icon: TextTIcon, color: "text-cyan-500" };
}

export function RegistrationPurposeControl({
  children,
  type,
  label,
  placeholder,
  className,
}) {
  const { icon: Icon, color } = iconForPurpose({ type, label, placeholder });
  const child = cloneElement(children, {
    className: cn("!pl-10", children.props.className),
  });

  return (
    <div className={cn("relative", className)}>
      {createElement(Icon, {
        size: 18,
        weight: "duotone",
        "aria-hidden": true,
        className: cn(
          "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2",
          color,
        ),
      })}
      {child}
    </div>
  );
}
