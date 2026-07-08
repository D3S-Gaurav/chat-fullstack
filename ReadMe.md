<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-7.8-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
</p>

<h1 align="center">💬 ChatFlow</h1>
<p align="center">
  A <strong>production-grade, real-time group chat application</strong> built from scratch with a security-first mindset.<br/>
  Full-stack TypeScript · Socket.IO · Prisma ORM · React 19 · Framer Motion
</p>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Security Hardening](#-security-hardening)
- [What We Did Special](#-what-we-did-special)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Socket.IO Events](#-socketio-events)
- [Database Schema](#-database-schema)

---

## 🌐 Overview

ChatFlow is a **real-time group messaging platform** that demonstrates how to build a production-quality full-stack application without relying on BaaS platforms or shortcuts. Every layer — from password hashing to WebSocket room management — is hand-rolled with intent and security in mind.

This isn't a tutorial project. It's engineered with the same patterns you'd find in production systems: structured logging, graceful shutdown, cursor-based pagination, role-based access control, tiered rate limiting, and a fully typed Socket.IO event contract between client and server.

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        React 19 (Vite)                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │ AuthPage │  │ Sidebar  │  │GroupList  │  │  ChatPanel   │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────────┘  │
│        │              │             │              │            │
│        └──────────────┼─────────────┼──────────────┘            │
│                       │             │                           │
│               ┌───────▼─────────────▼──────────┐               │
│               │  AuthContext · API Client       │               │
│               │  Socket.IO Client Singleton     │               │
│               └───────┬─────────────┬──────────┘               │
└───────────────────────┼─────────────┼──────────────────────────┘
                  REST  │             │  WebSocket
                        ▼             ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Express 5 + Socket.IO                         │
│                                                                   │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │  Middleware Pipeline                                      │    │
│   │  Helmet → CORS → JSON Parser → Global Rate Limiter       │    │
│   └──────────────────────────────┬───────────────────────────┘    │
│                                  │                                │
│   ┌──────────┐  ┌──────────┐  ┌─▼────────┐  ┌──────────────┐    │
│   │ /auth    │  │ /users   │  │ /groups  │  │  /messages   │    │
│   │ register │  │ me       │  │ CRUD     │  │  send/query  │    │
│   │ login    │  │ all(adm) │  │ members  │  │  pagination  │    │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────────┘    │
│        │              │             │              │              │
│   ┌────▼──────────────▼─────────────▼──────────────▼──────────┐  │
│   │  Service Layer (business logic + authorization checks)     │  │
│   └────┬──────────────────────────────────────────────────────┘  │
│        │                                                         │
│   ┌────▼──────────────────────────────────────────────────────┐  │
│   │  Prisma Client (pg adapter, singleton, health check)      │  │
│   └────┬──────────────────────────────────────────────────────┘  │
└────────┼─────────────────────────────────────────────────────────┘
         │
         ▼
   ┌──────────┐
   │PostgreSQL│
   │(Supabase)│
   └──────────┘
```

---

## ✨ Key Features

### Real-Time Messaging
- **WebSocket-powered chat** via Socket.IO with automatic reconnection and transport fallback (WebSocket → polling).
- **Dual delivery path**: Messages are persisted via REST API and simultaneously broadcast to all group members through Socket.IO rooms.
- **Typing indicators** — lightweight fire-and-forget broadcasts with automatic timeout after 2 seconds of inactivity.
- **Online/offline presence** — multi-tab aware. A user only appears "offline" when *all* their browser tabs disconnect.

### Group Management
- **Create, update, and manage groups** with role-based access control (`ADMIN`, `MODERATOR`, `MEMBER`).
- **Admin-gated operations**: Only group admins can add/remove members or update group details.
- **Orphan protection**: The last admin of a group cannot be removed — prevents headless groups.
- **Socket eviction**: When a member is removed via REST, their socket is automatically evicted from the room in real time.
- **Auto-join on connect**: When a socket authenticates, it automatically joins all group rooms the user is a member of.

### Authentication System
- **JWT-based auth** with configurable expiration (`7d` default).
- **scrypt password hashing** using Node.js native `crypto` — no bcrypt dependency needed.
- **Timing-safe comparison** via `timingSafeEqual` to prevent timing attacks on password verification.
- **Session restoration** — tokens are persisted in `localStorage` and validated against `/users/me` on app mount.

### Message Tagging
- **Tag system** with `connectOrCreate` — tags are created on-the-fly if they don't exist, or linked if they do.
- Up to **10 tags per message**, each validated and length-constrained.
- Tags are returned with every message query and displayed inline in the chat UI.

### Cursor-Based Pagination
- Efficient **cursor-based pagination** for message history instead of offset-based.
- Configurable page size (1–100, default 50), newest-first ordering.
- Returns a `nextCursor` for seamless infinite scroll integration.

---

## 🔒 Security Hardening

This project went through **two full security audits**. Here's what's in place:

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **Transport** | HTTPS-ready, CORS origin whitelist | `cors()` with explicit `CORS_ORIGINS` from env |
| **Headers** | Security headers on every response | `helmet()` — CSP, HSTS, X-Frame-Options, etc. |
| **Input** | Every payload validated before processing | Zod schemas on REST body/params/query AND Socket.IO payloads |
| **Auth** | JWT with minimum 32-char secret | Zod-enforced `JWT_SECRET` length at boot |
| **Passwords** | scrypt + 32-byte random salt + timing-safe compare | `node:crypto` — zero external deps |
| **Rate Limiting** | Tiered: Global (100/15m), Auth (10/15m), Message (30/1m) | `express-rate-limit` with draft-8 standard headers |
| **Authorization** | Per-operation membership + role checks | `assertMembership()` / `assertGroupAdmin()` guards |
| **Socket Auth** | JWT verified on every socket handshake | Socket.IO middleware — no event handlers register without valid token |
| **Error Masking** | Stack traces + internal messages hidden in production | Global error handler strips details when `NODE_ENV=production` |
| **Body Size** | Request body capped at 10KB | `express.json({ limit: '10kb' })` |
| **Proxy Trust** | Configurable proxy depth | `TRUST_PROXY` env var, only active in production |
| **Prisma Errors** | Mapped to safe HTTP responses | P2002 → 409, P2025 → 404, prevents ORM leak |
| **Socket Spoofing** | Room-joined check before typing broadcast | `socket.rooms.has(groupId)` guard |
| **Token Expiry** | Distinct 401 with `expired: true` flag | `ExpiredTokenError` class — enables client-side refresh flows |

---

## 🌟 What We Did Special

These are the engineering decisions that set this project apart from a typical CRUD chat app:

### 1. Fully Typed Socket.IO Contract
Every socket event — client-to-server and server-to-client — is defined in a single `types/socket.ts` file with strict TypeScript generics. The Socket.IO server instance uses `Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>`. This means **every `emit()` and `on()` call is compile-time checked** — wrong event names or payload shapes are caught before runtime.

### 2. Zod Validation on Both Channels
Most projects validate REST endpoints but skip socket payloads. We validate **both**. Every `socket.on()` handler runs the incoming payload through a Zod schema before processing. This prevents malformed or malicious data from reaching the service layer through either channel.

### 3. Boot-Time Environment Validation
The server **refuses to start** if any environment variable is missing or malformed. `config/env.ts` parses `process.env` through a Zod schema on boot, producing a fully typed `env` object. No more `process.env.PORT` scattered across the codebase — every access is validated and typed.

### 4. Multi-Tab Presence Tracking
Online/offline status is tracked per-socket, not per-user. The server maintains a `Map<userId, Set<socketId>>`. A `user:online` event fires only on the **first** tab connection, and `user:offline` fires only when the **last** tab disconnects. This prevents the annoying flicker you see in most chat apps when users switch tabs.

### 5. Native Crypto Password Hashing
Instead of pulling in `bcrypt` (which requires native compilation and has platform issues), we use **Node.js built-in `scrypt`** with a 32-byte random salt and 64-byte key length. Password comparison uses `timingSafeEqual` to prevent timing side-channel attacks. Zero external dependencies for auth crypto.

### 6. Clean Service-Layer Architecture
Routes are thin — they validate, call the service, and format the response. All business logic (authorization checks, database queries, error handling) lives in the **service layer**. Both REST routes and Socket.IO handlers reuse the same service functions (e.g., `sendMessage()`, `assertMembership()`), guaranteeing a single source of truth.

### 7. Graceful Shutdown with Timeout
The server handles `SIGINT` and `SIGTERM` signals, closes the HTTP server, disconnects Prisma, and logs the shutdown. If graceful shutdown takes longer than 10 seconds, it **force-exits** to prevent zombie processes in container environments.

### 8. Structured Async Logging
All logging goes through [Pino](https://github.com/pinojs/pino) — the fastest Node.js logger. Logs are structured JSON in production (machine-parseable) and human-readable in development. Every error includes the HTTP method, path, status code, and error object for easy debugging.

### 9. Prisma Driver Adapter Pattern
Instead of using Prisma's default connection handling, we use the **`@prisma/adapter-pg`** driver adapter with explicit SSL configuration. TLS certificate validation is enforced in production but relaxed in development (for self-signed local certs). The client is a global singleton with hot-reload safety.

### 10. Glassmorphism UI with Framer Motion
The frontend uses a **glassmorphism design system** — translucent cards, backdrop blur, soft shadows, and gradient backgrounds. Every interaction is animated via Framer Motion: page transitions, tab indicators with `layoutId`, message entrance animations, typing indicator reveals, and micro-interactions on buttons (`whileHover`, `whileTap`).

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **TypeScript** | 6.0 (Strict) | End-to-end type safety |
| **Express** | 5.x | HTTP server + middleware pipeline |
| **Socket.IO** | 4.8 | Real-time bidirectional communication |
| **Prisma** | 7.8 | Type-safe ORM with PostgreSQL adapter |
| **Zod** | 4.x | Runtime schema validation |
| **Pino** | 10.x | Structured async logging |
| **Helmet** | 8.x | Security headers |
| **jsonwebtoken** | 9.x | JWT signing & verification |
| **express-rate-limit** | 8.x | Tiered rate limiting |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19 | Component library |
| **Vite** | 8.x | Build tool + dev server with HMR |
| **Tailwind CSS** | 4.x | Utility-first styling with custom theme |
| **Framer Motion** | 12.x | Animations and micro-interactions |
| **Lucide React** | 1.x | Icon library |
| **Socket.IO Client** | 4.8 | Real-time client |
| **OxLint** | 1.x | Linting |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **PostgreSQL** | Primary database (via Supabase) |
| **Node.js** | Runtime (ESM, `--env-file` flag) |

---

## 📂 Project Structure

```
chat-fullstack/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/              # Prisma migration history
│   │   └── schema.prisma            # Database models (User, Group, Message, Tag)
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts               # Zod-validated env config (fails fast on boot)
│   │   │   └── logger.ts            # Pino structured async logger
│   │   │
│   │   ├── database/
│   │   │   └── prisma.ts            # PrismaClient singleton + pg adapter + health check
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT authentication + role-based authorization
│   │   │   ├── errorHandler.ts      # AppError hierarchy + global error handler
│   │   │   ├── rateLimiter.ts       # Tiered rate limiting (global/auth/message)
│   │   │   └── validate.ts          # Generic Zod validation middleware
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts       # POST /register, /login
│   │   │   ├── chat.routes.ts       # POST /messages, GET /messages
│   │   │   ├── room.routes.ts       # CRUD /groups + member management
│   │   │   └── user.routes.ts       # GET /users/me, GET /users (admin)
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.schema.ts       # Registration (strong password policy), login
│   │   │   ├── chat.schema.ts       # Message, group, member action schemas
│   │   │   └── socket.schema.ts     # Socket.IO event payload schemas
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts      # Register, login, scrypt hashing, JWT signing
│   │   │   ├── chat.service.ts      # Message send + cursor-based pagination
│   │   │   ├── room.service.ts      # Group CRUD + membership + admin assertions
│   │   │   └── user.service.ts      # User profile lookup
│   │   │
│   │   ├── socket/
│   │   │   ├── handlers/
│   │   │   │   ├── chat.handler.ts  # message:send → validate → persist → broadcast
│   │   │   │   ├── room.handler.ts  # room:join / room:leave with membership guard
│   │   │   │   └── typing.handler.ts # typing:start / typing:stop (fire-and-forget)
│   │   │   └── index.ts             # Socket.IO server setup, JWT middleware, presence
│   │   │
│   │   ├── types/
│   │   │   ├── api.ts               # AuthUser, Role, Express augmentation
│   │   │   └── socket.ts            # Fully typed event maps + payload interfaces
│   │   │
│   │   └── server.ts                # Application entry point + graceful shutdown
│   │
│   ├── .env.example                 # Environment variable template
│   ├── prisma.config.ts             # Prisma CLI configuration
│   ├── package.json
│   └── tsconfig.json                # Strict mode, ESNext, NodeNext module
│
└── frontend/
    ├── public/                      # Static assets
    ├── src/
    │   ├── components/
    │   │   ├── ChatPanel.tsx         # Message display, input, typing indicator
    │   │   ├── GroupList.tsx          # Group listing, search, create dialog
    │   │   └── Sidebar.tsx           # User profile, navigation, logout
    │   │
    │   ├── context/
    │   │   └── AuthContext.tsx        # JWT token management + session restoration
    │   │
    │   ├── lib/
    │   │   ├── api.ts                # Typed fetch wrapper + endpoint definitions
    │   │   └── socket.ts             # Socket.IO client singleton
    │   │
    │   ├── pages/
    │   │   ├── AuthPage.tsx          # Login/Register with animated tab switching
    │   │   └── ChatPage.tsx          # 3-column layout (sidebar/groups/chat)
    │   │
    │   ├── App.tsx                   # Root component with auth-gated routing
    │   ├── index.css                 # Tailwind v4 theme (custom palette + glassmorphism)
    │   └── main.tsx                  # React DOM entry
    │
    ├── index.html                   # SEO meta tags, Inter font, favicon
    ├── vite.config.ts               # Dev proxy (/api + /socket.io → backend)
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 22 (for `--env-file` flag support)
- **PostgreSQL** instance (local or [Supabase](https://supabase.com))
- **npm** ≥ 10

### 1. Clone the repository

```bash
git clone https://github.com/D3S-Gaurav/chat-fullstack.git
cd chat-fullstack
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database URL, JWT secret, etc.

npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

The backend runs on `http://localhost:3000` by default.

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` and `/socket.io` to the backend.

### 4. Open in browser

Navigate to `http://localhost:5173` — register an account, create a group, and start chatting.

---

## 🔐 Environment Variables

Create a `backend/.env` file based on `.env.example`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment (`development` / `production` / `test`) |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed origins |
| `JWT_SECRET` | **Yes** | — | Minimum 32 characters |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry duration |
| `TRUST_PROXY` | No | `1` | Number of reverse proxies to trust |

---

## 📡 API Reference

All endpoints return `{ success: boolean, data: T }`. Errors return `{ success: false, statusCode, message }`.

### Authentication
| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/api/auth/register` | — | 10/15min | Create account |
| `POST` | `/api/auth/login` | — | 10/15min | Get JWT token |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/users/me` | Bearer | Current user profile |
| `GET` | `/api/users` | Bearer (ADMIN) | List all users |

### Groups
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/groups` | Bearer | My groups |
| `POST` | `/api/groups` | Bearer | Create group |
| `GET` | `/api/groups/:id` | Bearer | Group details + members |
| `PATCH` | `/api/groups/:id` | Bearer (ADMIN) | Update group |
| `POST` | `/api/groups/:id/members` | Bearer (ADMIN) | Add member |
| `DELETE` | `/api/groups/:id/members/:userId` | Bearer (ADMIN/self) | Remove member |

### Messages
| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/api/messages` | Bearer | 30/1min | Send message |
| `GET` | `/api/messages?groupId=&cursor=&limit=` | Bearer | — | Paginated history |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server + database health check |

---

## 🔌 Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ groupId, content, tags? }` | Send message (validated + persisted) |
| `room:join` | `{ groupId }` | Subscribe to a group room |
| `room:leave` | `{ groupId }` | Unsubscribe from a group room |
| `typing:start` | `{ groupId }` | Broadcast typing indicator |
| `typing:stop` | `{ groupId }` | Clear typing indicator |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `{ id, content, createdAt, sender, groupId, tags }` | New message broadcast |
| `room:joined` | `{ groupId, userId, username }` | User joined notification |
| `room:left` | `{ groupId, userId, username }` | User left notification |
| `typing:start` | `{ groupId, userId, username }` | Someone is typing |
| `typing:stop` | `{ groupId, userId, username }` | Someone stopped typing |
| `user:online` | `{ userId, username }` | User came online |
| `user:offline` | `{ userId, username }` | User went offline |
| `error` | `{ message }` | Server-side error notification |

---

## 🗄 Database Schema

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     User     │     │    Group     │     │     Tag      │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id       (PK)│     │ id       (PK)│     │ id       (PK)│
│ username (UQ)│     │ name         │     │ name     (UQ)│
│ email    (UQ)│     │ description? │     │              │
│ passwordHash │     │ createdAt    │     │              │
│ role         │     │              │     │              │
│ createdAt    │     │              │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  ┌─────────────────┤                    │
       │  │                 │                    │
       ▼  ▼                 │                    │
┌──────────────┐            │              ┌─────┴────────┐
│ GroupMember   │            │              │  _MessageTag  │
├──────────────┤            │              │  (implicit)   │
│ id       (PK)│            │              ├──────────────┤
│ userId   (FK)│            │              │ messageId    │
│ groupId  (FK)│            │              │ tagId        │
│ role         │            │              └──────────────┘
│              │            │                    ▲
│ @@unique     │            │                    │
│ [userId,     │            ▼               ┌────┘
│  groupId]    │     ┌──────────────┐       │
└──────────────┘     │   Message    │       │
                     ├──────────────┤       │
                     │ id       (PK)│       │
                     │ content      │───────┘
                     │ createdAt    │
                     │ senderId (FK)│
                     │ groupId  (FK)│
                     │              │
                     │ @@index      │
                     │ [groupId,    │
                     │  createdAt]  │
                     └──────────────┘
```

**Indexes:**
- `GroupMember(groupId)` — fast member lookups per group
- `Message(groupId, createdAt)` — optimized cursor-based pagination
- `Message(senderId)` — fast sender-based queries
- `GroupMember(userId, groupId)` — unique constraint prevents duplicate memberships

---

## 📄 License

ISC

---

<p align="center">
  Built with ☕ and intention — not scaffolded, not AI-generated boilerplate.<br/>
  Every line of code exists for a reason.
</p>
