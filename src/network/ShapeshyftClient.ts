import type {
  AiExecutionResponse,
  AiPromptResponse,
  AnalyticsResponse,
  BaseResponse,
  Endpoint,
  EndpointQueryParams,
  EntityStorageConfig,
  GetApiKeyResponse,
  LlmApiKeyCreateRequest,
  LlmApiKeySafe,
  LlmApiKeyUpdateRequest,
  LlmProvider,
  NetworkClient,
  Project,
  ProjectCreateRequest,
  ProjectQueryParams,
  ProjectUpdateRequest,
  ProviderConfig,
  ProviderModelsResponse,
  RefreshApiKeyResponse,
  SiteLlmApiKeyCreateRequest,
  SiteLlmApiKeySafe,
  SiteLlmApiKeyUpdateRequest,
  StorageConfigCreateRequest,
  StorageConfigUpdateRequest,
  UsageAnalyticsQueryParams,
  UserSettings,
  UserSettingsUpdateRequest,
} from '@sudobility/shapeshyft_types';
import type {
  EndpointCreatePayload,
  EndpointUpdatePayload,
} from '../endpoint-payloads';
import type {
  CreateEntityRequest,
  Entity,
  EntityInvitation,
  EntityMember,
  EntityRole,
  EntityWithRole,
  InviteMemberRequest,
  RateLimitHistoryData,
  RateLimitPeriodType,
  RateLimitsConfigData,
  UpdateEntityRequest,
} from '@sudobility/types';
import type {
  CurrentUser,
  FirebaseIdToken,
  UserApiKey,
  UserApiKeyCreated,
  UserApiKeyCreateRequest,
  UserApiKeyUpdateRequest,
} from '../types';
import {
  buildQueryString,
  buildUrl,
  createApiKeyHeaders,
  createAuthHeaders,
  createHeaders,
  handleApiError,
} from '../utils/shapeshyft-helpers';

/**
 * Configuration for creating a {@link ShapeshyftClient} instance.
 */
export interface ShapeshyftClientConfig {
  /** Base URL of the ShapeShyft API (e.g., "https://api.shapeshyft.com") */
  baseUrl: string;
  /** Network client implementing the NetworkClient interface from @sudobility/di */
  networkClient: NetworkClient;
  /** When true, appends `testMode=true` query parameter to all API requests */
  testMode?: boolean;
}

/**
 * ShapeShyft API client.
 * Provides typed methods for all ShapeShyft API endpoints including
 * LLM key management, project/endpoint CRUD, AI execution, entity
 * management, analytics, settings, rate limits, and provider queries.
 *
 * All authenticated endpoints require a Firebase ID token.
 * AI execution endpoints optionally accept a project API key.
 * Provider endpoints are public and require no authentication.
 *
 * @example
 * ```typescript
 * import { ShapeshyftClient } from '@sudobility/shapeshyft_client';
 *
 * const client = new ShapeshyftClient({
 *   baseUrl: 'https://api.shapeshyft.com',
 *   networkClient: myNetworkClient,
 *   testMode: false,
 * });
 *
 * const keys = await client.getKeys('my-org', firebaseToken);
 * ```
 */
export class ShapeshyftClient {
  private readonly baseUrl: string;
  private readonly networkClient: NetworkClient;
  private readonly testMode: boolean;

  constructor(config: ShapeshyftClientConfig) {
    this.baseUrl = config.baseUrl;
    this.networkClient = config.networkClient;
    this.testMode = config.testMode ?? false;
  }

  /**
   * Get test mode params to append to all requests
   */
  private getTestModeParams(): Record<string, string> {
    return this.testMode ? { testMode: 'true' } : {};
  }

  /**
   * Build URL with optional test mode params
   */
  private buildUrlWithTestMode<T extends object>(
    path: string,
    existingParams?: T
  ): string {
    const testModeParams = this.getTestModeParams();
    const allParams = { ...existingParams, ...testModeParams };
    const hasParams = Object.keys(allParams).length > 0;
    const queryString = hasParams ? buildQueryString(allParams) : '';
    return buildUrl(this.baseUrl, `${path}${queryString}`);
  }

  // =============================================================================
  // LLM API KEYS (Firebase auth required, entity-scoped)
  // =============================================================================

  /**
   * Get all LLM API keys for an entity.
   * GET /api/v1/entities/:entitySlug/keys
   *
   * @param entitySlug - URL-safe slug identifying the entity (e.g., "my-org")
   * @param token - Firebase ID token for authentication
   * @returns Response containing an array of safe key objects (API key values are masked)
   * @throws {ShapeshyftApiError} If the request fails (e.g., 401 unauthorized, 404 entity not found)
   */
  async getKeys(
    entitySlug: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<LlmApiKeySafe[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<LlmApiKeySafe[]>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/keys`
      ),
      {
        headers,
      }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get keys');
    }

    return response.data;
  }

  /**
   * Get a single LLM API key by ID.
   * GET /api/v1/entities/:entitySlug/keys/:keyId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param keyId - UUID of the LLM API key to retrieve
   * @param token - Firebase ID token for authentication
   * @returns Response containing the safe key object (API key value is masked)
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getKey(
    entitySlug: string,
    keyId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<LlmApiKeySafe>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<LlmApiKeySafe>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/keys/${encodeURIComponent(keyId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get key');
    }

    return response.data;
  }

  /**
   * Create a new LLM API key for an entity.
   * POST /api/v1/entities/:entitySlug/keys
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param data - Key creation payload including key_name, provider, and api_key
   * @param token - Firebase ID token for authentication
   * @returns Response containing the created key (API key value is masked)
   * @throws {ShapeshyftApiError} If the request fails (e.g., 422 validation error)
   */
  async createKey(
    entitySlug: string,
    data: LlmApiKeyCreateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<LlmApiKeySafe>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<BaseResponse<LlmApiKeySafe>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/keys`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'create key');
    }

    return response.data;
  }

  /**
   * Update an LLM API key.
   * PUT /api/v1/entities/:entitySlug/keys/:keyId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param keyId - UUID of the LLM API key to update
   * @param data - Partial key update payload (e.g., key_name, api_key, is_active)
   * @param token - Firebase ID token for authentication
   * @returns Response containing the updated key
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateKey(
    entitySlug: string,
    keyId: string,
    data: LlmApiKeyUpdateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<LlmApiKeySafe>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<BaseResponse<LlmApiKeySafe>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/keys/${encodeURIComponent(keyId)}`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update key');
    }

    return response.data;
  }

  /**
   * Delete an LLM API key.
   * DELETE /api/v1/entities/:entitySlug/keys/:keyId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param keyId - UUID of the LLM API key to delete
   * @param token - Firebase ID token for authentication
   * @returns Response containing the deleted key data
   * @throws {ShapeshyftApiError} If the request fails
   */
  async deleteKey(
    entitySlug: string,
    keyId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<LlmApiKeySafe>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<
      BaseResponse<LlmApiKeySafe>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/keys/${encodeURIComponent(keyId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'delete key');
    }

    return response.data;
  }

  // =============================================================================
  // SITE-WIDE LLM API KEYS (Firebase auth + site admin required)
  //
  // Platform-level provider credentials that are NOT owned by any entity. Only
  // site admins may read or manage them. At invocation an active site-wide key
  // for a provider is used as a fallback when an entity has not supplied its
  // own key for that provider.
  // =============================================================================

  /**
   * Get all site-wide LLM API keys.
   * GET /api/v1/site/llm-keys
   *
   * @param token - Firebase ID token for authentication (must be a site admin)
   * @returns Response containing an array of safe key objects (API key values are masked)
   * @throws {ShapeshyftApiError} If the request fails (e.g., 401 unauthorized, 403 not a site admin)
   */
  async getSiteKeys(
    token: FirebaseIdToken
  ): Promise<BaseResponse<SiteLlmApiKeySafe[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<SiteLlmApiKeySafe[]>
    >(this.buildUrlWithTestMode(`/api/v1/site/llm-keys`), { headers });

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get site keys');
    }

    return response.data;
  }

  /**
   * Get a single site-wide LLM API key by ID.
   * GET /api/v1/site/llm-keys/:keyId
   *
   * @param keyId - UUID of the site-wide LLM API key to retrieve
   * @param token - Firebase ID token for authentication (must be a site admin)
   * @returns Response containing the safe key object (API key value is masked)
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getSiteKey(
    keyId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<SiteLlmApiKeySafe>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<SiteLlmApiKeySafe>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/site/llm-keys/${encodeURIComponent(keyId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get site key');
    }

    return response.data;
  }

  /**
   * Create a new site-wide LLM API key.
   * POST /api/v1/site/llm-keys
   *
   * @param data - Key creation payload including key_name, provider, and api_key
   * @param token - Firebase ID token for authentication (must be a site admin)
   * @returns Response containing the created key (API key value is masked)
   * @throws {ShapeshyftApiError} If the request fails (e.g., 403 not a site admin, 400 validation error)
   */
  async createSiteKey(
    data: SiteLlmApiKeyCreateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<SiteLlmApiKeySafe>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<
      BaseResponse<SiteLlmApiKeySafe>
    >(this.buildUrlWithTestMode(`/api/v1/site/llm-keys`), data, { headers });

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'create site key');
    }

    return response.data;
  }

  /**
   * Update a site-wide LLM API key.
   * PUT /api/v1/site/llm-keys/:keyId
   *
   * @param keyId - UUID of the site-wide LLM API key to update
   * @param data - Partial key update payload (e.g., key_name, api_key, is_active)
   * @param token - Firebase ID token for authentication (must be a site admin)
   * @returns Response containing the updated key
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateSiteKey(
    keyId: string,
    data: SiteLlmApiKeyUpdateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<SiteLlmApiKeySafe>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<
      BaseResponse<SiteLlmApiKeySafe>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/site/llm-keys/${encodeURIComponent(keyId)}`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update site key');
    }

    return response.data;
  }

  /**
   * Delete a site-wide LLM API key.
   * DELETE /api/v1/site/llm-keys/:keyId
   *
   * @param keyId - UUID of the site-wide LLM API key to delete
   * @param token - Firebase ID token for authentication (must be a site admin)
   * @returns Response containing the deleted key data
   * @throws {ShapeshyftApiError} If the request fails
   */
  async deleteSiteKey(
    keyId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<SiteLlmApiKeySafe>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<
      BaseResponse<SiteLlmApiKeySafe>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/site/llm-keys/${encodeURIComponent(keyId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'delete site key');
    }

    return response.data;
  }

  // =============================================================================
  // STORAGE CONFIG (Firebase auth required, entity-scoped)
  // =============================================================================

  /**
   * Get storage configuration for an entity.
   * GET /api/v1/entities/:entitySlug/storage
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param token - Firebase ID token for authentication
   * @returns Response containing the entity's storage configuration
   * @throws {ShapeshyftApiError} If the request fails (404 if no config exists)
   */
  async getStorageConfig(
    entitySlug: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityStorageConfig>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<EntityStorageConfig>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/storage`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get storage config');
    }

    return response.data;
  }

  /**
   * Create or update storage configuration for an entity.
   * POST /api/v1/entities/:entitySlug/storage
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param data - Storage configuration creation payload
   * @param token - Firebase ID token for authentication
   * @returns Response containing the created/updated storage configuration
   * @throws {ShapeshyftApiError} If the request fails
   */
  async createStorageConfig(
    entitySlug: string,
    data: StorageConfigCreateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityStorageConfig>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<
      BaseResponse<EntityStorageConfig>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/storage`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'create storage config');
    }

    return response.data;
  }

  /**
   * Update storage configuration (partial update).
   * PUT /api/v1/entities/:entitySlug/storage
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param data - Partial storage configuration update payload
   * @param token - Firebase ID token for authentication
   * @returns Response containing the updated storage configuration
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateStorageConfig(
    entitySlug: string,
    data: StorageConfigUpdateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityStorageConfig>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<
      BaseResponse<EntityStorageConfig>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/storage`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update storage config');
    }

    return response.data;
  }

  /**
   * Delete storage configuration for an entity.
   * DELETE /api/v1/entities/:entitySlug/storage
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param token - Firebase ID token for authentication
   * @returns Response containing the deleted storage configuration
   * @throws {ShapeshyftApiError} If the request fails
   */
  async deleteStorageConfig(
    entitySlug: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityStorageConfig>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<
      BaseResponse<EntityStorageConfig>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/storage`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'delete storage config');
    }

    return response.data;
  }

  // =============================================================================
  // PROJECTS (Firebase auth required, entity-scoped)
  // =============================================================================

  /**
   * Get all projects for an entity.
   * GET /api/v1/entities/:entitySlug/projects
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param token - Firebase ID token for authentication
   * @param params - Optional query parameters for filtering (e.g., is_active)
   * @returns Response containing an array of project objects
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getProjects(
    entitySlug: string,
    token: FirebaseIdToken,
    params?: ProjectQueryParams
  ): Promise<BaseResponse<Project[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<Project[]>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects`,
        params
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get projects');
    }

    return response.data;
  }

  /**
   * Get a single project by ID.
   * GET /api/v1/entities/:entitySlug/projects/:projectId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project to retrieve
   * @param token - Firebase ID token for authentication
   * @returns Response containing the project object
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getProject(
    entitySlug: string,
    projectId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Project>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<Project>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get project');
    }

    return response.data;
  }

  /**
   * Create a new project for an entity.
   * POST /api/v1/entities/:entitySlug/projects
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param data - Project creation payload including project_name and display_name
   * @param token - Firebase ID token for authentication
   * @returns Response containing the created project (includes generated UUID and API key prefix)
   * @throws {ShapeshyftApiError} If the request fails
   */
  async createProject(
    entitySlug: string,
    data: ProjectCreateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Project>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<BaseResponse<Project>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'create project');
    }

    return response.data;
  }

  /**
   * Update a project.
   * PUT /api/v1/entities/:entitySlug/projects/:projectId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project to update
   * @param data - Partial project update payload (e.g., display_name, description, is_active)
   * @param token - Firebase ID token for authentication
   * @returns Response containing the updated project
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateProject(
    entitySlug: string,
    projectId: string,
    data: ProjectUpdateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Project>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<BaseResponse<Project>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update project');
    }

    return response.data;
  }

  /**
   * Delete a project.
   * DELETE /api/v1/entities/:entitySlug/projects/:projectId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project to delete
   * @param token - Firebase ID token for authentication
   * @returns Response containing the deleted project data
   * @throws {ShapeshyftApiError} If the request fails
   */
  async deleteProject(
    entitySlug: string,
    projectId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Project>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<BaseResponse<Project>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'delete project');
    }

    return response.data;
  }

  /**
   * Get project API key (full key value). Used for AI endpoint authentication.
   * GET /api/v1/entities/:entitySlug/projects/:projectId/api-key
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project
   * @param token - Firebase ID token for authentication
   * @returns Response containing the full API key string
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getProjectApiKey(
    entitySlug: string,
    projectId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<GetApiKeyResponse>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<GetApiKeyResponse>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}/api-key`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get project API key');
    }

    return response.data;
  }

  /**
   * Refresh project API key (generates a new key, invalidating the old one).
   * POST /api/v1/entities/:entitySlug/projects/:projectId/api-key/refresh
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project whose API key to refresh
   * @param token - Firebase ID token for authentication
   * @returns Response containing the new API key, prefix, and creation timestamp
   * @throws {ShapeshyftApiError} If the request fails
   */
  async refreshProjectApiKey(
    entitySlug: string,
    projectId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<RefreshApiKeyResponse>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<
      BaseResponse<RefreshApiKeyResponse>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}/api-key/refresh`
      ),
      {},
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'refresh project API key');
    }

    return response.data;
  }

  // =============================================================================
  // ENDPOINTS (Firebase auth required, entity-scoped)
  // =============================================================================

  /**
   * Get all endpoints for a project.
   * GET /api/v1/entities/:entitySlug/projects/:projectId/endpoints
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project
   * @param token - Firebase ID token for authentication
   * @param params - Optional query parameters for filtering (e.g., is_active)
   * @returns Response containing an array of endpoint objects
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getEndpoints(
    entitySlug: string,
    projectId: string,
    token: FirebaseIdToken,
    params?: EndpointQueryParams
  ): Promise<BaseResponse<Endpoint[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<Endpoint[]>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}/endpoints`,
        params
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get endpoints');
    }

    return response.data;
  }

  /**
   * Get a single endpoint by ID.
   * GET /api/v1/entities/:entitySlug/projects/:projectId/endpoints/:endpointId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project
   * @param endpointId - UUID of the endpoint to retrieve
   * @param token - Firebase ID token for authentication
   * @returns Response containing the endpoint object
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getEndpoint(
    entitySlug: string,
    projectId: string,
    endpointId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Endpoint>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<Endpoint>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}/endpoints/${encodeURIComponent(endpointId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get endpoint');
    }

    return response.data;
  }

  /**
   * Create a new endpoint for a project.
   * POST /api/v1/entities/:entitySlug/projects/:projectId/endpoints
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project
   * @param data - Endpoint creation payload including endpoint_name, display_name, and the product's provider binding fields
   * @param token - Firebase ID token for authentication
   * @returns Response containing the created endpoint
   * @throws {ShapeshyftApiError} If the request fails
   */
  async createEndpoint(
    entitySlug: string,
    projectId: string,
    data: EndpointCreatePayload,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Endpoint>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<BaseResponse<Endpoint>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}/endpoints`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'create endpoint');
    }

    return response.data;
  }

  /**
   * Update an endpoint.
   * PUT /api/v1/entities/:entitySlug/projects/:projectId/endpoints/:endpointId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project
   * @param endpointId - UUID of the endpoint to update
   * @param data - Partial endpoint update payload (e.g., display_name, instructions, ip_allowlist)
   * @param token - Firebase ID token for authentication
   * @returns Response containing the updated endpoint
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateEndpoint(
    entitySlug: string,
    projectId: string,
    endpointId: string,
    data: EndpointUpdatePayload,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Endpoint>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<BaseResponse<Endpoint>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}/endpoints/${encodeURIComponent(endpointId)}`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update endpoint');
    }

    return response.data;
  }

  /**
   * Delete an endpoint.
   * DELETE /api/v1/entities/:entitySlug/projects/:projectId/endpoints/:endpointId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param projectId - UUID of the project
   * @param endpointId - UUID of the endpoint to delete
   * @param token - Firebase ID token for authentication
   * @returns Response containing the deleted endpoint data
   * @throws {ShapeshyftApiError} If the request fails
   */
  async deleteEndpoint(
    entitySlug: string,
    projectId: string,
    endpointId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Endpoint>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<BaseResponse<Endpoint>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/projects/${encodeURIComponent(projectId)}/endpoints/${encodeURIComponent(endpointId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'delete endpoint');
    }

    return response.data;
  }

  // =============================================================================
  // ANALYTICS (Firebase auth required)
  // =============================================================================

  /**
   * Get usage analytics for an entity.
   * GET /api/v1/entities/:entitySlug/analytics
   *
   * @param entitySlug - Entity slug for the organization
   * @param token - Firebase ID token for authentication
   * @param params - Optional query parameters (e.g., start_date, end_date, project_id)
   * @returns Response containing aggregated analytics (summary, by_endpoint, by_date)
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getAnalytics(
    entitySlug: string,
    token: FirebaseIdToken,
    params?: UsageAnalyticsQueryParams
  ): Promise<BaseResponse<AnalyticsResponse>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<AnalyticsResponse>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/analytics`,
        params
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get analytics');
    }

    return response.data;
  }

  // =============================================================================
  // USER SETTINGS (Firebase auth required)
  // =============================================================================

  /**
   * Get user settings.
   * GET /api/v1/users/:userId/settings
   *
   * @param userId - Firebase UID of the user
   * @param token - Firebase ID token for authentication
   * @returns Response containing the user's settings object
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getSettings(
    userId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<UserSettings>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<UserSettings>>(
      this.buildUrlWithTestMode(
        `/api/v1/users/${encodeURIComponent(userId)}/settings`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get settings');
    }

    return response.data;
  }

  // ===========================================================================
  // PERSONAL API KEYS (Firebase auth required for create/reveal)
  // ===========================================================================

  /**
   * Identify the authenticated caller.
   * GET /api/v1/users/me
   *
   * Works with either credential, and is the only way an API-key client can
   * learn its own Firebase UID -- which every /users/:userId/* route needs.
   *
   * @param token - Firebase ID token, or a personal API key
   * @returns Response containing the caller's identity and auth method
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getCurrentUser(
    token: FirebaseIdToken
  ): Promise<BaseResponse<CurrentUser>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<CurrentUser>>(
      this.buildUrlWithTestMode('/api/v1/users/me'),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get current user');
    }

    return response.data;
  }

  /**
   * List the user's personal API keys. Secrets are never included.
   * GET /api/v1/users/:userId/api-keys
   *
   * @param userId - Firebase UID of the user
   * @param token - Firebase ID token for authentication
   * @returns Response containing the key metadata, newest first
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getUserApiKeys(
    userId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<UserApiKey[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<UserApiKey[]>>(
      this.buildUrlWithTestMode(
        `/api/v1/users/${encodeURIComponent(userId)}/api-keys`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get user API keys');
    }

    return response.data;
  }

  /**
   * Create a personal API key. The full `shyft_...` value is returned once,
   * here -- store it immediately.
   * POST /api/v1/users/:userId/api-keys
   *
   * Requires a Firebase ID token: a request authenticated with an API key
   * cannot mint further keys.
   *
   * @param userId - Firebase UID of the user
   * @param data - Creation payload containing the key name
   * @param token - Firebase ID token for authentication
   * @returns Response containing the key metadata plus the secret
   * @throws {ShapeshyftApiError} If the request fails (403 when authenticated by API key)
   */
  async createUserApiKey(
    userId: string,
    data: UserApiKeyCreateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<UserApiKeyCreated>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<
      BaseResponse<UserApiKeyCreated>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/users/${encodeURIComponent(userId)}/api-keys`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'create user API key');
    }

    return response.data;
  }

  /**
   * Reveal an existing personal API key so it can be copied again.
   * GET /api/v1/users/:userId/api-keys/:keyId/reveal
   *
   * Requires a Firebase ID token.
   *
   * @param userId - Firebase UID of the user
   * @param keyId - UUID of the key to reveal
   * @param token - Firebase ID token for authentication
   * @returns Response containing the full key
   * @throws {ShapeshyftApiError} If the request fails
   */
  async revealUserApiKey(
    userId: string,
    keyId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<{ api_key: string }>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<{ api_key: string }>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/users/${encodeURIComponent(userId)}/api-keys/${encodeURIComponent(keyId)}/reveal`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'reveal user API key');
    }

    return response.data;
  }

  /**
   * Rename a personal API key or toggle whether it is accepted.
   * PUT /api/v1/users/:userId/api-keys/:keyId
   *
   * @param userId - Firebase UID of the user
   * @param keyId - UUID of the key to update
   * @param data - Partial update payload (key_name and/or is_active)
   * @param token - Firebase ID token for authentication
   * @returns Response containing the updated key metadata
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateUserApiKey(
    userId: string,
    keyId: string,
    data: UserApiKeyUpdateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<UserApiKey>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<BaseResponse<UserApiKey>>(
      this.buildUrlWithTestMode(
        `/api/v1/users/${encodeURIComponent(userId)}/api-keys/${encodeURIComponent(keyId)}`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update user API key');
    }

    return response.data;
  }

  /**
   * Permanently revoke a personal API key.
   * DELETE /api/v1/users/:userId/api-keys/:keyId
   *
   * @param userId - Firebase UID of the user
   * @param keyId - UUID of the key to delete
   * @param token - Firebase ID token for authentication
   * @returns Response containing the deleted key metadata
   * @throws {ShapeshyftApiError} If the request fails
   */
  async deleteUserApiKey(
    userId: string,
    keyId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<UserApiKey>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<BaseResponse<UserApiKey>>(
      this.buildUrlWithTestMode(
        `/api/v1/users/${encodeURIComponent(userId)}/api-keys/${encodeURIComponent(keyId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'delete user API key');
    }

    return response.data;
  }

  /**
   * Update user settings (upsert -- creates if not exists).
   * PUT /api/v1/users/:userId/settings
   *
   * @param userId - Firebase UID of the user
   * @param data - Partial settings update payload (e.g., default_organization)
   * @param token - Firebase ID token for authentication
   * @returns Response containing the updated settings object
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateSettings(
    userId: string,
    data: UserSettingsUpdateRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<UserSettings>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<BaseResponse<UserSettings>>(
      this.buildUrlWithTestMode(
        `/api/v1/users/${encodeURIComponent(userId)}/settings`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update settings');
    }

    return response.data;
  }

  // =============================================================================
  // AI EXECUTION (Requires project API key)
  // =============================================================================

  /**
   * Execute AI endpoint via GET (for simple inputs).
   * Input is JSON-serialized as a query parameter.
   * GET /api/v1/ai/:organizationPath/:projectName/:endpointName
   *
   * @param organizationPath - Organization slug used in the AI URL path
   * @param projectName - Project name (project_name field, not UUID)
   * @param endpointName - Endpoint name (endpoint_name field, not UUID)
   * @param input - Input data to pass to the endpoint (serialized to JSON query param)
   * @param apiKey - Optional project API key for authentication (omit for public endpoints)
   * @param timeout - Optional request timeout in milliseconds
   * @param maxOutputTokens - Optional per-call output ceiling. Clamped server-side
   *   to the endpoint's own limit, so this can only ever request fewer tokens.
   * @returns Response containing execution result or prompt response
   * @throws {ShapeshyftApiError} If the request fails
   */
  async executeAiGet(
    organizationPath: string,
    projectName: string,
    endpointName: string,
    input: unknown,
    apiKey?: string,
    timeout?: number,
    maxOutputTokens?: number
  ): Promise<BaseResponse<AiExecutionResponse | AiPromptResponse>> {
    const headers = apiKey ? createApiKeyHeaders(apiKey) : createHeaders();
    const inputParams = {
      ...(input ? { input: JSON.stringify(input) } : {}),
      ...(maxOutputTokens !== undefined
        ? { max_output_tokens: String(maxOutputTokens) }
        : {}),
    };

    const response = await this.networkClient.get<
      BaseResponse<AiExecutionResponse | AiPromptResponse>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/ai/${encodeURIComponent(organizationPath)}/${encodeURIComponent(projectName)}/${encodeURIComponent(endpointName)}`,
        inputParams
      ),
      { headers, timeout }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'execute AI (GET)');
    }

    return response.data;
  }

  /**
   * Execute AI endpoint via POST (for complex inputs).
   * Input is sent as the JSON request body.
   * POST /api/v1/ai/:organizationPath/:projectName/:endpointName
   *
   * @param organizationPath - Organization slug used in the AI URL path
   * @param projectName - Project name (project_name field, not UUID)
   * @param endpointName - Endpoint name (endpoint_name field, not UUID)
   * @param input - Input data to pass to the endpoint as the request body
   * @param apiKey - Optional project API key for authentication (omit for public endpoints)
   * @param timeout - Optional request timeout in milliseconds
   * @param maxOutputTokens - Optional per-call output ceiling, merged into the
   *   body as the reserved `max_output_tokens` field. Clamped server-side to the
   *   endpoint's own limit, so this can only ever request fewer tokens.
   * @returns Response containing execution result or prompt response
   * @throws {ShapeshyftApiError} If the request fails
   */
  async executeAiPost(
    organizationPath: string,
    projectName: string,
    endpointName: string,
    input: unknown,
    apiKey?: string,
    timeout?: number,
    maxOutputTokens?: number
  ): Promise<BaseResponse<AiExecutionResponse | AiPromptResponse>> {
    const headers = apiKey ? createApiKeyHeaders(apiKey) : createHeaders();

    // Merge rather than wrap: the API reads reserved fields off the top level of
    // the body, alongside the endpoint's own input fields.
    const body =
      maxOutputTokens !== undefined &&
      typeof input === 'object' &&
      input !== null &&
      !Array.isArray(input)
        ? {
            ...(input as Record<string, unknown>),
            max_output_tokens: maxOutputTokens,
          }
        : input;

    const response = await this.networkClient.post<
      BaseResponse<AiExecutionResponse | AiPromptResponse>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/ai/${encodeURIComponent(organizationPath)}/${encodeURIComponent(projectName)}/${encodeURIComponent(endpointName)}`
      ),
      body,
      { headers, timeout }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'execute AI (POST)');
    }

    return response.data;
  }

  /**
   * Execute AI endpoint (auto-selects GET or POST based on the method parameter).
   *
   * @param organizationPath - Organization slug used in the AI URL path
   * @param projectName - Project name (project_name field, not UUID)
   * @param endpointName - Endpoint name (endpoint_name field, not UUID)
   * @param input - Input data to pass to the endpoint
   * @param method - HTTP method to use; defaults to "POST"
   * @param apiKey - Optional project API key for authentication
   * @param timeout - Optional request timeout in milliseconds
   * @param maxOutputTokens - Optional per-call output ceiling. Clamped server-side
   *   to the endpoint's own limit, so this can only ever request fewer tokens.
   * @returns Response containing execution result or prompt response
   * @throws {ShapeshyftApiError} If the request fails
   */
  async executeAi(
    organizationPath: string,
    projectName: string,
    endpointName: string,
    input: unknown,
    method: 'GET' | 'POST' = 'POST',
    apiKey?: string,
    timeout?: number,
    maxOutputTokens?: number
  ): Promise<BaseResponse<AiExecutionResponse | AiPromptResponse>> {
    if (method === 'GET') {
      return this.executeAiGet(
        organizationPath,
        projectName,
        endpointName,
        input,
        apiKey,
        timeout,
        maxOutputTokens
      );
    }
    return this.executeAiPost(
      organizationPath,
      projectName,
      endpointName,
      input,
      apiKey,
      timeout,
      maxOutputTokens
    );
  }

  /**
   * Get AI prompt without executing (for debugging/preview).
   * Returns the fully-resolved prompt that would be sent to the LLM.
   * POST /api/v1/ai/:organizationPath/:projectName/:endpointName/prompt
   *
   * @param organizationPath - Organization slug used in the AI URL path
   * @param projectName - Project name (project_name field, not UUID)
   * @param endpointName - Endpoint name (endpoint_name field, not UUID)
   * @param input - Input data to pass to the endpoint
   * @param apiKey - Optional project API key for authentication
   * @param timeout - Optional request timeout in milliseconds
   * @returns Response containing the resolved prompt (without LLM execution)
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getAiPrompt(
    organizationPath: string,
    projectName: string,
    endpointName: string,
    input: unknown,
    apiKey?: string,
    timeout?: number
  ): Promise<BaseResponse<AiPromptResponse>> {
    const headers = apiKey ? createApiKeyHeaders(apiKey) : createHeaders();

    const response = await this.networkClient.post<
      BaseResponse<AiPromptResponse>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/ai/${encodeURIComponent(organizationPath)}/${encodeURIComponent(projectName)}/${encodeURIComponent(endpointName)}/prompt`
      ),
      input,
      { headers, timeout }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get AI prompt');
    }

    return response.data;
  }

  // =============================================================================
  // ENTITIES (Firebase auth required)
  // =============================================================================

  /**
   * Get all entities (organizations) the current user belongs to.
   * GET /api/v1/entities
   *
   * @param token - Firebase ID token for authentication
   * @returns Response containing an array of entities with the user's role in each
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getEntities(
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityWithRole[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<EntityWithRole[]>
    >(this.buildUrlWithTestMode('/api/v1/entities'), { headers });

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get entities');
    }

    return response.data;
  }

  /**
   * Get a single entity by slug.
   * GET /api/v1/entities/:entitySlug
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param token - Firebase ID token for authentication
   * @returns Response containing the entity with the user's role
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getEntity(
    entitySlug: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityWithRole>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<EntityWithRole>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get entity');
    }

    return response.data;
  }

  /**
   * Create a new organization entity.
   * POST /api/v1/entities
   *
   * @param data - Entity creation payload including display_name and slug
   * @param token - Firebase ID token for authentication
   * @returns Response containing the created entity
   * @throws {ShapeshyftApiError} If the request fails
   */
  async createEntity(
    data: CreateEntityRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Entity>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<BaseResponse<Entity>>(
      this.buildUrlWithTestMode('/api/v1/entities'),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'create entity');
    }

    return response.data;
  }

  /**
   * Update an entity.
   * PUT /api/v1/entities/:entitySlug
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param data - Partial entity update payload (e.g., display_name)
   * @param token - Firebase ID token for authentication
   * @returns Response containing the updated entity
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateEntity(
    entitySlug: string,
    data: UpdateEntityRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<Entity>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<BaseResponse<Entity>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update entity');
    }

    return response.data;
  }

  /**
   * Delete an entity.
   * DELETE /api/v1/entities/:entitySlug
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param token - Firebase ID token for authentication
   * @returns Response confirming deletion
   * @throws {ShapeshyftApiError} If the request fails
   */
  async deleteEntity(
    entitySlug: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<void>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<BaseResponse<void>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'delete entity');
    }

    return response.data;
  }

  // =============================================================================
  // ENTITY MEMBERS (Firebase auth required)
  // =============================================================================

  /**
   * Get all members of an entity.
   * GET /api/v1/entities/:entitySlug/members
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param token - Firebase ID token for authentication
   * @returns Response containing an array of entity members with their roles
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getEntityMembers(
    entitySlug: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityMember[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<BaseResponse<EntityMember[]>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/members`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get entity members');
    }

    return response.data;
  }

  /**
   * Update a member's role within an entity.
   * PUT /api/v1/entities/:entitySlug/members/:memberId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param memberId - UUID of the member to update
   * @param role - New role to assign (e.g., "owner", "admin", "member")
   * @param token - Firebase ID token for authentication
   * @returns Response containing the updated member
   * @throws {ShapeshyftApiError} If the request fails
   */
  async updateEntityMemberRole(
    entitySlug: string,
    memberId: string,
    role: EntityRole,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityMember>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.put<BaseResponse<EntityMember>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/members/${encodeURIComponent(memberId)}`
      ),
      { role },
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'update entity member role');
    }

    return response.data;
  }

  /**
   * Remove a member from an entity.
   * DELETE /api/v1/entities/:entitySlug/members/:memberId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param memberId - UUID of the member to remove
   * @param token - Firebase ID token for authentication
   * @returns Response confirming removal
   * @throws {ShapeshyftApiError} If the request fails
   */
  async removeEntityMember(
    entitySlug: string,
    memberId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<void>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<BaseResponse<void>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/members/${encodeURIComponent(memberId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'remove entity member');
    }

    return response.data;
  }

  // =============================================================================
  // ENTITY INVITATIONS (Firebase auth required)
  // =============================================================================

  /**
   * Get all invitations for an entity.
   * GET /api/v1/entities/:entitySlug/invitations
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param token - Firebase ID token for authentication
   * @returns Response containing an array of pending invitations
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getEntityInvitations(
    entitySlug: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityInvitation[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<EntityInvitation[]>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/invitations`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get entity invitations');
    }

    return response.data;
  }

  /**
   * Create an invitation to join an entity.
   * POST /api/v1/entities/:entitySlug/invitations
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param data - Invitation payload including email and role
   * @param token - Firebase ID token for authentication
   * @returns Response containing the created invitation
   * @throws {ShapeshyftApiError} If the request fails
   */
  async createEntityInvitation(
    entitySlug: string,
    data: InviteMemberRequest,
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityInvitation>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<
      BaseResponse<EntityInvitation>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/invitations`
      ),
      data,
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'create entity invitation');
    }

    return response.data;
  }

  /**
   * Cancel a pending invitation.
   * DELETE /api/v1/entities/:entitySlug/invitations/:invitationId
   *
   * @param entitySlug - URL-safe slug identifying the entity
   * @param invitationId - UUID of the invitation to cancel
   * @param token - Firebase ID token for authentication
   * @returns Response confirming cancellation
   * @throws {ShapeshyftApiError} If the request fails
   */
  async cancelEntityInvitation(
    entitySlug: string,
    invitationId: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<void>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.delete<BaseResponse<void>>(
      this.buildUrlWithTestMode(
        `/api/v1/entities/${encodeURIComponent(entitySlug)}/invitations/${encodeURIComponent(invitationId)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'cancel entity invitation');
    }

    return response.data;
  }

  /**
   * Get pending invitations for the current user.
   * GET /api/v1/invitations
   *
   * @param token - Firebase ID token for authentication
   * @returns Response containing an array of invitations addressed to the current user
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getMyInvitations(
    token: FirebaseIdToken
  ): Promise<BaseResponse<EntityInvitation[]>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<EntityInvitation[]>
    >(this.buildUrlWithTestMode('/api/v1/invitations'), { headers });

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get my invitations');
    }

    return response.data;
  }

  /**
   * Accept an invitation to join an entity.
   * POST /api/v1/invitations/:token/accept
   *
   * @param invitationToken - Unique invitation token (not to be confused with Firebase ID token)
   * @param token - Firebase ID token for authentication
   * @returns Response confirming acceptance
   * @throws {ShapeshyftApiError} If the request fails
   */
  async acceptInvitation(
    invitationToken: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<void>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<BaseResponse<void>>(
      this.buildUrlWithTestMode(
        `/api/v1/invitations/${encodeURIComponent(invitationToken)}/accept`
      ),
      {},
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'accept invitation');
    }

    return response.data;
  }

  /**
   * Decline an invitation to join an entity.
   * POST /api/v1/invitations/:token/decline
   *
   * @param invitationToken - Unique invitation token
   * @param token - Firebase ID token for authentication
   * @returns Response confirming the invitation was declined
   * @throws {ShapeshyftApiError} If the request fails
   */
  async declineInvitation(
    invitationToken: string,
    token: FirebaseIdToken
  ): Promise<BaseResponse<void>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.post<BaseResponse<void>>(
      this.buildUrlWithTestMode(
        `/api/v1/invitations/${encodeURIComponent(invitationToken)}/decline`
      ),
      {},
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'decline invitation');
    }

    return response.data;
  }

  // =============================================================================
  // RATE LIMITS (Firebase auth required)
  // =============================================================================

  /**
   * Get rate limit configuration and current usage
   * GET /api/v1/ratelimits/:rateLimitUserId
   * @param token - Firebase ID token
   * @param entitySlug - Entity slug for rate limit lookup (used as rateLimitUserId path param)
   */
  async getRateLimitsConfig(
    token: FirebaseIdToken,
    entitySlug: string
  ): Promise<BaseResponse<RateLimitsConfigData>> {
    const headers = createAuthHeaders(token);
    const url = this.buildUrlWithTestMode(
      `/api/v1/ratelimits/${encodeURIComponent(entitySlug)}`
    );

    const response = await this.networkClient.get<
      BaseResponse<RateLimitsConfigData>
    >(url, {
      headers,
    });

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get rate limits config');
    }

    return response.data;
  }

  /**
   * Get rate limit usage history for a specific period type
   * GET /api/v1/ratelimits/:rateLimitUserId/history/:periodType
   * @param periodType - 'hour', 'day', or 'month'
   * @param token - Firebase ID token
   * @param entitySlug - Entity slug for rate limit lookup (used as rateLimitUserId path param)
   */
  async getRateLimitHistory(
    periodType: RateLimitPeriodType,
    token: FirebaseIdToken,
    entitySlug: string
  ): Promise<BaseResponse<RateLimitHistoryData>> {
    const headers = createAuthHeaders(token);

    const response = await this.networkClient.get<
      BaseResponse<RateLimitHistoryData>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/ratelimits/${encodeURIComponent(entitySlug)}/history/${encodeURIComponent(periodType)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get rate limit history');
    }

    return response.data;
  }

  // =============================================================================
  // PROVIDERS (Public - no auth required)
  // =============================================================================

  /**
   * Get all available LLM providers. Public endpoint -- no authentication required.
   * GET /api/v1/providers
   *
   * @returns Response containing an array of provider configurations
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getProviders(): Promise<BaseResponse<ProviderConfig[]>> {
    const headers = createHeaders();

    const response = await this.networkClient.get<
      BaseResponse<ProviderConfig[]>
    >(this.buildUrlWithTestMode('/api/v1/providers'), { headers });

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get providers');
    }

    return response.data;
  }

  /**
   * Get a specific provider's configuration. Public endpoint -- no authentication required.
   * GET /api/v1/providers/:provider
   *
   * @param provider - LLM provider identifier (e.g., "openai", "anthropic")
   * @returns Response containing the provider configuration
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getProvider(
    provider: LlmProvider
  ): Promise<BaseResponse<ProviderConfig>> {
    const headers = createHeaders();

    const response = await this.networkClient.get<BaseResponse<ProviderConfig>>(
      this.buildUrlWithTestMode(
        `/api/v1/providers/${encodeURIComponent(provider)}`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get provider');
    }

    return response.data;
  }

  /**
   * Get models for a specific provider with capabilities and pricing.
   * Public endpoint -- no authentication required.
   * GET /api/v1/providers/:provider/models
   *
   * @param provider - LLM provider identifier (e.g., "openai", "anthropic")
   * @returns Response containing the provider info and array of available models
   * @throws {ShapeshyftApiError} If the request fails
   */
  async getProviderModels(
    provider: LlmProvider
  ): Promise<BaseResponse<ProviderModelsResponse>> {
    const headers = createHeaders();

    const response = await this.networkClient.get<
      BaseResponse<ProviderModelsResponse>
    >(
      this.buildUrlWithTestMode(
        `/api/v1/providers/${encodeURIComponent(provider)}/models`
      ),
      { headers }
    );

    if (!response.ok || !response.data) {
      throw handleApiError(response, 'get provider models');
    }

    return response.data;
  }
}
