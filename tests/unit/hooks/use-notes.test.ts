import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetIndexedDb } from "../reset-indexeddb";

const note = {
  id: "n1",
  type: "text" as const,
  title: "Ideas",
  body: "",
  pinned: false,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
};

async function freshHooks() {
  vi.resetModules();
  const hooks = await import("@/hooks/use-notes");
  const storage = await import("@/lib/storage");
  await storage.whenLoaded();
  return { ...hooks, storage };
}

beforeEach(async () => {
  await resetIndexedDb();
});

describe("useNotes / useNote", () => {
  it("re-renders with the latest notes after a save", async () => {
    const { useNotes, useNote, storage } = await freshHooks();
    const { result } = renderHook(() => ({
      all: useNotes(),
      one: useNote("n1"),
    }));
    expect(result.current.one).toBeUndefined();

    act(() => storage.saveNote(note));

    expect(result.current.all).toHaveLength(1);
    expect(result.current.one?.title).toBe("Ideas");
  });
});

describe("useNotesReady", () => {
  it("turns true once the notes have loaded", async () => {
    vi.resetModules();
    const { useNotesReady } = await import("@/hooks/use-notes");
    const storage = await import("@/lib/storage");
    const { result } = renderHook(() => useNotesReady());

    await act(() => storage.whenLoaded());

    expect(result.current).toBe(true);
    expect(storage.isNotesReadyOnServer()).toBe(false);
  });
});

describe("useUnreadableNotes", () => {
  it("is null while the stored notes read normally", async () => {
    const { useUnreadableNotes } = await freshHooks();
    const { result } = renderHook(() => useUnreadableNotes());

    expect(result.current).toBeNull();
  });

  it("reports encrypted notes it has no key for, moved aside", async () => {
    vi.resetModules();
    const { kvSet } = await import("@/lib/idb-store");
    // Encrypted notes, but no lock enrolment to unlock them with.
    await kvSet("notes-data", { iv: "AAAAAAAAAAAAAAAA", ciphertext: "AAAA" });
    const { useUnreadableNotes } = await import("@/hooks/use-notes");
    const storage = await import("@/lib/storage");
    const { result } = renderHook(() => useUnreadableNotes());

    await act(() => storage.whenLoaded());

    expect(result.current).toEqual({
      reason: "no-key",
      movedTo: "notes-data-unreadable",
    });
  });
});

describe("useSetAsideCount", () => {
  it("counts the notes put away once loaded", async () => {
    vi.resetModules();
    const { kvSet } = await import("@/lib/idb-store");
    await kvSet("notes-data-unreadable", { setAside: [{ value: "a" }] });
    const { useSetAsideCount } = await import("@/hooks/use-notes");
    const storage = await import("@/lib/storage");
    const { result } = renderHook(() => useSetAsideCount());

    await act(() => storage.whenLoaded());

    expect(result.current).toBe(1);
  });
});
