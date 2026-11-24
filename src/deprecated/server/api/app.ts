/**
 * The SQLite-backed API is intentionally disabled. Its original implementation
 * is retained in `legacy-app.ts` for reference; callers must use `live-app.ts`.
 */
export type ApiResult = { status: number; body: unknown };

/** @deprecated Use the live RoTunnel API instead. */
export async function handleApiRequest(..._args: unknown[]): Promise<ApiResult> {
  return {
    status: 501,
    body: {
      error: 'The local-catalog API is unsupported. Use live Roblox discovery.',
      code: 'LEGACY_CATALOG_UNSUPPORTED',
    },
  };
}
