# Notes

Open-source Markdown notes app with auth, share links, and S3/MinIO attachments.

**Stack:** Astro · Bun · Elysia · Prisma · PostgreSQL · MinIO (S3)

## Features (MVP)

- Email/password sessions (httpOnly cookie)
- Create / edit / delete Markdown notes
- Search title + body
- Share modes: `PRIVATE` | `LINK` | `PUBLIC`
- Public share page `/s/:token`
- File attachments → MinIO/S3 (presigned GET)

## Repo layout

```
api/          Elysia API (Bun)
web/          Astro static UI
prisma/       schema
```

## Quick start

```bash
cp .env.example .env
# edit DATABASE_URL + S3_* + ADMIN_*

bun install
bunx prisma db push
bun run dev:api   # :3102
bun run dev:web   # :4321 (proxies /api)
```

Default admin (seeded on first API boot):

- email: `paulo@local` (override `ADMIN_EMAIL`)
- password: `changeme` (override `ADMIN_PASSWORD`)

## MinIO / S3 (NAS)

Point env at your MinIO on the NAS:

```env
S3_ENDPOINT=http://192.168.0.52:9000
S3_BUCKET=notes
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_FORCE_PATH_STYLE=true
```

API creates bucket `notes` if missing. If MinIO is down, notes still work; uploads fail gracefully.

## API

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/login` | no |
| POST | `/api/auth/logout` | yes |
| GET | `/api/auth/me` | yes |
| GET | `/api/notes?q=` | yes |
| POST | `/api/notes` | yes |
| GET/PATCH/DELETE | `/api/notes/:id` | yes |
| POST | `/api/notes/:id/share` | yes |
| POST | `/api/notes/:id/attachments` | yes |
| GET | `/api/s/:token` | no |

## License

MIT
