import { describe, expect, it } from "vitest";

import { formatBackupAge } from "@/lib/backup-age";

const NOW = new Date(2026, 10, 28, 9, 0);

describe("formatBackupAge", () => {
  it("says today for a backup made earlier today", () => {
    expect(
      formatBackupAge(new Date(2026, 10, 28, 0, 5).toISOString(), "en", NOW),
    ).toBe("today");
  });

  it("counts calendar days, not 24-hour periods", () => {
    expect(
      formatBackupAge(new Date(2026, 10, 27, 23, 50).toISOString(), "en", NOW),
    ).toBe("yesterday");
  });

  it("says how many days ago", () => {
    expect(
      formatBackupAge(new Date(2026, 10, 16).toISOString(), "en", NOW),
    ).toBe("12 days ago");
  });

  it("speaks Polish", () => {
    expect(
      formatBackupAge(new Date(2026, 10, 16).toISOString(), "pl", NOW),
    ).toBe("12 dni temu");
  });

  it("treats a time in the future (a wrong clock) as today", () => {
    expect(
      formatBackupAge(new Date(2026, 11, 1).toISOString(), "en", NOW),
    ).toBe("today");
  });
});
