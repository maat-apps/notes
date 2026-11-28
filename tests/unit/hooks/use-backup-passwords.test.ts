import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBackupPasswords } from "@/hooks/use-backup-passwords";
import { backups } from "@/lib/backup";

describe("useBackupPasswords", () => {
  it("hands over the backup kit's password methods", () => {
    const { result } = renderHook(() => useBackupPasswords());

    expect(result.current.exportWithPassword).toBe(backups.exportWithPassword);
    expect(result.current.isEncrypted).toBe(backups.isEncrypted);
    expect(result.current.parseWithPassword).toBe(backups.parseWithPassword);
  });

  it("translates every label of the password drawer", () => {
    const { result } = renderHook(() => useBackupPasswords());

    for (const label of Object.values(result.current.labels)) {
      expect(label).toMatch(/\S/);
    }
    expect(result.current.labels.password).toBe("Password");
  });
});
