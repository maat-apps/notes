import { afterEach, describe, expect, it, vi } from "vitest";

import {
  itemTransitionName,
  noteTransitionName,
  untilRendered,
  withViewTransition,
} from "@/lib/view-transition";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  Reflect.deleteProperty(document, "startViewTransition");
});

function stubMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduce })),
  );
}

describe("withViewTransition", () => {
  it("just runs the update without the API", async () => {
    const update = vi.fn();
    await withViewTransition(update);
    expect(update).toHaveBeenCalledOnce();
  });

  it("runs the update as a view transition and resolves once it's done", async () => {
    stubMotion(false);
    const start = vi.fn(() => ({ finished: Promise.resolve() }));
    Object.assign(document, { startViewTransition: start });
    const update = vi.fn();

    await withViewTransition(update);

    expect(start).toHaveBeenCalledWith(update);
  });

  it("resolves even when the transition is skipped", async () => {
    stubMotion(false);
    Object.assign(document, {
      startViewTransition: () => ({
        finished: Promise.reject(new Error("skipped")),
      }),
    });

    await expect(withViewTransition(vi.fn())).resolves.toBeUndefined();
  });

  it("skips the transition for reduced motion", async () => {
    stubMotion(true);
    const start = vi.fn();
    Object.assign(document, { startViewTransition: start });
    const update = vi.fn();

    await withViewTransition(update);

    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
  });
});

describe("transition names", () => {
  it("are valid identifiers for any id", () => {
    expect(noteTransitionName("a1-b2")).toBe("note-a1-b2");
    expect(itemTransitionName("x.y z")).toBe("item-x_y_z");
  });
});

describe("untilRendered", () => {
  it("resolves once the element is there", async () => {
    const waiting = untilRendered("#late");
    setTimeout(() => {
      const element = document.createElement("div");
      element.id = "late";
      document.body.append(element);
    }, 20);
    await expect(waiting).resolves.toBeUndefined();
    expect(document.querySelector("#late")).not.toBeNull();
  });

  it("gives up after a short while", async () => {
    await expect(untilRendered("#never")).resolves.toBeUndefined();
  });
});
