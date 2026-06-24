export const apiClient = {
  async fetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('openclaw_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(path, { ...options, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body?.error || res.statusText;
      throw new Error(message);
    }
    return res.json();
  },

  getSSEUrl(sessionId: string) {
    return `/plugins/web-channel/api/sse?sessionId=${sessionId}`;
  },
};
