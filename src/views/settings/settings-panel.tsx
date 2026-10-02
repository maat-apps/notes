import { useState } from "react";

import { AppSection } from "./settings-app-section";
import { SecuritySection } from "./settings-security-section";

export function SettingsPanel() {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
      <SecuritySection />
      <AppSection onStatus={setStatus} />
      <p aria-live="polite" className="text-muted-foreground px-1 text-sm">
        {status}
      </p>
    </div>
  );
}
