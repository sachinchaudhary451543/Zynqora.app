const pageOrigin = typeof window === 'undefined' ? 'https://zynqora.netlify.app' : window.location.origin;

export function resolveApiBase(configured: string | undefined, isDevelopment: boolean, origin: string) {
  const base = configured?.trim() || (isDevelopment
    ? 'http://localhost:3000/api'
    : 'https://zynqora-api-production.up.railway.app/api');
  return new URL(base, origin).toString().replace(/\/$/, '');
}

export const API_BASE = resolveApiBase(
  import.meta.env.VITE_API_BASE,
  import.meta.env.DEV,
  pageOrigin,
);

export const API_ORIGIN = new URL(API_BASE).origin;
