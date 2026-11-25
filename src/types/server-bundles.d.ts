/**
 * Generated server bundles are produced by `pnpm api:build` before Vercel
 * packages the API function. Keep their HTTP boundary typed for Astro checks.
 */
declare module '*.mjs' {
  export function handleLiveRequest(request: Request): Promise<Response>;
}
