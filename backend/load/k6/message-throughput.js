/**
 * k6 — Message Throughput Test
 *
 * Sustained message send via REST API (POST /api/messages) and
 * measures events/sec throughput. Each VU sends messages to a
 * group they are a member of.
 *
 * Usage:
 *   k6 run --out json=load/results/message-throughput.json load/k6/message-throughput.js
 *
 * Requires: load/results/.shared-state.json (written by setup.ts)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const sharedState = JSON.parse(open('../results/.shared-state.json'));
const users = sharedState.users;
const groups = sharedState.groups;
const targetHost = sharedState.targetHost;

const messageLatency = new Trend('message_send_latency', true);
const messageSuccess = new Rate('message_success_rate');

export const options = {
  stages: [
    { duration: '15s', target: 50 },    // warm up
    { duration: '15s', target: 150 },   // ramp
    { duration: '60s', target: 200 },   // sustain peak
    { duration: '15s', target: 0 },     // ramp down
  ],
  thresholds: {
    'message_send_latency': ['p(95)<2000'], // 2s p95
    'message_success_rate': ['rate>0.90'],   // 90% success
  },
};

export default function () {
  const userIndex = __VU % users.length;
  const user = users[userIndex];
  const groupIndex = __VU % groups.length;
  const group = groups[groupIndex];

  const payload = JSON.stringify({
    groupId: group.id,
    content: `Load test message from VU ${__VU} iter ${__ITER} at ${Date.now()}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`,
    },
  };

  const res = http.post(`${targetHost}/api/messages`, payload, params);

  const success = check(res, {
    'message send status is 201': (r) => r.status === 201,
    'response has message id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.id;
      } catch {
        return false;
      }
    },
  });

  messageSuccess.add(success ? 1 : 0);
  messageLatency.add(res.timings.duration);

  // Brief pause to avoid pure CPU-spin
  sleep(0.1);
}
