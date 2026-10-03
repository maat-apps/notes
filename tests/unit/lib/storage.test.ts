import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Note } from "@/lib/schemas";
import { resetIndexedDb } from "../reset-indexeddb";

const NOW = new Date("2026-10-01T10:00:00.000Z");

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    type: "text",
    title: "Ideas",
    body: "",
    pinned: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  } as Note;
}

// storage.ts keeps module-level state, so every test gets a fresh module
// graph (and with it a fresh key holder and settings store).
async function freshStorage() {
  vi.resetModules();
  const storage = await import("@/lib/storage");
  await storage.whenLoaded();
  return storage;
}

async function stored(): Promise<unknown> {
  const { kvGet } = await import("@/lib/idb-store");
  const { DATA_KEY } = await import("@/lib/storage-keys");
  return kvGet(DATA_KEY);
}

async function testKey() {
  const { deriveKey, randomBytes } = await import("@maat-apps/core/crypto");
  return deriveKey(randomBytes(32), randomBytes(16), "test-data-v1");
}

beforeEach(async () => {
  await resetIndexedDb();
});

describe("saveNote", () => {
  it("adds a note and stamps updatedAt", async () => {
    const storage = await freshStorage();
    const later = new Date("2026-10-02T00:00:00.000Z");

    storage.saveNote(note(), later);

    expect(storage.getNotesSnapshot()).toEqual([
      note({ updatedAt: later.toISOString() }),
    ]);
  });

  it("replaces an existing note", async () => {
    const storage = await freshStorage();
    storage.saveNote(note());

    storage.saveNote(note({ title: "Renamed" }));

    expect(storage.getNotesSnapshot().map((item) => item.title)).toEqual([
      "Renamed",
    ]);
  });

  it("deletes a note saved empty", async () => {
    const storage = await freshStorage();
    storage.saveNote(note());

    storage.saveNote(note({ title: "" }));

    expect(storage.getNotesSnapshot()).toEqual([]);
  });

  it("notifies subscribers", async () => {
    const storage = await freshStorage();
    const listener = vi.fn();
    const unsubscribe = storage.subscribe(listener);

    storage.saveNote(note());
    unsubscribe();
    storage.saveNote(note({ title: "Again" }));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("persists to IndexedDB for the next session", async () => {
    const storage = await freshStorage();
    storage.saveNote(note());
    await vi.waitFor(async () => expect(await stored()).toBeTruthy());

    const next = await freshStorage();

    expect(next.getNotesSnapshot()).toHaveLength(1);
  });
});

describe("deleteNote / setPinned", () => {
  it("deletes by id and ignores unknown ids", async () => {
    const storage = await freshStorage();
    storage.saveNote(note());
    const listener = vi.fn();
    storage.subscribe(listener);

    storage.deleteNote("missing");
    storage.deleteNote("n1");

    expect(storage.getNotesSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("pins without changing updatedAt", async () => {
    const storage = await freshStorage();
    storage.saveNote(note(), NOW);

    storage.setPinned("n1", true);

    expect(storage.getNotesSnapshot()).toEqual([note({ pinned: true })]);
  });
});

describe("loading", () => {
  it("drops malformed stored notes", async () => {
    vi.resetModules();
    const { kvSet } = await import("@/lib/idb-store");
    const { DATA_KEY } = await import("@/lib/storage-keys");
    await kvSet(DATA_KEY, { notes: [note(), { id: 1 }] });

    const storage = await freshStorage();

    expect(storage.getNotesSnapshot()).toEqual([note()]);
  });

  it("starts empty when the read fails", async () => {
    vi.resetModules();
    const { keyValueStore } = await import("@/lib/idb-store");
    vi.spyOn(keyValueStore, "get").mockRejectedValueOnce(new Error("disk"));
    const storage = await import("@/lib/storage");
    await storage.whenLoaded();

    expect(storage.getNotesSnapshot()).toEqual([]);
  });

  it("serves an empty list on the server", async () => {
    const storage = await freshStorage();
    expect(storage.getServerNotesSnapshot()).toEqual([]);
  });
});

describe("encryption", () => {
  const encryptedEnrolment = {
    credentialId: "c1",
    userId: "u1",
    createdAt: "now",
    encryptionSupported: true,
    prfSalt: "c2FsdA",
  };

  it("writes an encrypted blob while a key is set", async () => {
    const storage = await freshStorage();
    const { encryptionKey } = await import("@/lib/encryption-key");
    const { isEncryptedBlob } = await import("@maat-apps/core/crypto");
    encryptionKey.set(await testKey());

    storage.saveNote(note());

    await vi.waitFor(async () =>
      expect(isEncryptedBlob(await stored())).toBe(true),
    );
  });

  it("holds the first read until the key is set when the lock encrypts", async () => {
    vi.resetModules();
    const settings = await import("@/lib/app-settings");
    await settings.whenLoaded();
    settings.setLockEnrolment(encryptedEnrolment);
    const key = await testKey();
    const { encryptJson } = await import("@maat-apps/core/crypto");
    const { kvSet } = await import("@/lib/idb-store");
    const { DATA_KEY } = await import("@/lib/storage-keys");
    await kvSet(DATA_KEY, await encryptJson(key, { notes: [note()] }));

    const storage = await import("@/lib/storage");
    void storage.whenLoaded();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(storage.getNotesSnapshot()).toEqual([]);

    const { encryptionKey } = await import("@/lib/encryption-key");
    encryptionKey.set(key);
    await storage.whenLoaded();
    expect(storage.getNotesSnapshot()).toEqual([note()]);
  });
});

describe("edge cases", () => {
  it("ignores a stored value that isn't an object", async () => {
    vi.resetModules();
    const { kvSet } = await import("@/lib/idb-store");
    const { DATA_KEY } = await import("@/lib/storage-keys");
    await kvSet(DATA_KEY, "garbage");

    const storage = await freshStorage();

    expect(storage.getNotesSnapshot()).toEqual([]);
  });

  it("only touches the note being saved or pinned", async () => {
    const storage = await freshStorage();
    storage.saveNote(note({ id: "a", title: "A" }), NOW);
    storage.saveNote(note({ id: "b", title: "B" }), NOW);

    storage.saveNote(note({ id: "a", title: "A2" }), NOW);
    storage.setPinned("b", true);

    expect(storage.getNotesSnapshot()).toEqual([
      note({ id: "a", title: "A2" }),
      note({ id: "b", title: "B", pinned: true }),
    ]);
  });

  it("keeps working in memory when a write fails", async () => {
    const storage = await freshStorage();
    const { keyValueStore } = await import("@/lib/idb-store");
    vi.spyOn(keyValueStore, "set").mockRejectedValueOnce(new Error("full"));

    storage.saveNote(note());

    expect(storage.getNotesSnapshot()).toHaveLength(1);
  });
});

describe("setNoteOrder", () => {
  it("ranks the notes in the given order", async () => {
    const storage = await freshStorage();
    storage.saveNote(note({ id: "a" }));
    storage.saveNote(note({ id: "b" }));

    storage.setNoteOrder(["b", "a"]);

    const ranks = Object.fromEntries(
      storage.getNotesSnapshot().map((item) => [item.id, item.rank]),
    );
    expect(ranks).toEqual({ b: 0, a: 1 });
  });

  it("sends an edited note back to the top by dropping its rank", async () => {
    const storage = await freshStorage();
    storage.saveNote(note({ id: "a" }));
    storage.setNoteOrder(["a"]);

    storage.saveNote(note({ id: "a", title: "Renamed", rank: 0 }));

    expect(storage.getNotesSnapshot()[0].rank).toBeUndefined();
  });

  it("keeps the order when a note is pinned", async () => {
    const storage = await freshStorage();
    storage.saveNote(note({ id: "a" }));
    storage.setNoteOrder(["a"]);

    storage.setPinned("a", true);

    expect(storage.getNotesSnapshot()[0].rank).toBe(0);
  });
});
