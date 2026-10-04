# Notes

## Product

Notes is a private, phone-first PWA for quick notes and checklists — the
core of Google Keep without accounts, sync or a server. Everything lives in
the browser's IndexedDB, encrypted when the app lock is on, and nothing
about the user leaves the device.

## Platform

web - PWA, mobile-only (like routines and trainer).

## Note types

Exactly two, each with an optional title:

- **Text note** — a plain-text body. No formatting, no images. The web
  links in the body are listed below it as tappable chips that open in the
  browser (a textarea can't hold a tappable link); there is no fetched
  preview (it would need a server and leak the URLs).
- **Checklist** — a list of items, each a line of text with a checkbox.
  Checked items drop below the unchecked ones into a collapsible
  "Checked items" section, as in Keep; unchecking moves an item back up.
  Items nest one level deep, as in Keep: the focused item can be nested
  under the one above (or un-nested); checking a parent checks its
  children, unchecking a child unchecks its parent, and Backspace on an
  empty nested item un-nests it before removing it.
  Each item has a drag handle on the left to reorder it (a parent moves
  together with its children) and a delete button on the right. A
  "+ List item" row ends the unchecked items, as in Keep; Enter on an
  item also adds a new one below. An item that contains a web link gets a
  button that opens it.

A note with neither a title nor any content is discarded instead of saved.

## Behavior

- **List.** One column of note cards. A card shows the title (if any) and
  a preview of the body or the first few checklist items. New and edited
  notes go to the top; the order can then be changed manually.
- **Reordering.** Long-press a card and drag it to move it, as in Keep.
  The order is kept (a pinned note can only move within the pinned
  section, an unpinned one within the rest).
- **Pinning.** Pinned notes sit in their own "Pinned" section above the
  rest.
- **Search.** Filters the list by title, text body and checklist items.
- **Editing.** Opening a note edits it in place; changes save
  automatically, with no "Save" button. A bar along the bottom has undo and
  redo (a quick burst of typing is one step; they last for the editing
  session), when the note was last edited, and a "More" menu: make a copy,
  switch between text and checklist ("Show/Hide checkboxes", which can be
  undone) and delete.
- **Deleting.** Permanent, after a confirmation — there is no archive and
  no trash, so there is no undo either. Applies to notes and, via its
  delete button, to checklist items (items go without a confirmation —
  they are one line each).
- **Settings** (a drawer, as in routines): language (English/Polish), app
  lock, backup export/import, install and update.

## Out of scope, on purpose

Text formatting, link previews, images, drawings, audio, labels/tags/hashtags, note
colors, reminders, archive, trash, sharing and sync.

## Design direction

The ecosystem's shared theme (`@maat-apps/ui/theme.css`): true black and
white on Outfit, quiet and monochrome, generous touch targets. No per-note
colors.
