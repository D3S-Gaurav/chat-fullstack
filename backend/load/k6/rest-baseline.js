/**
 * k6 — REST Baseline Test
 *
 * Hammers REST endpoints to find the connection pool ceiling.
 * Tests GET /health, GET /api/groups, and mixed reads to
 * determine the max sustained req/sec before pool exhaustion.
 *
 * Usage:
 *   k6 run --out json=load/results/rest-baseline.json load/k6/rest-baseline.js
 *
 * Requires: load/results/.shared-state.json (written by setup.ts)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const sharedState = JSON.parse(open('../results/.shared-state.json'));
const users = sharedState.users;
const targetHost = sharedState.targetHost;

const restLatency = new Trend('rest_request_latency', true);
const restSuccess = new Rate('rest_success_rate');

export const options = {
  stages: [
    { duration: '15s', target: 50 },    // warm up
    { duration: '15s', target: 100 },   // ramp
    { duration: '15s', target: 200 },   // push ceiling
    { duration: '60s', target: 200 },   // sustain ceiling
    { duration: '15s', target: 0 },     // ramp down
  ],
  thresholds: {
    'rest_request_latency': ['p(95)<5000'], // 5s p95 (generous threshold)
    'rest_success_rate': ['rate>0.80'],      // 80% success (pool saturation expected)
  },
};

export default function () {
  const userIndex = __VU % users.length;
  const user = users[userIndex];

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`,
    },
  };

  // Mix of endpoints to simulate realistic read patterns
  const endpoints = [
    { method: 'GET', url: `${targetHost}/health`, auth: false },
    { method: 'GET', url: `${targetHost}/api/groups`, auth: true },
    { method: 'GET', url: `${targetHost}/api/users/me`, auth: true },
  ];

  const endpoint = endpoints[__ITER % endpoints.length];

  let res;
  if (endpoint.auth) {
    res = http.get(endpoint.url, params);
  } else {
    res = http.get(endpoint.url);
  }

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  restSuccess.add(success ? 1 : 0);
  restLatency.add(res.timings.duration);

  sleep(0.05);
}
