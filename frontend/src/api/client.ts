export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    return `http://localhost:3000${url}`;
  }
  return url;
}

export function getAvatarUrl(user?: { profileImage?: string | null; avatarUrl?: string | null } | null): string {
  if (!user) return '/placeholder-avatar.png';
  const img = user.profileImage || user.avatarUrl;
  if (!img) return '/placeholder-avatar.png';
  return resolveMediaUrl(img);
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  profileImage?: string | null;
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
  };
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  signup: (data: { email: string; username: string; password: string; name: string }) =>
    request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

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
    }).then((r) => r.json());
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


