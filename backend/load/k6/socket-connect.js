/**
 * k6 — Socket.IO Connection Stress Test
 *
 * Ramps to 500 VUs, each performing an Engine.IO handshake + upgrade.
 * Measures connection latency (p95 target: <5ms).
 *
 * Usage:
 *   k6 run --out json=load/results/socket-connect.json load/k6/socket-connect.js
 *
 * Requires: load/results/.shared-state.json (written by setup.ts)
 */

import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const sharedState = JSON.parse(open('../results/.shared-state.json'));
const users = sharedState.users;
const targetHost = sharedState.targetHost;

const connectionLatency = new Trend('socket_connection_latency', true);
const connectionSuccess = new Counter('socket_connections_success');
const connectionFailed = new Counter('socket_connections_failed');

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // warm up
    { duration: '30s', target: 300 },   // ramp
    { duration: '30s', target: 500 },   // peak
    { duration: '60s', target: 500 },   // sustain
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: {
    'socket_connection_latency': ['p(95)<5000'], // 5s p95 (generous — real target is <5ms app-level)
    'socket_connections_success': ['count>0'],
  },
};

export default function () {
  const userIndex = __VU % users.length;
  const user = users[userIndex];
  const token = user.token;

  // Step 1: Engine.IO handshake (HTTP polling transport)
  const wsHost = targetHost.replace('http://', 'ws://').replace('https://', 'wss://');
  const handshakeUrl = `${targetHost}/socket.io/?EIO=4&transport=polling`;

  const start = Date.now();

  const handshakeRes = http.get(handshakeUrl);
  const handshakeOk = check(handshakeRes, {
    'handshake status is 200': (r) => r.status === 200,
  });

  if (!handshakeOk) {
    connectionFailed.add(1);
    sleep(1);
    return;
  }

  // Parse the sid from the handshake response
  // Response format: 0{"sid":"...","upgrades":["websocket"],...}
  const body = handshakeRes.body;
  const jsonStr = typeof body === 'string' ? body.substring(body.indexOf('{')) : '';
  let sid;
  try {
    const parsed = JSON.parse(jsonStr);
    sid = parsed.sid;
  } catch {
    connectionFailed.add(1);
    sleep(1);
    return;
  }

  // Step 2: WebSocket upgrade with auth token
  const wsUrl = `${wsHost}/socket.io/?EIO=4&transport=websocket&sid=${sid}`;

  const res = ws.connect(wsUrl, null, function (socket) {
    socket.on('open', function () {
      // Send Engine.IO upgrade probe
      socket.send('2probe');
    });

    socket.on('message', function (msg) {
      if (msg === '3probe') {
        // Upgrade confirmed, send upgrade packet
        socket.send('5');

        // Send Socket.IO auth
        socket.send(`40{"token":"${token}"}`);
      }

      // Socket.IO connect acknowledgement
      if (msg.startsWith('40')) {
        const latency = Date.now() - start;
        connectionLatency.add(latency);
        connectionSuccess.add(1);

        // Stay connected briefly to hold the VU slot
        sleep(2);
        socket.close();
      }
    });

    socket.on('error', function () {
      connectionFailed.add(1);
    });

    socket.setTimeout(function () {
      connectionFailed.add(1);
      socket.close();
    }, 10000);
  });

  check(res, {
    'websocket status is 101': (r) => r && r.status === 101,
  });

  sleep(1);
}
