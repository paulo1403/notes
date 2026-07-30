---
name: Notes
description: Daylight drafting-table UI for Markdown notes — write, share, attach.
colors:
  ink: "#1a1f26"
  ink-soft: "#3d4654"
  muted: "#5c6672"
  line: "#d5dbe3"
  line-strong: "#b8c0cc"
  paper: "#ffffff"
  desk: "#e8ecf1"
  desk-deep: "#dce2ea"
  accent: "#0f5c4c"
  accent-hover: "#0a463a"
  accent-soft: "#e4f2ee"
  danger: "#b42318"
  danger-soft: "#fdecea"
  focus: "#1d6fd8"
typography:
  ui:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.45
  body:
    fontFamily: "\"Source Serif 4\", Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  display:
    fontFamily: "\"Public Sans\", system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

## Overview

**Mode: Operate.** Daytime office/tablet writing desk.

**World: daylight drafting table.** Cool stone desk chrome, pure paper writing surface, deep forest accent for primary actions only. The note surface is the product; chrome is quiet infrastructure.

**Thesis:** Refuse SaaS card grids and neon-on-void dashboards. One paper sheet, a thin rail of tools, list as stacked sheets — not metric tiles.

## Colors

- Desk (`#e8ecf1`) for page chrome; paper white for content.
- Ink near-black; muted cool slate for secondary (tinted from ink, not pure gray-on-white failure).
- Accent forest green reserved for primary CTA, selected state, share-active.
- Danger red only for destructive actions.
- Focus ring cobalt, 2px offset, never color-only.

## Typography

- **Public Sans** for UI chrome (nav, buttons, labels, lists).
- **Source Serif 4** for note body and public share reading.
- Fixed rem scale; display ≤ ~1.75rem in app chrome.
- Body measure ~65–72ch in reading views.

## Layout

- App shell: top bar + main column (max ~1080px) on tablet/desktop; full-bleed paper on phone.
- Editor: split MD | preview ≥900px; stacked below.
- List: full-width sheet rows, not equal card grids.
- More space above headings than below.

## Elevation & Depth

- Paper sits 1 step above desk: soft offset shadow `0 1px 2px rgb(26 31 38 / 0.06), 0 8px 24px rgb(26 31 38 / 0.06)`.
- No glow halos. Borders 1px line color.

## Shapes

- Controls `10px` radius; chips `999px`.
- Inputs and buttons share the same radius family.

## Components

- Primary button: solid accent, white label, hover darkens accent.
- Secondary: paper fill, line border, ink label.
- Danger: text/outline only until confirm.
- Focus-visible: 2px focus ring on all interactive controls.
- Empty list: instructional copy + primary “New note”.
- Share control shows visibility badge; copy link when LINK/PUBLIC.

## Do's and Don'ts

**Do**
- Keep writing surface calm and high-contrast.
- Prefer keyboard save (⌘/Ctrl+S) and visible status text.
- Use serif only where the user is reading the note.

**Don't**
- Don't use icon+title+blurb card grids as page structure.
- Don't costume the UI in monospace “hacker” chrome.
- Don't put heavy accent on inactive list rows.
- Don't use glassmorphism or gradient text.
