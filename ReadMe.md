# Chat Fullstack

A real-time group chat application built with Express, Prisma, and TypeScript.

## Project Structure

```text
chat-fullstack/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts          # Zod-validated environment config
│   │   │   └── logger.ts       # Pino structured async logger
│   │   │
│   │   ├── database/
│   │   │   └── prisma.ts       # PrismaClient singleton + health check
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT authentication + role-based authz
│   │   │   ├── errorHandler.ts # Custom error classes + global handler
│   │   │   ├── rateLimiter.ts  # Express rate-limiting presets
│   │   │   └── validate.ts     # Zod request validation middleware
│   │   │
│   │   ├── types/
│   │   │   └── api.ts          # AuthUser, Role, Express augmentation
│   │   │
│   │   └── server.ts           # Application entry point
│   │
│   ├── .env.example
│   ├── package.json
│   ├── prisma.config.ts
│   └── tsconfig.json
│
└── frontend/                   # (Not yet implemented)
```
