# @sudobility/shapeshyft_client

React client library for the ShapeShyft API: a typed `ShapeshyftClient` network class plus
TanStack Query hooks for LLM API keys, projects, endpoints, AI execution, analytics, settings,
entities, providers, and storage config.

## Installation

Scoped `@sudobility/*` packages are published to **GitHub Packages**, not the public npm
registry. The included `.npmrc` already points `@sudobility:registry` at
`https://npm.pkg.github.com`; a read token with `read:packages` must be available (e.g. via
`~/.npmrc` or the `GH_PACKAGES_READ_TOKEN` env/secret) to install.

```bash
bun add @sudobility/shapeshyft_client
```

### Peer dependencies

Install these in the consuming app:

- `react` >= 18
- `@tanstack/react-query` >= 5
- `@sudobility/shapeshyft_types` — ShapeShyft type definitions
- `@sudobility/types` — shared common types
- `@sudobility/di` — provides the `NetworkClient` interface (and `MockNetworkClient` for tests)

## Usage

```typescript
import { useKeys } from '@sudobility/shapeshyft_client';

const { keys, isLoading, error, refetch, createKey, deleteKey } = useKeys(
  networkClient,            // NetworkClient from @sudobility/di
  'https://api.shapeshyft.com',
  'my-org',                 // entitySlug — pass null to disable fetching
  firebaseToken,            // FirebaseIdToken (string) — pass null to disable fetching
  { testMode: false, enabled: true } // optional
);

await createKey({ key_name: 'OpenAI', provider: 'openai', api_key: 'sk-...' });
```

All hooks share the same leading parameters — `(networkClient, baseUrl, scopeParam, token,
options?)` — where `options` is `{ testMode?: boolean; enabled?: boolean }`. A `null`
scope param or `token` disables fetching; `enabled: false` also disables it.

Direct use of the network class is possible but rare:

```typescript
import { ShapeshyftClient } from '@sudobility/shapeshyft_client';

const client = new ShapeshyftClient({ baseUrl, networkClient, testMode: false });
const response = await client.getKeys('my-org', firebaseToken);
```

## Hooks

| Hook | Purpose | Scope param |
|------|---------|-------------|
| `useKeys` | LLM API key CRUD | `entitySlug` |
| `useProjects` | Project CRUD + project API key | `entitySlug` |
| `useEndpoints` | Endpoint CRUD within a project | `entitySlug` + `projectId` |
| `useAnalytics` | Usage analytics (query only) | `entitySlug` |
| `useSettings` | User settings (optimistic update) | `userId` |
| `useUserApiKeys` | Personal `shyft_...` API key CRUD | `userId` |
| `useAiExecute` | AI inference (mutation only, no cache) | — |
| `useEntities` | Entity/org CRUD + members + invitations | — |
| `useProviders` | Public provider list (query only) | — |
| `useProviderModels` | Models for a provider (keepPreviousData) | `providerId` |
| `useStorageConfig` | Entity cloud storage config | `entitySlug` |

Each hook returns a consistent shape: `{ <data>, isLoading, error, refetch, clearError, reset }`
plus its CRUD methods. `error` is a coalesced `string | null`; data fields default to a stable
empty array/null (never undefined).

## Development

```bash
bun install
bun run build         # Build to dist/ (tsc + ESM import fixup)
bun run build:watch   # Watch-mode build
bun run test:unit     # Run tests once (Vitest)
bun run test:watch    # Vitest watch mode
bun run typecheck     # tsc --noEmit
bun run lint          # ESLint
bun run lint:fix      # ESLint with --fix
bun run format        # Prettier write
bun run verify        # typecheck + lint + test:unit + build (run before committing)
```

Use **Bun** as the package manager; do not use npm/yarn/pnpm to install dependencies.

## Architecture

```
shapeshyft_client (this package)
    ^  peer dependency
shapeshyft_lib (business logic, Zustand stores)
    ^
shapeshyft_app (frontend consumer)
```

Hooks delegate to the `ShapeshyftClient` class, which routes all HTTP through the injected
`NetworkClient` (enabling mocking in tests). `shapeshyft_lib` wraps these hooks in Zustand
stores and depends on the exact return shape above.

## Publishing

Publishing is handled by CI (`.github/workflows/ci-cd.yml`, `publish-target: github`): pushing
a version bump to `main`/`develop` publishes to GitHub Packages. `prepublishOnly` runs
`clean` + `build`.

## License

BUSL-1.1
