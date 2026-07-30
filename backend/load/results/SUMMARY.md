# Load Test Results — Summary

> **⚠️ NOT YET MEASURED**
> This template will be populated with real numbers after running the k6 suite.
> Do not cite these as results until the JSON artifacts exist in this directory.

## Results

| Metric | Target | Measured | Date |
|--------|--------|----------|------|
| WebSocket connections (VUs) | 500 | — | — |
| Message throughput (events/sec) | ~550 | — | — |
| Connection latency (p95) | <5ms | — | — |
| REST ceiling (req/sec) | ~150 | — | — |

## Infrastructure

| Parameter | Value |
|-----------|-------|
| Hardware | *update after test run* |
| PostgreSQL `max_connections` | 100 (default) |
| Prisma `connection_limit` | 10 |
| Node.js version | 22.x |
| PostgreSQL version | 17 |

## Methodology

1. **Setup**: `npm run load:setup` provisions 50 users, 10 groups, assigns members round-robin
2. **Socket Connect**: `npm run load:socket` — Engine.IO handshake + WS upgrade, ramp 0→500 VUs over 90s, sustain 60s
3. **Message Throughput**: `npm run load:messages` — sustained POST /api/messages at 200 VUs for 60s
4. **REST Baseline**: `npm run load:rest` — mixed GET endpoints at 200 VUs for 60s
5. **Teardown**: `npm run load:teardown` clears all seeded data

## Raw Output

After running, the following JSON files will appear in this directory:

- `socket-connect.json` — k6 JSON output for connection stress test
- `message-throughput.json` — k6 JSON output for message throughput test
- `rest-baseline.json` — k6 JSON output for REST baseline test

Commit these alongside this summary to provide verifiable evidence.
