/** API client for the chat backend. */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class ApiError extends Error {
  /* Fields are declared and assigned explicitly rather than via constructor
     parameter properties, which `erasableSyntaxOnly` disallows. */
  readonly statusCode: number;
  readonly fields: unknown;

  constructor(statusCode: number, message: string, fields?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, json.message ?? 'Request failed', json.fields);
  }

  return (json as ApiResponse<T>).data;
}

/** Auth endpoints. */
export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    request<{ user: AuthUser; token: string }>('/auth/register', { method: 'POST', body }),

  login: (body: { email: string; password: string }) =>
    request<{ user: AuthUser; token: string }>('/auth/login', { method: 'POST', body }),
};

/** Group endpoints. */
export const groupApi = {
  getMyGroups: (token: string) =>
    request<Group[]>('/groups', { token }),

  getGroup: (id: string, token: string) =>
    request<GroupDetail>(`/groups/${id}`, { token }),

  createGroup: (body: { name: string; description?: string }, token: string) =>
    request<Group>('/groups', { method: 'POST', body, token }),

  updateGroup: (id: string, body: { name?: string; description?: string }, token: string) =>
    request<Group>(`/groups/${id}`, { method: 'PATCH', body, token }),

  addMember: (groupId: string, userId: string, token: string) =>
    request<unknown>(`/groups/${groupId}/members`, { method: 'POST', body: { userId }, token }),

  removeMember: (groupId: string, userId: string, token: string) =>
    request<unknown>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE', token }),
};

/** Message endpoints. */
export const messageApi = {
  getMessages: (groupId: string, token: string, cursor?: string, limit = 50) => {
    const params = new URLSearchParams({ groupId, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return request<{ messages: Message[]; nextCursor?: string }>(`/messages?${params.toString()}`, { token });
  },

  sendMessage: (body: { groupId: string; content: string; tags?: string[] }, token: string) =>
    request<Message>('/messages', { method: 'POST', body, token }),
};

/** User endpoints. */
export const userApi = {
  getMe: (token: string) =>
    request<AuthUser>('/users/me', { token }),
};

// ── Shared Types ────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  createdAt?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { members: number; messages: number };
}

/**
 * `GET /groups/:id` selects only `_count.messages`, whereas the list endpoint
 * (`GET /groups`) also returns `_count.members`. The narrower shape cannot
 * extend `Group` directly, so `_count` is omitted and redeclared.
 */
export interface GroupDetail extends Omit<Group, '_count'> {
  members: { userId: string; role: string; user: { id: string; username: string } }[];
  _count: { messages: number };
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  groupId: string;
  sender: { id: string; username: string };
  tags: { name: string }[];
}

export { ApiError };
