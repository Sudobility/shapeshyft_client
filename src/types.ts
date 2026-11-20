/**
 * Local types for shapeshyft_client
 */

/**
 * Firebase ID token for authentication
 */
export type FirebaseIdToken = string;

/**
 * A personal API key (`shyft_...`) that authenticates its owner against the
 * ShapeShyft admin routes, as an alternative to a Firebase ID token.
 *
 * TODO: these three types are declared here so this package builds against
 * @sudobility/shapeshyft_types <= 1.0.53. Once 1.0.54 is published, delete them
 * and import UserApiKey / UserApiKeyCreated / CurrentUser from the types package
 * instead -- the definitions are identical.
 */
export interface UserApiKey {
  /** Unique identifier for this key record */
  uuid: string;
  /** Firebase UID of the owner */
  firebase_uid: string;
  /** Human-readable label, e.g. "CLI on my laptop" */
  key_name: string;
  /** First characters of the key, for display (e.g. "shyft_ab12cd") */
  key_prefix: string;
  /** Whether the key is accepted; a deactivated key fails authentication */
  is_active: boolean;
  /** ISO 8601 timestamp of the most recent authenticated request, or null */
  last_used_at: string | null;
  /** ISO 8601 timestamp when the key was created */
  created_at: string | null;
  /** ISO 8601 timestamp of the most recent update */
  updated_at: string | null;
}

/**
 * Response from creating a personal API key -- the only response that returns
 * the secret without being asked.
 */
export interface UserApiKeyCreated extends UserApiKey {
  /** The full `shyft_...` key */
  api_key: string;
}

/** Identity of the authenticated caller, from `GET /users/me`. */
export interface CurrentUser {
  /** Firebase UID of the caller */
  firebase_uid: string;
  /** Caller's email, or null when unavailable */
  email: string | null;
  /** Whether the caller is a site admin */
  siteAdmin: boolean;
  /** Which credential authenticated this request */
  auth_method: 'firebase' | 'api_key';
  /** Display name from the Firebase profile, or null */
  display_name: string | null;
}

/** Payload for creating a personal API key. */
export interface UserApiKeyCreateRequest {
  key_name: string;
}

/** Payload for updating a personal API key. */
export interface UserApiKeyUpdateRequest {
  key_name?: string;
  is_active?: boolean;
}

/**
 * Query key types for TanStack Query
 */
export const QUERY_KEYS = {
  keys: (entitySlug: string) => ['shapeshyft', 'keys', entitySlug] as const,
  key: (entitySlug: string, keyId: string) =>
    ['shapeshyft', 'keys', entitySlug, keyId] as const,
  // Site-wide (platform) LLM keys, site-admin only
  siteKeys: () => ['shapeshyft', 'siteKeys'] as const,
  siteKey: (keyId: string) => ['shapeshyft', 'siteKeys', keyId] as const,
  projects: (entitySlug: string) =>
    ['shapeshyft', 'projects', entitySlug] as const,
  project: (entitySlug: string, projectId: string) =>
    ['shapeshyft', 'projects', entitySlug, projectId] as const,
  endpoints: (entitySlug: string, projectId: string) =>
    ['shapeshyft', 'endpoints', entitySlug, projectId] as const,
  endpoint: (entitySlug: string, projectId: string, endpointId: string) =>
    ['shapeshyft', 'endpoints', entitySlug, projectId, endpointId] as const,
  analytics: (entitySlug: string) =>
    ['shapeshyft', 'analytics', entitySlug] as const,
  settings: (userId: string) => ['shapeshyft', 'settings', userId] as const,
  userApiKeys: (userId: string) =>
    ['shapeshyft', 'userApiKeys', userId] as const,
  currentUser: () => ['shapeshyft', 'currentUser'] as const,
  storageConfig: (entitySlug: string) =>
    ['shapeshyft', 'storageConfig', entitySlug] as const,
  // Entity query keys
  entities: () => ['shapeshyft', 'entities'] as const,
  entity: (entitySlug: string) =>
    ['shapeshyft', 'entities', entitySlug] as const,
  entityMembers: (entitySlug: string) =>
    ['shapeshyft', 'entities', entitySlug, 'members'] as const,
  entityInvitations: (entitySlug: string) =>
    ['shapeshyft', 'entities', entitySlug, 'invitations'] as const,
  myInvitations: () => ['shapeshyft', 'invitations', 'mine'] as const,
  // Rate limit query keys
  rateLimitsConfig: () => ['shapeshyft', 'ratelimits', 'config'] as const,
  rateLimitsHistory: (periodType: string) =>
    ['shapeshyft', 'ratelimits', 'history', periodType] as const,
  // Provider query keys (public, no auth needed)
  providers: () => ['shapeshyft', 'providers'] as const,
  provider: (providerId: string) =>
    ['shapeshyft', 'providers', providerId] as const,
  providerModels: (providerId: string) =>
    ['shapeshyft', 'providers', providerId, 'models'] as const,
} as const;
