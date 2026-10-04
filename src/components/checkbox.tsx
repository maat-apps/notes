import { Checkbox as BaseCheckbox } from "@maat-apps/ui/checkbox";
import type { ComponentProps } from "react";

/** The checklist checkbox: Keep's square with soft corners and a thick edge. */
export function Checkbox({
  className = "",
  ...props
}: ComponentProps<typeof BaseCheckbox>) {
  return (
    <BaseCheckbox
      className={`border-foreground size-6 rounded-[4px] border-2 [&_svg]:size-4 ${className}`}
      {...props}
    />
  );
}
