/**
 * @module __tests__/socket — Socket.IO handshake authentication tests.
 *
 * Verifies that `io.use()` middleware rejects connections with
 * bad/absent tokens, and that valid tokens are accepted.
 * Uses socket.io-client against a temporary HTTP server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app.js';
import { initializeSocket } from '../socket/index.js';
import { cleanDatabase, registerUser } from './setup.js';

let httpServer: HttpServer;
let baseUrl: string;

beforeAll(async () => {
  await cleanDatabase();

  const app = createApp();
  httpServer = createServer(app);
  initializeSocket(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address() as AddressInfo;
      baseUrl = `http://localhost:${String(addr.port)}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await cleanDatabase();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

/** Helper to connect and wait for either connect or error. */
function connectSocket(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      forceNew: true,
      timeout: 5000,
    });

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => {
      socket.disconnect();
      reject(err);
    });
  });
}

describe('Socket.IO handshake authentication', () => {
  it('accepts connection with valid JWT', async () => {
    const { token } = await registerUser({ username: 'socket_valid' });

    const socket = await connectSocket(token);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  it('rejects connection without token', async () => {
    await expect(connectSocket()).rejects.toThrow(/authentication required/i);
  });

  it('rejects connection with invalid token', async () => {
    await expect(connectSocket('totally.invalid.token')).rejects.toThrow(
      /invalid or expired token/i,
    );
  });

  it('rejects connection with malformed JWT', async () => {
    await expect(
      connectSocket('eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UifQ.badsignature'),
    ).rejects.toThrow(/invalid or expired token/i);
  });
});
