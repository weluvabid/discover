/**
 * @deprecated The SQLite-backed API is intentionally disabled in the active
 * application. Its original implementation is retained in `legacy-app.ts` for
 * reference and future evolution; callers must use `live-app.ts` instead.
 */
export type ApiResult = { status: number; body: unknown };

export async function handleApiRequest(..._args: unknown[]): Promise<ApiResult> {
  return {
    status: 501,
    body: {
      error:
        'The local-catalog API is unsupported. Use live Roblox discovery.',
      code: 'LEGACY_CATALOG_UNSUPPORTED',
    },
  };
}
