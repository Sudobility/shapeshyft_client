# ShapeShyft Client

> **Git policy — never auto-commit or auto-push.** Leave work in the working tree. Run
> `git commit`, `git push`, or `gh pr create` **only when the user explicitly asks in that
> turn**. Approval for an earlier change does not carry forward. Stay on the current branch;
> do not create feature branches for code changes.

React client library for the ShapeShyft API: a typed `ShapeshyftClient` network class plus
TanStack Query hooks. npm name `@sudobility/shapeshyft_client`.

## Tech Stack

- TypeScript (strict), target ES2020, module ESNext, `moduleResolution: bundler`, ESM output.
- **Bun** runtime + package manager (do not use npm/yarn/pnpm to install deps).
- Build: `tsc -p tsconfig.build.json` then `node scripts/fix-esm-imports.mjs` (adds `.js`
  extensions to relative ESM imports in `dist/`).
- Server state: TanStack React Query 5. Tests: Vitest + React Testing Library (jsdom).

## Commands

```bash
bun run build        # tsc build + ESM import fixup -> dist/
bun run build:watch  # watch build
bun run clean        # rm -rf dist
bun run test:unit    # run tests once   (NOTE: there is no `test` script)
bun run test:watch   # vitest watch
bun run typecheck    # tsc --noEmit
bun run lint         # eslint src
bun run lint:fix     # eslint --fix
bun run format       # prettier write
bun run verify       # typecheck + lint + test:unit + build (pre-commit gate)
```

## Project Structure

```
src/
  index.ts                    # Public exports (network, hooks, utils, types, endpoint-payloads)
  types.ts                    # QUERY_KEYS + local types (FirebaseIdToken, UserApiKey*, CurrentUser)
  endpoint-payloads.ts        # EndpointCreate/UpdatePayload (carries provider binding fields)
  hooks/                      # One hook per resource (+ *.test.ts), re-exported from hooks/index.ts
  network/ShapeshyftClient.ts # API client class (~1900 lines, ~50 methods); hooks delegate to it
  utils/shapeshyft-helpers.ts # createHeaders/createAuthHeaders/createApiKeyHeaders, buildUrl,
                              #   buildQueryString, handleApiError, ShapeshyftApiError
```

## Hooks

`useKeys`, `useProjects`, `useEndpoints`, `useAnalytics`, `useSettings`, `useUserApiKeys`,
`useAiExecute`, `useEntities`, `useProviders` + `useProviderModels`, `useStorageConfig`.

### Signature (uniform)

```typescript
useKeys(
  networkClient,   // NetworkClient from @sudobility/di
  baseUrl,         // API base URL string
  entitySlug,      // scope param; null disables fetching
  token,           // FirebaseIdToken (string) | null; null disables fetching
  options?,        // { testMode?: boolean; enabled?: boolean }
)
```

`enabled = (options?.enabled ?? true) && !!scopeParam && !!token`. `useEndpoints` takes an
extra `projectId` scope; `useAiExecute`/`useEntities`/`useProviders` have no entity scope.

### Return shape (uniform — do not break it)

`{ <data>, isLoading, error, refetch, clearError, reset, ...mutations }`

- Data field (e.g. `keys`) defaults to a module-level stable `EMPTY_X` constant or `null`,
  never `undefined`. **Do not inline `[]` as a default** (causes re-renders).
- `isLoading` is true during the query OR any mutation.
- `error` is coalesced to `string | null` from query/mutation errors.
- `refetch` (not `refresh`) re-runs the query; `clearError` resets mutation errors; `reset`
  removes cached queries + clears errors.
- Mutation methods return `BaseResponse<T>` and do not throw.

`shapeshyft_lib`'s manager hooks depend on this exact shape.

## ShapeshyftClient

Constructed with a **config object**: `new ShapeshyftClient({ baseUrl, networkClient,
testMode })`. All HTTP goes through `networkClient` (never direct `fetch`) so tests can mock
it. Authenticated endpoints use `createAuthHeaders(token)`; provider endpoints are public;
AI/personal-key routes can use `createApiKeyHeaders`. Methods return `BaseResponse<T>`.

## QUERY_KEYS (src/types.ts)

All keys are prefixed `['shapeshyft', ...]`. Notable: `rateLimitsConfig()` takes **no** args;
`rateLimitsHistory(periodType)`; `userApiKeys(userId)`; `currentUser()`; `settings(userId)`;
`providers()` / `provider(id)` / `providerModels(id)`. Entity-scoped: keys, projects,
endpoints, storageConfig, entities(+members/invitations). Add new keys here when adding a hook.

## Patterns

- Query config: `staleTime` 5 min, `gcTime` 30 min, `enabled` null-gated. Tests disable retry.
- CRUD mutations invalidate relevant query caches in `onSuccess`.
- `useSettings` uses `setQueryData()` (optimistic) instead of invalidation.
- `useProviderModels` uses `placeholderData: keepPreviousData` to avoid empty flashes.
- `useStorageConfig` returns `null` on 404 instead of throwing.
- `useAiExecute` is mutation-only (no cache); its params are path-based names, not UUIDs.
- Scoping: keys/projects/endpoints/storage are entity-scoped; analytics/settings/userApiKeys
  are user-scoped; providers are global/public.

## Adding a Hook

1. `src/hooks/useThing.ts` with the uniform signature + return shape; add an `EMPTY_X` const.
2. Add query key(s) to `QUERY_KEYS` in `src/types.ts`.
3. Add method(s) to `ShapeshyftClient` returning `BaseResponse<T>`.
4. Export from `src/hooks/index.ts` (and `src/index.ts` if needed).
5. Add `src/hooks/useThing.test.ts` using `MockNetworkClient` from `@sudobility/di/mocks`
   wrapped in a `QueryClientProvider` (`queries.retry: false`).

## Peer Dependencies

Required in consuming apps: `react` >=18, `@tanstack/react-query` >=5,
`@sudobility/shapeshyft_types`, `@sudobility/types`, `@sudobility/di`.

## Publishing & Downstream

- `publishConfig.access` is **public**, but `@sudobility/*` resolves to **GitHub Packages**
  (`.npmrc` → `https://npm.pkg.github.com`), not npmjs. Install needs a `read:packages` token.
- CI (`.github/workflows/ci-cd.yml`, `publish-target: github`) publishes on push to
  `main`/`develop` via the reusable `johnqh/workflows` pipeline. Do not run `npm publish` by
  hand unless asked. `prepublishOnly` = clean + build.
- Downstream consumers: `shapeshyft_lib` (direct peer dep, wraps hooks in Zustand stores) and
  `shapeshyft_app` (transitive). After a change, run `bun run verify`, bump + publish, then
  `bun update @sudobility/shapeshyft_client` and rebuild in the consumers.

## Gotchas

- **No `test` script** — use `bun run test:unit` / `test:watch`.
- `types.ts` locally declares `UserApiKey*`/`CurrentUser` only until `@sudobility/shapeshyft_types`
  ships them (see the TODO there); import from the types package once available.
- Hooks take a `NetworkClient`, not raw `fetch`.
