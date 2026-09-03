// Keep production auth/data requests on the deployed API even if the host omits build-time env vars.
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:3000/api' : 'https://zynqora-api.onrender.com/api');

function getApiOrigin() {
  try {
    return new URL(API_BASE, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000').origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export function getDefaultAvatar(nameOrUsername?: string | null): string {
  const seed = (nameOrUsername || 'Zynqora User').trim();
  const initial = (seed.charAt(0) || 'Z').toUpperCase();
  const colors = [
    ['#00dfd8', '#7928ca'],
    ['#7928ca', '#ff0080'],
    ['#ff0080', '#f9cb28'],
    ['#0070f3', '#00dfd8'],
    ['#10b981', '#06b6d4'],
  ];
  const charCode = seed.charCodeAt(0) || 0;
  const [c1, c2] = colors[charCode % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="g_${charCode}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#g_${charCode})"/>
    <text x="50" y="62" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="alphabetic">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    return `${getApiOrigin()}${url}`;
  }
  return url;
}

export function getAvatarUrl(user?: { username?: string | null; name?: string | null; profileImage?: string | null; avatarUrl?: string | null } | null): string {
  if (!user) return getDefaultAvatar('Z');
  const img = user.profileImage || user.avatarUrl;
  if (!img || img === '/placeholder-avatar.png') return getDefaultAvatar(user.name || user.username);
  return resolveMediaUrl(img);
}

export function normalizeConnectionUsers(records: any[] | undefined, relation: 'follower' | 'following') {
  if (!Array.isArray(records)) return [];
  return records.map((record) => record?.[relation] ?? record).filter((user) => user?.username && user?.name);
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  profileImage?: string | null;
  bannerImage?: string | null;
  bio?: string | null;
  website?: string | null;
  category?: string | null;
  note?: string | null;
  profileVisibility?: string;
  followersVisibility?: string;
  followingVisibility?: string;
  _count?: { posts: number; followedBy: number; following: number };
  isFollowing?: boolean;
}

export interface Post {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  visibility?: string;
  createdAt: string;
  author: {
    id?: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    profileImage?: string | null;
    bannerImage?: string | null;
  };
  _count?: { likes: number; comments: number };
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id?: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    profileImage?: string | null;
    bannerImage?: string | null;
  };
}

function getToken() {
  return localStorage.getItem('token');
}

async function parseError(res: Response) {
  const body = await res.json().catch(() => ({ message: res.statusText }));
  return Array.isArray(body.message) ? body.message.join(', ') : body.message;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      if (res.status === 401 && !path.startsWith('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
      const message = await parseError(res);
      throw new Error(message || 'Request failed');
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      throw new Error('Cannot connect to backend server. Please verify backend is running on http://localhost:3000.');
    }
    throw err;
  }
}


export const api = {
  signup: (data: { email: string; username: string; password: string; name: string }) =>
    request<{ token: string; user: User; recoveryCode: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  checkUsername: (username: string) =>
    request<{ available: boolean; valid: boolean; message: string }>(`/auth/username-availability?username=${encodeURIComponent(username)}`),
  forgotPassword: (identifier: string, recoveryCode: string) => request<{ message: string; resetToken?: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier, recoveryCode }) }),
  resetPassword: (token: string, password: string) => request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  getProfile: (username: string) => request<User>(`/users/${username}`),

  getFollowers: (username: string) => request<any[]>(`/users/${username}/followers`),
  getFollowing: (username: string) => request<any[]>(`/users/${username}/following`),

  updateProfile: (data: {
    name?: string;
    bio?: string;
    website?: string;
    category?: string;
    note?: string;
    avatarUrl?: string;
    profileImage?: string | null;
    bannerImage?: string | null;
  }) => request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  updatePrivacy: (data: { profileVisibility?: string; followersVisibility?: string; followingVisibility?: string }) =>
    request('/users/me/privacy', { method: 'PATCH', body: JSON.stringify(data) }),

  follow: (username: string) => request(`/users/${username}/follow`, { method: 'POST' }),
  unfollow: (username: string) => request(`/users/${username}/unfollow`, { method: 'POST' }),

  createPost: (data: { content?: string; mediaUrl?: string; mediaType?: string; visibility?: string }) =>
    request<Post>('/posts', { method: 'POST', body: JSON.stringify(data) }),

  getFeed: (cursor?: string) =>
    request<{ posts: Post[]; nextCursor: string | null }>(`/posts/feed${cursor ? `?cursor=${cursor}` : ''}`),

  getUserPosts: (username: string) => request<Post[]>(`/posts/user/${username}`),

  like: (postId: string) => request(`/posts/${postId}/like`, { method: 'POST' }),
  unlike: (postId: string) => request(`/posts/${postId}/like`, { method: 'DELETE' }),
  getLikes: (postId: string) => request<{ count: number; likes: any[] }>(`/posts/${postId}/likes`),

  createComment: (postId: string, content: string) =>
    request<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  getComments: (postId: string) => request<{ count: number; comments: Comment[] }>(`/posts/${postId}/comments`),
  deleteComment: (commentId: string) => request(`/comments/${commentId}`, { method: 'DELETE' }),

  getSuggestions: () => request<User[]>('/suggestions'),
  // Stories
  createStory: (data: { videoUrl: string; thumbnail?: string; caption?: string; visibility?: string }) =>
    request('/stories', { method: 'POST', body: JSON.stringify(data) }),
  getActiveStories: () => request<any[]>('/stories/active'),
  // Chat
  createConversation: (username: string) => request<{ id: string; participants: any[] }>(`/chat/conversation/${username}`, { method: 'POST' }),
  postMessage: (conversationId: string, content: string) =>
    request(`/chat/conversation/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  getMessages: (conversationId: string) => request<any[]>(`/chat/conversation/${conversationId}/messages`),
  updateChatRequest: (conversationId: string, status: 'ACCEPTED' | 'REJECTED') => request<any>(`/chat/conversation/${conversationId}/request/${status}`, { method: 'POST' }),
  // Uploads / presign
  presignUpload: (filename: string, contentType: string) =>
    request<any>('/uploads/presign', { method: 'POST', body: JSON.stringify({ filename, contentType }) }),
  uploadLocal: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getToken();
    return fetch(`${API_BASE}/uploads/local`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: fd,
    }).then(async (r) => {
      if (!r.ok) throw new Error((await parseError(r)) || 'Upload failed');
      return r.json();
    });
  },
  processMedia: (payload: any): Promise<{ publicUrl?: string; processedPath?: string }> =>
    request('/uploads/process', { method: 'POST', body: JSON.stringify(payload) }),
  fetchRemote: (url: string) =>
    request<{ key: string; publicUrl: string }>('/uploads/fetch', { method: 'POST', body: JSON.stringify({ url }) }),
  aiGenerate: (seed?: string, prompt?: string, style?: string, gender?: string) =>
    request<{ key: string; publicUrl: string }>('/uploads/ai-generate', { method: 'POST', body: JSON.stringify({ seed, prompt, style, gender }) }),
  aiGenerateRealistic: (data: { prompt: string; style?: string; seed?: number; gender?: string }) =>
    request<{ key: string; publicUrl: string; prompt?: string; style?: string; gender?: string }>('/uploads/ai-generate-realistic', { method: 'POST', body: JSON.stringify(data) }),
  aiModifyImage: (data: { imageUrl?: string; prompt: string; style?: string; gender?: string }) =>
    request<{ key: string; publicUrl: string; prompt?: string; style?: string; gender?: string }>('/uploads/ai-modify', { method: 'POST', body: JSON.stringify(data) }),
};
