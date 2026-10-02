import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Note } from "@/lib/schemas";
import { resetIndexedDb } from "../reset-indexeddb";

const note: Note = {
  id: "n1",
  type: "checklist",
  title: "",
  pinned: false,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  items: [{ id: "i1", text: "Milk", checked: false }],
};

async function freshBackup() {
  vi.resetModules();
  const storage = await import("@/lib/storage");
  await storage.whenLoaded();
  const backup = await import("@/lib/backup");
  return { storage, backup };
}

beforeEach(async () => {
  await resetIndexedDb();
});

describe("backup", () => {
  it("round-trips the notes through a backup file", async () => {
    const { storage, backup } = await freshBackup();
    storage.saveNote(note);
    const text = JSON.stringify(backup.createBackup());
    storage.replaceAllNotes([]);

    backup.applyBackup(backup.parseBackup(text));

    expect(storage.getNotesSnapshot()).toHaveLength(1);
  });

  it("rejects another app's backup", async () => {
    const { backup } = await freshBackup();
    const other = JSON.stringify({
      app: "routines",
      version: 1,
      exportedAt: "now",
      data: {},
    });

    expect(() => backup.parseBackup(other)).toThrow(backup.BackupError);
  });

  it("rejects text that isn't JSON", async () => {
    const { backup } = await freshBackup();
    expect(() => backup.parseBackup("nope")).toThrow(backup.BackupError);
  });

  it("treats missing data as no notes", async () => {
    const { backup } = await freshBackup();
    const parsed = backup.parseBackupValue({
      app: "notes",
      version: 1,
      exportedAt: "now",
    });
    expect(parsed.data.notes).toEqual([]);
  });

  it("names the file after the app and date", async () => {
    const { backup } = await freshBackup();
    expect(backup.backupFileName(new Date(2026, 9, 1))).toBe(
      "notes-backup-2026-10-01.txt",
    );
  });
});

describe("downloadBackup", () => {
  it("hands the browser a backup file named after the app", async () => {
    const { backup } = await freshBackup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    let downloaded = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloaded = this.download;
    });

    backup.downloadBackup();

    expect(downloaded).toMatch(/^notes-backup-\d{4}-\d{2}-\d{2}\.txt$/);
    vi.restoreAllMocks();
  });
});

describe("shareBackup", () => {
  it("is unavailable without the Web Share API", async () => {
    const { backup } = await freshBackup();
    vi.stubGlobal("navigator", {});

    await expect(backup.shareBackup()).resolves.toBe("unavailable");
    vi.unstubAllGlobals();
  });
});
