# Chat Fullstack

```text
chat-fullstack/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   │
│   │   ├── database/
│   │   │   └── prisma.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── chat.routes.ts
│   │   │   └── room.routes.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── room.service.ts
│   │   │   └── user.service.ts
│   │   │
│   │   ├── socket/
│   │   │   ├── handlers/
│   │   │   │   ├── chat.handler.ts
│   │   │   │   ├── room.handler.ts
│   │   │   │   └── typing.handler.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.schema.ts
│   │   │   └── chat.schema.ts
│   │   │
│   │   ├── types/
│   │   │   ├── api.ts
│   │   │   ├── chat.ts
│   │   │   └── socket.ts
│   │   │
│   │   └── server.ts
│   │
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── prisma.config.js
│
└── frontend/
```
