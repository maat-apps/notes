import { Checkbox as BaseCheckbox } from "@maat-apps/ui/checkbox";
import type { ComponentProps } from "react";

/**
 * The checklist checkbox, sized like Keep's: an 18px square with a thin
 * edge and barely rounded corners; checked, it turns grey like its text.
 */
export function Checkbox({
  className = "",
  ...props
}: ComponentProps<typeof BaseCheckbox>) {
  return (
    <BaseCheckbox
      className={`border-foreground data-checked:border-muted-foreground data-checked:bg-muted-foreground dark:data-checked:bg-muted-foreground size-4.5 rounded-[2px] border-2 [&_svg]:size-3.5 ${className}`}
      {...props}
    />
  );
}
