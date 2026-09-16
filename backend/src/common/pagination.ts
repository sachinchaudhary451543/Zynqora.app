export type CursorPageOptions = {
  cursor?: string;
  limit?: number;
  maxLimit?: number;
};

export function buildCursorPageArgs({ cursor, limit, maxLimit = 50 }: CursorPageOptions) {
  const normalizedLimit = Number.isFinite(limit) ? Number(limit) : 20;
  const safeLimit = Math.min(Math.max(Math.round(normalizedLimit), 1), maxLimit);

  return {
    take: safeLimit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}
