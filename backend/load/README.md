# Load Testing — ChatFlow

k6-based load testing harness for the ChatFlow backend.

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed (`brew install k6` / `apt install k6`)
- Backend running (`npm run dev` or `docker compose up`)
- Database seeded with test data (step 1 below)

## Quick Start

```bash
# 1. Provision test users + groups
npm run load:setup

# 2. Run individual tests
npm run load:socket      # WebSocket connection stress
npm run load:messages    # Message throughput
npm run load:rest        # REST endpoint ceiling

# 3. Clean up test data
npm run load:teardown
```

## Scripts

| Script | What it does |
|--------|-------------|
| `load:setup` | Registers 50 users, creates 10 groups, assigns members |
| `load:socket` | Ramps to 500 VUs doing Engine.IO handshake + WS upgrade |
| `load:messages` | Sustained POST /api/messages at 200 VUs |
| `load:rest` | Mixed GET endpoints at 200 VUs to find pool ceiling |
| `load:teardown` | Truncates all seeded data |

## Configuration

Edit `harness/config.ts` to change:
- `TARGET_HOST` — default `http://localhost:3000`
- `USER_COUNT` — default 50
- `GROUP_COUNT` — default 10
- `MEMBERS_PER_GROUP` — default 10

## Results

Raw k6 JSON output is written to `results/`. After running, update `results/SUMMARY.md` with measured numbers and commit both the JSON and the summary.

See [results/SUMMARY.md](results/SUMMARY.md) for the results template.

## Architecture

```
load/
├── harness/
│   ├── config.ts      ← tunables + infra constants
│   ├── setup.ts       ← provisions users + groups via REST API
│   └── teardown.ts    ← truncates all seeded rows
├── k6/
│   ├── socket-connect.js      ← WS handshake + upgrade stress
│   ├── message-throughput.js  ← sustained message send
│   └── rest-baseline.js       ← REST endpoint ceiling
└── results/
    ├── SUMMARY.md     ← measured numbers (update after run)
    └── .gitkeep
```
