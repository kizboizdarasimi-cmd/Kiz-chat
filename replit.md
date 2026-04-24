# Buzz — Social Video & Chat

A mobile-first social platform combining TikTok-style video, WhatsApp-style chat, and Instagram-style social features.

## Stack

- **Monorepo:** pnpm workspace
- **Frontend:** React 19 + Vite (`artifacts/social-app`), wouter for routing, TanStack Query, Framer Motion, Tailwind v4 + shadcn-style tokens, lucide-react icons
- **Auth:** Clerk (Replit-managed) with shadcn theme
- **Backend:** Express 5 + Clerk middleware (`artifacts/api-server`)
- **DB:** PostgreSQL via Drizzle ORM (`lib/db`)
- **API contract:** OpenAPI 3.1 (`lib/api-spec/openapi.yaml`) → orval codegen → zod schemas (`lib/api-zod`) and React Query hooks (`lib/api-client-react`)

## Architecture notes

- Frontend uses `import.meta.env.BASE_URL` for routing/Clerk URLs.
- Clerk Frontend API is proxied at `/api/__clerk` in production.
- API auto-creates a DB user on first authenticated request, mapping `clerkId → users.id`.
- Real-time chat uses polling (`refetchInterval`) — no WebSockets to keep things simple.
- Online presence is derived from `lastSeenAt` updated on every authenticated request.
- Typing indicators live in their own `typing_state` table with a 4s freshness window.
- Counters (followers, likes, etc.) are denormalized on the user/video tables and updated transactionally.

## Features

- Auth (Clerk email + Google), onboarding, profile editing, verification request.
- Vertical scroll-snap video feed with For You / Following tabs, autoplay-on-visible, double-tap to like, comments bottom-sheet.
- Video upload from URL or local file, auto thumbnail extraction.
- Profiles with verified badge, follow/unfollow, follower/following counts, video grid.
- Search users, Explore (Trending/Newest videos, Trending people).
- 1:1 chat with read receipts, typing indicators, online presence, voice + text + emoji messages, offline outbox.
- Notification center with unread badge.

## Common commands

```bash
pnpm --filter @workspace/api-spec run codegen   # regenerate API hooks + zod
pnpm --filter @workspace/db run push            # push DB schema (dev)
pnpm --filter @workspace/scripts run seed       # seed demo users + videos
pnpm run typecheck                              # full repo typecheck
```

## Demo seed users

`zara`, `kai`, `rio_eats`, `novaftw`, `milo`, `aria` — each with sample videos and a random follow graph.
