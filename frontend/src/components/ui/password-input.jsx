import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Input } from "./input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./input-group";
import { useState } from "react";

export function PasswordInput({ className, ...props }) {
  const [passwordHidden, setHidden] = useState(true);

  return (
    <InputGroup className={className}>
      <InputGroupInput {...props} type={passwordHidden ? "password" : "text"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          title={passwordHidden ? "Show password" : "Hide password"}
          onClick={() => setHidden(!passwordHidden)}
        >
          {passwordHidden ? <EyeIcon /> : <EyeSlashIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
