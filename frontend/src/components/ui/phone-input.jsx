import { createElement } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./input-group";
import { Separator } from "./separator";
import { PhoneIcon } from "@phosphor-icons/react";

export function PhoneInput({
  className,
  icon: Icon = PhoneIcon,
  iconClassName = "text-emerald-500",
  type = "tel",
  inputMode = "tel",
  autoComplete = "tel",
  enterKeyHint = "next",
  ...props
}) {
  return (
    <InputGroup className={className}>
      <InputGroupInput
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        {...props}
      />
      <InputGroupAddon align="inline-start">
        {createElement(Icon, {
          size: 18,
          weight: "duotone",
          "aria-hidden": true,
          className: iconClassName,
        })}
        <span>+91</span>
        <Separator orientation="vertical" />
      </InputGroupAddon>
    </InputGroup>
  );
}
