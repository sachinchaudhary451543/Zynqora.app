import { API_BASE, API_ORIGIN } from './config';

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
    return `${API_ORIGIN}${url}`;
  }
  return url;
}

export function getAvatarUrl(user?: { username?: string | null; name?: string | null; profileImage?: string | null; avatarUrl?: string | null } | null): string {
  if (!user) return getDefaultAvatar('Z');
  const img = user.profileImage || user.avatarUrl;
  if (!img || img === '/placeholder-avatar.png') return getDefaultAvatar(user.name || user.username);
  const resolved = resolveMediaUrl(img);
  try {
    const hostname = new URL(resolved).hostname;
    if (new URL(resolved).pathname.startsWith('/uploads/') &&
      (hostname.endsWith('.onrender.com') || hostname.endsWith('.up.railway.app') || hostname.endsWith('.netlify.app'))) {
      return getDefaultAvatar(user.name || user.username);
    }
  } catch {
    return getDefaultAvatar(user.name || user.username);
  }
  return resolved;
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
  interests?: string[];
  notifySocialActivity?: boolean;
  notifyCircleActivity?: boolean;
  weeklyDigestEnabled?: boolean;
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
  musicUrl?: string | null;
  musicType?: string | null;
  visibility?: string;
  circleId?: string | null;
  circle?: {
    id: string;
    slug: string;
    name: string;
    icon?: string | null;
  } | null;
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

export interface CircleActivityIdea {
  templateId: string;
  kind: 'EVENT' | 'GAME' | 'TOURNAMENT' | 'ACTIVITY';
  title: string;
  description: string;
  durationMinutes: number;
  mode: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  reason: string;
}

export interface CircleEventDraft {
  kind?: CircleActivityIdea['kind'];
  mode?: CircleActivityIdea['mode'];
  gameMode?: 'EXTERNAL' | 'NATIVE_TRIVIA';
  title: string;
  description?: string;
  startsAt: string;
  location?: string;
  gameUrl?: string;
  capacity?: number;
  durationMinutes?: number;
  tournamentFormat?: 'SINGLE_ELIMINATION' | 'ROUND_ROBIN';
  templateId?: string;
  rounds?: Array<{ prompt: string; choices: string[]; answerIndex: number }>;
}

export interface CircleEventGame {
  id: string;
  title: string;
  startsAt: string;
  closesAt: string;
  canPlay: boolean;
  rounds: Array<{ id: string; position: number; prompt: string; choices: string[] }>;
  score: number | null;
  leaderboard: Array<{ score: number; username: string | null; name: string }>;
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

async function requestOnce<T>(path: string, options: RequestInit = {}): Promise<T> {
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
      const message = await parseError(res);
      throw Object.assign(new Error(message || 'Request failed'), { status: res.status });
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      throw new Error('Could not reach Zynqora. Check your connection and try again.');
    }
    throw err;
  }
}

type AuthResponse = { token: string; refreshToken: string; user: User };

let refreshInFlight: Promise<AuthResponse> | null = null;

function clearAuthSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth-session-expired'));
}

function refreshSession(refreshToken = localStorage.getItem('refreshToken') || ''): Promise<AuthResponse> {
  if (!refreshToken) {
    clearAuthSession();
    return Promise.reject(new Error('Your session has expired. Please sign in again.'));
  }

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).then(async (res) => {
      if (!res.ok) {
        const message = await parseError(res);
        clearAuthSession();
        throw new Error(message || 'Your session has expired. Please sign in again.');
      }
      const auth = await res.json() as AuthResponse;
      localStorage.setItem('token', auth.token);
      localStorage.setItem('refreshToken', auth.refreshToken);
      localStorage.setItem('user', JSON.stringify(auth.user));
      window.dispatchEvent(new CustomEvent('auth-session-refreshed', { detail: auth.user }));
      return auth;
    }).catch((error: unknown) => {
      if (error instanceof TypeError) {
        throw new Error('Cannot connect to the authentication service. Check your connection and try again.');
      }
      throw error;
    }).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await requestOnce<T>(path, options);
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: number }).status
      : undefined;
    const canRefresh = status === 401
      && (path === '/auth/me' || !path.startsWith('/auth/'))
      && Boolean(getToken());
    if (!canRefresh) throw error;
    if (!localStorage.getItem('refreshToken')) {
      clearAuthSession();
      throw error;
    }

    await refreshSession();
    try {
      return await requestOnce<T>(path, options);
    } catch (retryError) {
      const retryStatus = typeof retryError === 'object' && retryError !== null && 'status' in retryError
        ? (retryError as { status?: number }).status
        : undefined;
      if (retryStatus === 401) clearAuthSession();
      throw retryError;
    }
  }
}


export const api = {
  signup: (data: { email: string; username: string; password: string; name: string; interests?: string[] }) =>
    request<{ token: string; refreshToken: string; user: User; recoveryCode: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  loginWithGoogle: (idToken: string) =>
    request<{ token: string; refreshToken: string; user: User; recoveryCode?: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
  getGoogleAuthChallenge: () =>
    request<{ nonce: string }>('/auth/google/challenge', { method: 'POST' }),
  refresh: (refreshToken: string) => refreshSession(refreshToken),
  getCurrentUser: () => request<User>('/auth/me'),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  checkUsername: (username: string) =>
    request<{ available: boolean; valid: boolean; message: string }>(`/auth/username-availability?username=${encodeURIComponent(username)}`),
  forgotPassword: (identifier: string, recoveryCode: string) => request<{ message: string; resetToken?: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier, recoveryCode }) }),
  resetPassword: (token: string, password: string) => request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  getProfile: (username: string) => request<User>(`/users/${username}`),

  getFollowers: (username: string, cursor?: string) => request<any[]>(`/users/${username}/followers${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  getFollowing: (username: string, cursor?: string) => request<any[]>(`/users/${username}/following${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  getNotifications: () => request<any[]>('/users/me/notifications'),
  getWeeklyDigest: () => request<{ from: string; to: string; socialActivity: number; circleActivity: number }>('/users/me/digest'),
  registerDeviceToken: (data: { token: string; platform: 'android' | 'ios' }) =>
    request<{ id: string; token: string; platform: string }>('/users/me/device-tokens', { method: 'POST', body: JSON.stringify(data) }),
  removeDeviceToken: (token: string) =>
    request<{ removed: boolean }>('/users/me/device-tokens/current', { method: 'DELETE', body: JSON.stringify({ token }) }),

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
  getPreferences: () => request<{ interests: string[]; notifySocialActivity: boolean; notifyCircleActivity: boolean; weeklyDigestEnabled: boolean }>('/users/me/preferences'),
  updatePreferences: (data: { interests?: string[]; notifySocialActivity?: boolean; notifyCircleActivity?: boolean; weeklyDigestEnabled?: boolean }) =>
    request<{ interests: string[]; notifySocialActivity: boolean; notifyCircleActivity: boolean; weeklyDigestEnabled: boolean }>('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAccount: () => request<{ deleted: boolean }>('/users/me', { method: 'DELETE' }),

  follow: (username: string) => request(`/users/${username}/follow`, { method: 'POST' }),
  unfollow: (username: string) => request(`/users/${username}/unfollow`, { method: 'POST' }),

  getCircles: () => request<Array<{ id: string; slug: string; name: string; description: string | null; category: string; icon: string | null; memberCount: number; postCount: number | null; isMember: boolean; recommended: boolean }>>('/circles'),
  createCircle: (data: { name: string; category: string; description: string }) =>
    request<{ id: string; slug: string; name: string; description: string; category: string; icon: null; memberCount: number; postCount: number; isMember: boolean; recommended: boolean }>('/circles', { method: 'POST', body: JSON.stringify(data) }),
  getCircle: (slug: string) => request<{
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string | null;
    icon: string | null;
    memberCount: number;
    postCount: number;
    isMember: boolean;
    members: Array<{ id: string; username: string; name: string; avatarUrl: string | null; profileImage?: string | null; category?: string | null }>;
    events: Array<{
      id: string;
      kind: CircleActivityIdea['kind'];
      mode: CircleActivityIdea['mode'];
      gameMode: 'EXTERNAL' | 'NATIVE_TRIVIA';
      gameRoundCount: number;
      status: 'UPCOMING' | 'LIVE' | 'ENDED';
      title: string;
      description: string | null;
      startsAt: string;
      location: string | null;
      gameUrl: string | null;
      capacity: number | null;
      durationMinutes: number | null;
      tournamentFormat: 'SINGLE_ELIMINATION' | 'ROUND_ROBIN' | null;
      participantCount: number;
      isGoing: boolean;
      attendees: Array<{ id: string; username: string; name: string; avatarUrl: string | null; profileImage?: string | null }>;
      creator: { id: string; username: string; name: string };
    }>;
    activityIdeas: CircleActivityIdea[];
    pinnedPosts: Array<{ postId: string; createdAt: string; pinnedBy: { username: string }; post: Post }>;
    prompt: null | { id: string; title: string; body: string; category: string; endsAt: string; participantCount: number; isParticipating: boolean };
  }>(`/circles/${encodeURIComponent(slug)}`),
  createCircleEvent: (slug: string, data: CircleEventDraft) =>
    request(`/circles/${encodeURIComponent(slug)}/events`, { method: 'POST', body: JSON.stringify(data) }),
  joinCircleEvent: (slug: string, eventId: string) =>
    request<{ going: boolean; eventId: string }>(`/circles/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/rsvp`, { method: 'POST' }),
  leaveCircleEvent: (slug: string, eventId: string) =>
    request<{ going: boolean; eventId: string }>(`/circles/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/rsvp`, { method: 'DELETE' }),
  getCircleEventGame: (slug: string, eventId: string) =>
    request<CircleEventGame>(`/circles/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/game`),
  submitCircleEventGame: (slug: string, eventId: string, answers: number[]) =>
    request<{ score: number; totalRounds: number; submittedAt: string }>(`/circles/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/game/submission`, { method: 'POST', body: JSON.stringify({ answers }) }),
  setPromptParticipation: (slug: string, promptId: string, participating: boolean) =>
    request<{ participating: boolean }>(`/circles/${encodeURIComponent(slug)}/prompts/${encodeURIComponent(promptId)}/participation`, { method: 'POST', body: JSON.stringify({ participating }) }),
  pinCirclePost: (slug: string, postId: string) =>
    request(`/circles/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}/pin`, { method: 'POST' }),
  unpinCirclePost: (slug: string, postId: string) =>
    request<{ unpinned: boolean }>(`/circles/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}/pin`, { method: 'DELETE' }),
  joinCircle: (slug: string) => request<{ joined: boolean; slug: string }>(`/circles/${encodeURIComponent(slug)}/join`, { method: 'POST' }),
  leaveCircle: (slug: string) => request<{ joined: boolean; slug: string }>(`/circles/${encodeURIComponent(slug)}/leave`, { method: 'DELETE' }),

  createPost: (data: { content?: string; mediaUrl?: string; mediaType?: string; musicUrl?: string; musicType?: string; visibility?: string; circleId?: string }) =>
    request<Post>('/posts', { method: 'POST', body: JSON.stringify(data) }),
  deletePost: (postId: string) => request<{ deleted: boolean }>(`/posts/${postId}`, { method: 'DELETE' }),

  getFeed: (cursor?: string, circle?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (circle && circle !== 'all') params.set('circle', circle);
    const qs = params.toString();
    return request<{ posts: Post[]; nextCursor: string | null }>(`/posts/feed${qs ? `?${qs}` : ''}`);
  },

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
  getActiveStories: (cursor?: string) => request<any[]>(`/stories/active${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  getUserStories: (username: string, cursor?: string) => request<any[]>(`/stories/${username}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  // Chat
  createConversation: (username: string) => request<{ id: string; participants: any[] }>(`/chat/conversation/${username}`, { method: 'POST' }),
  getConversations: () => request<Array<{ id: string; status: string; requesterId?: string; lastMessage: any; user: User }>>('/chat/conversations'),
  postMessage: (conversationId: string, content: string) =>
    request(`/chat/conversation/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  getMessages: (conversationId: string, afterId?: string) =>
    request<any[]>(`/chat/conversation/${conversationId}/messages${afterId ? `?after=${encodeURIComponent(afterId)}` : ''}`),
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
  uploadMedia: async (file: File): Promise<{ key?: string; publicUrl: string }> => {
    const upload = await api.presignUpload(file.name, file.type || 'application/octet-stream');
    if (upload.method !== 'PUT') {
      const localUpload = await api.uploadLocal(file);
      return { ...localUpload, publicUrl: resolveMediaUrl(localUpload.publicUrl) };
    }

    const response = await fetch(upload.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
    if (!response.ok) {
      throw new Error(`Media upload failed (${response.status}). Please try again.`);
    }
    return { key: upload.key, publicUrl: upload.publicUrl };
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
