/**
 * @module load/harness/config — Central configuration for load tests.
 *
 * All tunables in one place. k6 scripts read the shared state
 * file written by setup.ts; this config determines how many
 * users, groups, and messages that setup creates.
 */

/** Target host for load tests. */
export const TARGET_HOST = process.env['LOAD_TARGET'] ?? 'http://localhost:3000';

/** Number of test users to provision. */
export const USER_COUNT = 50;

/** Number of groups to create. */
export const GROUP_COUNT = 10;

/** Members per group (users are distributed round-robin). */
export const MEMBERS_PER_GROUP = 10;

/** Password for all provisioned test users. */
export const TEST_PASSWORD = 'LoadTest1!';

/** Path to shared state file (setup writes, k6 reads). */
export const SHARED_STATE_PATH = new URL('../results/.shared-state.json', import.meta.url).pathname;

/**
 * Infrastructure constants — document these alongside results
 * so the bottleneck claim is verifiable.
 */
export const INFRA = {
  /** PostgreSQL max_connections (default: 100). */
  pgMaxConnections: 100,
  /** Prisma connection_limit (from adapter config). */
  prismaConnectionLimit: 10,
  /** Hardware description. */
  hardware: 'UPDATE THIS — e.g. "M2 MacBook Air, 8GB RAM" or "t3.medium, 2 vCPU, 4GB"',
} as const;
