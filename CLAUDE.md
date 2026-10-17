# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For the generic app structure this repo follows (folder layout, routing
pattern, i18n approach, naming conventions, testing split) see
[`maat-core/STRUCTURE.md`](https://github.com/maat-apps/maat-core/blob/main/STRUCTURE.md).
For the "verify each change exactly once" principle behind this repo's
automation setup, see
[`maat-core/VERIFICATION.md`](https://github.com/maat-apps/maat-core/blob/main/VERIFICATION.md).
What follows here is what's specific to **notes** — product intent and
scope are in [`PRODUCT.md`](./PRODUCT.md).

<!-- BEGIN AUTO-GENERATED: setup-claude-workflow -->
<!-- Only Project Snapshot and Commands below are ever rewritten by --refresh. -->

## Project Snapshot

- Vite + React + TypeScript, Tailwind v4, shadcn (`base-nova`).
- Mobile-only (`@maat-apps/ui`'s `MobileGate`, from `src/app/root.tsx`), like routines.

## Commands

| Purpose   | Command                 |
| --------- | ----------------------- |
| Dev       | `npm run dev`           |
| Build     | `npm run build`         |
| Lint      | `npm run lint:fix`      |
| Format    | `npm run format`        |
| Typecheck | `npm run typecheck`     |
| Unit test | `npm run test:coverage` |
| E2E test  | `npm run test:e2e`      |
| Validate  | `npm run validate`      |

<!-- Everything below is seeded once, then append-only — --refresh never rewrites it. -->

## Conventions

- Filenames: kebab-case everywhere, including components; component names
  inside a file stay PascalCase.
- Named exports throughout.
- Hooks (`use*`) live in `src/hooks/`, not `src/lib/` — `lib/` stays free
  of `react`/`react-dom` imports.
- A Playwright project's reusable test-helper file belongs at
  `e2e/utils.ts`, not `fixtures.ts` — these are plain functions specs call
  directly, not Playwright's own `test.extend()` fixture-injection system.
- **Storage.** The local pattern (maat-core's `docs/storage.md`; notes
  never go to a repository — STRUCTURE.md's rule): `src/lib/storage.ts`
  is `@maat-apps/core/local`'s `createLocalStore` (`notesStore`) plus the
  note mutations, read through `src/hooks/use-notes.ts`. Notes are
  validated per entry (`schemas.ts`); a note with no title and no content
  is never kept (`note-utils.ts`'s `isEmptyNote`). Backups and the
  pre-update snapshot are core's `createLocalBackup` (`backup.ts`,
  re-exported by `app-update.ts`); `app-lock.ts` wires both through
  `lockData`. A Settings import merges (`mergeBackup`, `note-utils.ts`'s
  `mergeNotes`: adds missing notes, the newer `updatedAt` wins, nothing is
  deleted); only the pre-update snapshot restore (`applyBackup`) replaces.
- **Screens.** Keep-style layout, one column. `src/app/router.tsx`: `/`
  (`views/home`: a title that scrolls away, the list — outlined cards, a
  pinned section — and `@maat-apps/ui`'s `BottomBar`: settings, new
  checklist, new note; a long press let go without moving — the drag
  sensor's `onDragEnd` with no delta — selects cards, and
  `selection-bar.tsx`, also a `BottomBar`, replaces it while any are),
  `/new/:type` and `/:id` (`views/note/note-view.tsx`). `NoteEditor` keeps its own draft and
  saves on every change (no Save button) and opens scrolled to the top (the list's scroll would carry over); a new note only reaches storage
  once it has content, and `NoteView` latches the note it opened so
  emptying it mid-edit (which deletes it) doesn't unmount the editor.
  Checklist item operations are pure helpers in `lib/checklist-utils.ts`,
  including one-level nesting: items stay one flat array, an `indented`
  item belongs to the nearest top-level item above it (`parentId`,
  `childIds`), and `shownIndented` decides what's drawn nested in each
  rendered list.
  Motion (`lib/view-transition.ts`, View Transitions API; nothing under
  `prefers-reduced-motion` or without the API, CSS in `globals.css`): a card
  grows into its note (card and editor share `noteTransitionName`; the
  navigation waits for `[data-note-editor]`), checked items slide to
  "Checked items" (`itemTransitionName`), the list closes up after a
  delete. Opening a note therefore changes the URL a frame after the tap —
  e2e waits for the editor, not the click.
  Back uses `useSmartBack("/")`. Settings is a drawer
  (`views/settings/`), one `settings-<name>-section.tsx` per card.
- **i18n.** `src/i18n/en.json` and `pl.json` (core's `createTranslation`;
  the device language picks on first launch, Settings → Language after).
  `t()` only accepts keys present in both — keep them in sync.
- **E2E.** Views are lazy chunks: wait for the screen (e.g. the focused
  first checklist item, `e2e/utils.ts`'s `newChecklist`) before typing.
- **App lock.** Every maat-apps app has it (`@maat-apps/core/lock` +
  `@maat-apps/ui/app-lock-gate`, wrapped around the router in
  `src/app/router.tsx`). `src/lib/app-lock.ts` rewrites the notes with the
  current key and erases them plus the update snapshot; `storage.ts` and
  `app-update.ts` encrypt with `src/lib/encryption-key.ts`. The lock comes back after
  time in the background per `app-settings.ts`'s `relockAfter` (Settings →
  Security; `relockAfterMs` feeds `createAppLock`). **Never change
  `HKDF_INFO` (`"notes-data-v1"`)** — existing encrypted notes would
  become unreadable.
- Full pattern log: none yet — run `/learn-patterns` after a non-trivial
  session to start one.

## Workflow Rules

- Don't manually re-run lint/format/typecheck/build/test to double-check a
  change before committing — CI runs the full `npm run validate` gate on
  every PR; see `maat-core/VERIFICATION.md` for why running it twice is
  pure waste, not extra safety.
- Check the current branch before editing or committing anything — never
  edit or commit directly on `main`.
- Name branches `<type>/<short-descriptive-slug>` — see
  `maat-core/STRUCTURE.md`'s "Branch naming" section — not a generic or
  session-scoped name; cut a fresh branch per PR/task rather than reusing
  one across unrelated changes.
- Commit once a task's changes are complete, then use `/open-pr` to push
  and open the PR.

<!-- END AUTO-GENERATED: setup-claude-workflow -->
