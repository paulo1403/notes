# Notes

## Platform
web

## Purpose
Personal Markdown notes with simple multi-user access and shareable links. Replaces the ad-hoc Obsidian web server with a proper app: auth, CRUD, attachments on MinIO/S3.

## Users
- **Primary:** Paulo — writes notes daily, shares selected notes via link with a few people.
- **Secondary:** invited readers/collaborators (few accounts), mostly consume shared links; may log in later.

## Jobs
1. Capture and edit Markdown quickly (desktop + tablet, daytime).
2. Share a note via link without requiring the recipient to log in.
3. Attach files (images, PDFs) stored on NAS MinIO.
4. Search own notes by title/body.

## Mechanism
Session-cookie auth + Postgres notes + optional S3 attachments + visibility modes (PRIVATE / LINK / PUBLIC).

## Success
- Faster and clearer than the old Express vault UI.
- Share link works in private browsing.
- Attachments survive MinIO when configured.
- Safe enough for personal + small circle use.

## Constraints
- Open source (MIT), repo `paulo1403/notes`.
- Stack: Astro frontend, Bun/Elysia API, Prisma, PostgreSQL, MinIO S3.
- Deploy on archserver behind Cloudflare tunnel (`notes.paulollanos.dev`).
- Do not rebuild Obsidian (no graph, no bidirectional vault sync in MVP).

## Accessibility
Keyboard-usable editor and navigation; contrast suitable for daytime office/tablet; focus rings visible.

## Open decisions
- Invite flow UX for secondary users (seed/admin-only for now).
- Same-origin API proxy vs separate API host in production.
