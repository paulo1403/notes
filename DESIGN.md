---
name: Notes
description: Dark writing studio for open-source Markdown notes — write, share, attach.
colors:
  ink: "#dadce0"
  ink-soft: "#9aa0a8"
  muted: "#636b78"
  line: "#2a2d35"
  panel: "#1c1e24"
  panel-deep: "#14161b"
  paper: "#0e0f14"
  accent: "#d08770"
  accent-hover: "#dba48b"
  accent-soft: "#2a1f1c"
  danger: "#e06c75"
  focus: "#7cb8e8"
  light-ink: "#1c1e26"
  light-paper: "#fafbfc"
  light-panel: "#f0f1f4"
  light-accent: "#ae6b50"
typography:
  ui:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    letterSpacing: "-0.025em"
rounded:
  sm: "4px"
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
---

## Overview

**Mode: Operate.** Dark writing studio inspired by Obsidian's compositional grammar — narrow sidebar rail, spacious dark canvas, warm-amber accent. Not a clone: open palette, lighter chrome, share-first.

**World:** Dark studio (deep charcoal canvas, paper-black surface). Light toggle for daytime via CSS class swap (user-controlled, persisted in localStorage).

## Key decisions

- **Sidebar (280px)** as persistent navigation rail, not hamburger or card grid.
- **Note list as flat file stack** — title + badge, no date clutter in list; date in editor status.
- **Editor split** 50/50 at ≥800px, stacked below. Monospace in edit pane.
- **Theme toggle ◐** in sidebar head, persisted.
- **Save via Cmd+S**, status bar shows "Saved" / "Unsaved".
- **Preview** is rendered locally (rough Markdown), no server round-trip.
- **warm-amber accent** reserved for primary actions and active selection.
- **Inter** throughout. Monospace only inside code blocks and editor textarea.

## What this is not

- Not a dashboard. No metric tiles, no cards, no progress indicators.
- Not a dark-only app. Light theme exists and is intentional.
- Not an Obsidian clone. Single-note focus, not graph/plugin ecosystem.
