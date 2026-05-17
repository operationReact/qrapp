import { InputGroup, InputGroupAddon, InputGroupInput } from "./input-group";
import { Separator } from "./separator";

export function PhoneInput({ className, ...props }) {
  return (
    <InputGroup className={className}>
      <InputGroupInput {...props} />
      <InputGroupAddon align="inline-start">
        <span>+91</span>
        <Separator orientation="vertical" />
      </InputGroupAddon>
    </InputGroup>
  );
}
