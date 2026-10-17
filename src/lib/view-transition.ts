// Small animations through the View Transitions API (Keep-style motion:
// a card opening into its note, checklist items moving to "Checked items",
// the list closing up after a delete). Where the API is missing, or the
// user asked for less motion, the change just happens.

/** How long a transition may wait for the new screen before it gives up. */
const RENDER_TIMEOUT_MS = 400;

function reducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

/** Runs `update` (it must change the DOM synchronously, or resolve once it has) as a view transition. */
export function withViewTransition(update: () => void | Promise<void>): void {
  if (typeof document.startViewTransition !== "function" || reducedMotion()) {
    void update();
    return;
  }
  document.startViewTransition(update);
}

/** The `view-transition-name` a note's card and its open note share. */
export function noteTransitionName(id: string): string {
  return `note-${id.replace(/[^\w-]/g, "_")}`;
}

/** The `view-transition-name` of one checklist item. */
export function itemTransitionName(id: string): string {
  return `item-${id.replace(/[^\w-]/g, "_")}`;
}

/**
 * Resolves once `selector` matches, or after a short timeout — a lazily
 * loaded screen may take a frame or two to appear.
 */
export function untilRendered(selector: string): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    function check() {
      if (
        document.querySelector(selector) ||
        performance.now() - started > RENDER_TIMEOUT_MS
      ) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    }
    check();
  });
}
