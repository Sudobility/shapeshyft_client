import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BaseResponse,
  NetworkClient,
  Optional,
  SiteLlmApiKeyCreateRequest,
  SiteLlmApiKeySafe,
  SiteLlmApiKeyUpdateRequest,
} from '@sudobility/shapeshyft_types';
import type { FirebaseIdToken } from '../types';
import { ShapeshyftClient } from '../network/ShapeshyftClient';
import { QUERY_KEYS } from '../types';

// Stable empty array to prevent unnecessary re-renders
const EMPTY_SITE_KEYS: SiteLlmApiKeySafe[] = [];

/**
 * Return type for the {@link useSiteKeys} hook.
 */
export interface UseSiteKeysReturn {
  /** Array of site-wide LLM API keys (empty array while loading or on error) */
  keys: SiteLlmApiKeySafe[];
  /** True while any query or mutation is in progress */
  isLoading: boolean;
  /** Error message string from the most recent failed query or mutation, or null if no error */
  error: Optional<string>;

  /** Trigger a refetch of the keys list from the server */
  refetch: () => void;
  /** Fetch a single site-wide key by ID. Returns a BaseResponse (does not throw on error). */
  getKey: (keyId: string) => Promise<BaseResponse<SiteLlmApiKeySafe>>;
  /** Create a new site-wide LLM API key. Automatically invalidates the keys list on success. */
  createKey: (
    data: SiteLlmApiKeyCreateRequest
  ) => Promise<BaseResponse<SiteLlmApiKeySafe>>;
  /** Update an existing site-wide key. Automatically invalidates the keys list on success. */
  updateKey: (
    keyId: string,
    data: SiteLlmApiKeyUpdateRequest
  ) => Promise<BaseResponse<SiteLlmApiKeySafe>>;
  /** Delete a site-wide key. Automatically invalidates the keys list on success. */
  deleteKey: (keyId: string) => Promise<BaseResponse<SiteLlmApiKeySafe>>;

  /** Clear any mutation error state (query errors are cleared on next successful fetch) */
  clearError: () => void;
  /** Remove all cached query data and clear errors. The query will re-fetch if still enabled. */
  reset: () => void;
}

/**
 * Hook for managing site-wide (platform) LLM API keys. Only site admins can
 * read or manage these; the backend returns 403 otherwise. At invocation an
 * active site-wide key for a provider is used as a fallback when an entity has
 * not supplied its own key for that provider.
 *
 * Uses TanStack Query for caching with automatic refresh after mutations.
 *
 * @param networkClient - NetworkClient instance for making HTTP requests
 * @param baseUrl - Base URL of the ShapeShyft API
 * @param token - Firebase ID token for authentication, or null to disable fetching
 * @param options - Optional configuration
 * @param options.testMode - When true, appends testMode=true to all API requests
 * @param options.enabled - When false, disables automatic fetching (default: true)
 * @returns {@link UseSiteKeysReturn} with keys data, loading/error state, and CRUD methods
 *
 * @example
 * ```tsx
 * const { keys, isLoading, error, createKey, deleteKey } = useSiteKeys(
 *   networkClient,
 *   'https://api.shapeshyft.ai',
 *   firebaseToken
 * );
 * await createKey({ key_name: 'Platform OpenAI', provider: 'openai', api_key: 'sk-...' });
 * ```
 */
export const useSiteKeys = (
  networkClient: NetworkClient,
  baseUrl: string,
  token: FirebaseIdToken | null,
  options?: {
    testMode?: boolean;
    enabled?: boolean;
  }
): UseSiteKeysReturn => {
  const testMode = options?.testMode ?? false;
  const enabled = (options?.enabled ?? true) && !!token;

  const client = useMemo(
    () => new ShapeshyftClient({ baseUrl, networkClient, testMode }),
    [baseUrl, networkClient, testMode]
  );

  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.siteKeys(),
    queryFn: async () => {
      if (!token) throw new Error('Missing required params');
      const response = await client.getSiteKeys(token);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch site keys');
      }
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const invalidateKeys = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.siteKeys() });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (data: SiteLlmApiKeyCreateRequest) => {
      if (!token) throw new Error('Missing required params');
      return client.createSiteKey(data, token);
    },
    onSuccess: response => {
      if (response.success) invalidateKeys();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      keyId,
      data,
    }: {
      keyId: string;
      data: SiteLlmApiKeyUpdateRequest;
    }) => {
      if (!token) throw new Error('Missing required params');
      return client.updateSiteKey(keyId, data, token);
    },
    onSuccess: response => {
      if (response.success) invalidateKeys();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      if (!token) throw new Error('Missing required params');
      return client.deleteSiteKey(keyId, token);
    },
    onSuccess: response => {
      if (response.success) invalidateKeys();
    },
  });

  const getKey = useCallback(
    async (keyId: string): Promise<BaseResponse<SiteLlmApiKeySafe>> => {
      if (!token) throw new Error('Missing required params');
      try {
        return await client.getSiteKey(keyId, token);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get site key';
        return {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        };
      }
    },
    [client, token]
  );

  const createKey = useCallback(
    (data: SiteLlmApiKeyCreateRequest) => createMutation.mutateAsync(data),
    [createMutation]
  );

  const updateKey = useCallback(
    (keyId: string, data: SiteLlmApiKeyUpdateRequest) =>
      updateMutation.mutateAsync({ keyId, data }),
    [updateMutation]
  );

  const deleteKey = useCallback(
    (keyId: string) => deleteMutation.mutateAsync(keyId),
    [deleteMutation]
  );

  const mutationError =
    createMutation.error ?? updateMutation.error ?? deleteMutation.error;
  const error =
    queryError instanceof Error
      ? queryError.message
      : mutationError instanceof Error
        ? mutationError.message
        : null;

  const clearError = useCallback(() => {
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
  }, [createMutation, updateMutation, deleteMutation]);

  const reset = useCallback(() => {
    queryClient.removeQueries({ queryKey: QUERY_KEYS.siteKeys() });
    clearError();
  }, [queryClient, clearError]);

  return useMemo(
    () => ({
      keys: data ?? EMPTY_SITE_KEYS,
      isLoading:
        isLoading ||
        createMutation.isPending ||
        updateMutation.isPending ||
        deleteMutation.isPending,
      error,
      refetch,
      getKey,
      createKey,
      updateKey,
      deleteKey,
      clearError,
      reset,
    }),
    [
      data,
      isLoading,
      createMutation.isPending,
      updateMutation.isPending,
      deleteMutation.isPending,
      error,
      refetch,
      getKey,
      createKey,
      updateKey,
      deleteKey,
      clearError,
      reset,
    ]
  );
};
