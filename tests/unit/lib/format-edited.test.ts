import { describe, expect, it } from "vitest";

import { formatEdited } from "@/lib/format-edited";

const NOW = new Date("2026-10-04T15:30:00");

describe("formatEdited", () => {
  it("shows the time for today", () => {
    expect(
      formatEdited(new Date("2026-10-04T09:05:00").toISOString(), "en", NOW),
    ).toMatch(/9:05|09:05/);
  });

  it("shows day and month for an earlier day this year", () => {
    const label = formatEdited(
      new Date("2026-03-02T09:05:00").toISOString(),
      "en",
      NOW,
    );
    expect(label).toContain("Mar");
    expect(label).not.toContain("2026");
  });

  it("adds the year for an earlier year", () => {
    expect(
      formatEdited(new Date("2025-03-02T09:05:00").toISOString(), "en", NOW),
    ).toContain("2025");
  });

  it("uses the app's language", () => {
    expect(
      formatEdited(new Date("2026-03-02T09:05:00").toISOString(), "pl", NOW),
    ).toContain("mar");
  });
});
