import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NetworkClient } from '@sudobility/shapeshyft_types';
import { ShapeshyftClient } from './ShapeshyftClient';
import { ShapeshyftApiError } from '../utils/shapeshyft-helpers';

// Mock NetworkClient
function createMockNetworkClient(): NetworkClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

describe('ShapeshyftClient', () => {
  const baseUrl = 'https://api.example.com';
  let mockNetworkClient: NetworkClient;
  let client: ShapeshyftClient;

  beforeEach(() => {
    mockNetworkClient = createMockNetworkClient();
    client = new ShapeshyftClient({
      baseUrl,
      networkClient: mockNetworkClient,
    });
  });

  describe('constructor', () => {
    it('should create client with config', () => {
      expect(client).toBeInstanceOf(ShapeshyftClient);
    });
  });

  // =============================================================================
  // LLM API KEYS
  // =============================================================================

  describe('LLM API Keys', () => {
    const userId = 'user-123';
    const token = 'firebase-token';
    const keyId = 'key-uuid-123';

    describe('getKeys', () => {
      it('should fetch all keys for a user', async () => {
        const mockKeys = [
          { uuid: 'key-1', key_name: 'OpenAI Key', provider: 'openai' },
        ];
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKeys },
        });

        const result = await client.getKeys(userId, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/keys`,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${token}`,
            }),
          })
        );
        expect(result.data).toEqual(mockKeys);
      });

      it('should throw error on failed request', async () => {
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: false,
          data: { success: false, error: 'Unauthorized' },
        });

        await expect(client.getKeys(userId, token)).rejects.toThrow(
          'Failed to get keys'
        );
      });
    });

    describe('getKey', () => {
      it('should fetch a single key', async () => {
        const mockKey = {
          uuid: keyId,
          key_name: 'Test Key',
          provider: 'openai',
        };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKey },
        });

        const result = await client.getKey(userId, keyId, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/keys/${keyId}`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockKey);
      });
    });

    describe('createKey', () => {
      it('should create a new key', async () => {
        const createData = {
          key_name: 'New Key',
          provider: 'openai' as const,
          api_key: 'sk-test',
        };
        const mockKey = { uuid: 'new-key-id', ...createData };
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKey },
        });

        const result = await client.createKey(userId, createData, token);

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/keys`,
          createData,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockKey);
      });
    });

    describe('updateKey', () => {
      it('should update an existing key', async () => {
        const updateData = { key_name: 'Updated Key' };
        const mockKey = { uuid: keyId, key_name: 'Updated Key' };
        vi.mocked(mockNetworkClient.put).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKey },
        });

        const result = await client.updateKey(userId, keyId, updateData, token);

        expect(mockNetworkClient.put).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/keys/${keyId}`,
          updateData,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockKey);
      });
    });

    describe('deleteKey', () => {
      it('should delete a key', async () => {
        const mockKey = { uuid: keyId };
        vi.mocked(mockNetworkClient.delete).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKey },
        });

        const result = await client.deleteKey(userId, keyId, token);

        expect(mockNetworkClient.delete).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/keys/${keyId}`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockKey);
      });
    });
  });

  // =============================================================================
  // SITE-WIDE LLM API KEYS
  // =============================================================================

  describe('Site-wide LLM API Keys', () => {
    const token = 'firebase-token';
    const keyId = 'site-key-uuid-123';

    describe('getSiteKeys', () => {
      it('should fetch all site-wide keys', async () => {
        const mockKeys = [
          { uuid: 'site-1', key_name: 'Platform OpenAI', provider: 'openai' },
        ];
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKeys },
        });

        const result = await client.getSiteKeys(token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/site/llm-keys`,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${token}`,
            }),
          })
        );
        expect(result.data).toEqual(mockKeys);
      });

      it('should throw error on failed request', async () => {
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: false,
          data: { success: false, error: 'Site admin access required' },
        });

        await expect(client.getSiteKeys(token)).rejects.toThrow(
          'Failed to get site keys'
        );
      });
    });

    describe('getSiteKey', () => {
      it('should fetch a single site-wide key', async () => {
        const mockKey = { uuid: keyId, key_name: 'Test', provider: 'openai' };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKey },
        });

        const result = await client.getSiteKey(keyId, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/site/llm-keys/${keyId}`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockKey);
      });
    });

    describe('createSiteKey', () => {
      it('should create a new site-wide key', async () => {
        const createData = {
          key_name: 'Platform OpenAI',
          provider: 'openai' as const,
          api_key: 'sk-test',
        };
        const mockKey = { uuid: 'new-site-key', ...createData };
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKey },
        });

        const result = await client.createSiteKey(createData, token);

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/site/llm-keys`,
          createData,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockKey);
      });
    });

    describe('updateSiteKey', () => {
      it('should update an existing site-wide key', async () => {
        const updateData = { key_name: 'Updated' };
        const mockKey = { uuid: keyId, key_name: 'Updated' };
        vi.mocked(mockNetworkClient.put).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKey },
        });

        const result = await client.updateSiteKey(keyId, updateData, token);

        expect(mockNetworkClient.put).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/site/llm-keys/${keyId}`,
          updateData,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockKey);
      });
    });

    describe('deleteSiteKey', () => {
      it('should delete a site-wide key', async () => {
        const mockKey = { uuid: keyId };
        vi.mocked(mockNetworkClient.delete).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockKey },
        });

        const result = await client.deleteSiteKey(keyId, token);

        expect(mockNetworkClient.delete).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/site/llm-keys/${keyId}`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockKey);
      });
    });
  });

  // =============================================================================
  // PROJECTS
  // =============================================================================

  describe('Projects', () => {
    const userId = 'user-123';
    const token = 'firebase-token';
    const projectId = 'project-uuid-123';

    describe('getProjects', () => {
      it('should fetch all projects for a user', async () => {
        const mockProjects = [
          {
            uuid: 'proj-1',
            project_name: 'my-project',
            display_name: 'My Project',
          },
        ];
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockProjects },
        });

        const result = await client.getProjects(userId, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockProjects);
      });

      it('should include query params when provided', async () => {
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: [] },
        });

        await client.getProjects(userId, token, { is_active: 'true' });

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects?is_active=true`,
          expect.any(Object)
        );
      });
    });

    describe('getProject', () => {
      it('should fetch a single project', async () => {
        const mockProject = { uuid: projectId, project_name: 'test' };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockProject },
        });

        const result = await client.getProject(userId, projectId, token);

        expect(result.data).toEqual(mockProject);
      });
    });

    describe('createProject', () => {
      it('should create a new project', async () => {
        const createData = {
          project_name: 'new-project',
          display_name: 'New Project',
        };
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: 'new-id', ...createData } },
        });

        const result = await client.createProject(userId, createData, token);

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects`,
          createData,
          expect.any(Object)
        );
        expect(result.success).toBe(true);
      });
    });

    describe('updateProject', () => {
      it('should update a project', async () => {
        const updateData = { display_name: 'Updated Name' };
        vi.mocked(mockNetworkClient.put).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: projectId, ...updateData } },
        });

        await client.updateProject(userId, projectId, updateData, token);

        expect(mockNetworkClient.put).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects/${projectId}`,
          updateData,
          expect.any(Object)
        );
      });
    });

    describe('deleteProject', () => {
      it('should delete a project', async () => {
        vi.mocked(mockNetworkClient.delete).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: projectId } },
        });

        await client.deleteProject(userId, projectId, token);

        expect(mockNetworkClient.delete).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects/${projectId}`,
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // ENDPOINTS
  // =============================================================================

  describe('Endpoints', () => {
    const userId = 'user-123';
    const projectId = 'project-123';
    const endpointId = 'endpoint-123';
    const token = 'firebase-token';

    describe('getEndpoints', () => {
      it('should fetch all endpoints for a project', async () => {
        const mockEndpoints = [
          {
            uuid: 'ep-1',
            endpoint_name: 'summarize',
            display_name: 'Summarize',
          },
        ];
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockEndpoints },
        });

        const result = await client.getEndpoints(userId, projectId, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects/${projectId}/endpoints`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockEndpoints);
      });
    });

    describe('getEndpoint', () => {
      it('should fetch a single endpoint', async () => {
        const mockEndpoint = { uuid: endpointId, endpoint_name: 'test' };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockEndpoint },
        });

        const result = await client.getEndpoint(
          userId,
          projectId,
          endpointId,
          token
        );

        expect(result.data).toEqual(mockEndpoint);
      });
    });

    describe('createEndpoint', () => {
      it('should create a new endpoint', async () => {
        const createData = {
          endpoint_name: 'new-endpoint',
          display_name: 'New Endpoint',
          llm_key_id: 'key-123',
        };
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: 'new-ep-id', ...createData } },
        });

        await client.createEndpoint(userId, projectId, createData, token);

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects/${projectId}/endpoints`,
          createData,
          expect.any(Object)
        );
      });
    });

    describe('updateEndpoint', () => {
      it('should update an endpoint', async () => {
        const updateData = { display_name: 'Updated Endpoint' };
        vi.mocked(mockNetworkClient.put).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: endpointId } },
        });

        await client.updateEndpoint(
          userId,
          projectId,
          endpointId,
          updateData,
          token
        );

        expect(mockNetworkClient.put).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects/${projectId}/endpoints/${endpointId}`,
          updateData,
          expect.any(Object)
        );
      });
    });

    describe('deleteEndpoint', () => {
      it('should delete an endpoint', async () => {
        vi.mocked(mockNetworkClient.delete).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: endpointId } },
        });

        await client.deleteEndpoint(userId, projectId, endpointId, token);

        expect(mockNetworkClient.delete).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${userId}/projects/${projectId}/endpoints/${endpointId}`,
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // ANALYTICS
  // =============================================================================

  describe('Analytics', () => {
    const entitySlug = 'my-org';
    const token = 'firebase-token';

    describe('getAnalytics', () => {
      it('should fetch analytics data', async () => {
        const mockAnalytics = {
          aggregate: {
            total_requests: 100,
            successful_requests: 95,
            failed_requests: 5,
            total_tokens_input: 10000,
            total_tokens_output: 5000,
            total_estimated_cost_cents: 50,
            average_latency_ms: 250,
          },
          by_endpoint: [],
        };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockAnalytics },
        });

        const result = await client.getAnalytics(entitySlug, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/analytics`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockAnalytics);
      });

      it('should include query params when provided', async () => {
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: { aggregate: {}, by_endpoint: [] } },
        });

        await client.getAnalytics(entitySlug, token, {
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        });

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          expect.stringContaining('start_date=2024-01-01'),
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // USER SETTINGS
  // =============================================================================

  describe('User Settings', () => {
    const userId = 'user-123';
    const token = 'firebase-token';

    describe('getSettings', () => {
      it('should fetch user settings', async () => {
        const mockSettings = {
          uuid: 'settings-123',
          user_id: userId,
          organization_name: 'My Org',
          organization_path: 'my-org',
          is_default: true,
        };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockSettings },
        });

        const result = await client.getSettings(userId, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/users/${userId}/settings`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockSettings);
      });
    });

    describe('updateSettings', () => {
      it('should update user settings', async () => {
        const updateData = { organization_name: 'New Org Name' };
        vi.mocked(mockNetworkClient.put).mockResolvedValue({
          ok: true,
          data: {
            success: true,
            data: { ...updateData, uuid: 'settings-123' },
          },
        });

        await client.updateSettings(userId, updateData, token);

        expect(mockNetworkClient.put).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/users/${userId}/settings`,
          updateData,
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // AI EXECUTION
  // =============================================================================

  describe('AI Execution', () => {
    const organizationPath = 'my-org';
    const projectName = 'my-project';
    const endpointName = 'summarize';

    describe('per-call output ceiling', () => {
      it('should send max_output_tokens in the POST body', async () => {
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.executeAiPost(
          organizationPath,
          projectName,
          endpointName,
          { text: 'test input' },
          undefined,
          undefined,
          2000
        );

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          expect.any(String),
          { text: 'test input', max_output_tokens: 2000 },
          expect.any(Object)
        );
      });

      it('should leave the body untouched when no ceiling is given', async () => {
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.executeAiPost(
          organizationPath,
          projectName,
          endpointName,
          { text: 'test input' }
        );

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          expect.any(String),
          { text: 'test input' },
          expect.any(Object)
        );
      });

      it('should send max_output_tokens as a GET query parameter', async () => {
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.executeAiGet(
          organizationPath,
          projectName,
          endpointName,
          { text: 'test input' },
          undefined,
          undefined,
          2000
        );

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          expect.stringContaining('max_output_tokens=2000'),
          expect.any(Object)
        );
      });

      it('should route the ceiling through executeAi for both methods', async () => {
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.executeAi(
          organizationPath,
          projectName,
          endpointName,
          { text: 'hi' },
          'POST',
          undefined,
          undefined,
          1500
        );

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          expect.any(String),
          { text: 'hi', max_output_tokens: 1500 },
          expect.any(Object)
        );
      });
    });

    describe('executeAiGet', () => {
      it('should execute AI endpoint via GET', async () => {
        const mockResponse = {
          output: { summary: 'Test summary' },
          usage: {
            tokens_input: 100,
            tokens_output: 50,
            latency_ms: 200,
            estimated_cost_cents: 1,
          },
        };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockResponse },
        });

        const result = await client.executeAiGet(
          organizationPath,
          projectName,
          endpointName,
          { text: 'test input' }
        );

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          expect.stringContaining(
            `/api/v1/ai/${organizationPath}/${projectName}/${endpointName}`
          ),
          expect.any(Object)
        );
        expect(result.data).toEqual(mockResponse);
      });

      it('should not include auth headers', async () => {
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.executeAiGet(
          organizationPath,
          projectName,
          endpointName,
          {}
        );

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.not.objectContaining({
              Authorization: expect.any(String),
            }),
          })
        );
      });
    });

    describe('executeAiPost', () => {
      it('should execute AI endpoint via POST', async () => {
        const input = { text: 'Summarize this text' };
        const mockResponse = { output: { summary: 'Summary' } };
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockResponse },
        });

        const result = await client.executeAiPost(
          organizationPath,
          projectName,
          endpointName,
          input
        );

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/ai/${organizationPath}/${projectName}/${endpointName}`,
          input,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockResponse);
      });
    });

    describe('executeAi', () => {
      it('should default to POST method', async () => {
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.executeAi(organizationPath, projectName, endpointName, {});

        expect(mockNetworkClient.post).toHaveBeenCalled();
        expect(mockNetworkClient.get).not.toHaveBeenCalled();
      });

      it('should use GET when specified', async () => {
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.executeAi(
          organizationPath,
          projectName,
          endpointName,
          {},
          'GET'
        );

        expect(mockNetworkClient.get).toHaveBeenCalled();
        expect(mockNetworkClient.post).not.toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // STORAGE CONFIG
  // =============================================================================

  describe('Storage Config', () => {
    const entitySlug = 'my-org';
    const token = 'firebase-token';

    describe('getStorageConfig', () => {
      it('should fetch storage config for an entity', async () => {
        const mockConfig = { provider: 's3', bucket: 'my-bucket' };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockConfig },
        });

        const result = await client.getStorageConfig(entitySlug, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/storage`,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${token}`,
            }),
          })
        );
        expect(result.data).toEqual(mockConfig);
      });
    });

    describe('createStorageConfig', () => {
      it('should create storage config', async () => {
        const createData = { provider: 's3', bucket: 'new-bucket' };
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: createData },
        });

        const result = await client.createStorageConfig(
          entitySlug,
          createData as never,
          token
        );

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/storage`,
          createData,
          expect.any(Object)
        );
        expect(result.data).toEqual(createData);
      });
    });

    describe('updateStorageConfig', () => {
      it('should update storage config', async () => {
        const updateData = { bucket: 'updated-bucket' };
        vi.mocked(mockNetworkClient.put).mockResolvedValue({
          ok: true,
          data: { success: true, data: updateData },
        });

        await client.updateStorageConfig(
          entitySlug,
          updateData as never,
          token
        );

        expect(mockNetworkClient.put).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/storage`,
          updateData,
          expect.any(Object)
        );
      });
    });

    describe('deleteStorageConfig', () => {
      it('should delete storage config', async () => {
        vi.mocked(mockNetworkClient.delete).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.deleteStorageConfig(entitySlug, token);

        expect(mockNetworkClient.delete).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/storage`,
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // ENTITIES
  // =============================================================================

  describe('Entities', () => {
    const token = 'firebase-token';
    const entitySlug = 'my-org';

    describe('getEntities', () => {
      it('should fetch all entities for the user', async () => {
        const mockEntities = [{ entitySlug: 'org-1', displayName: 'Org 1' }];
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockEntities },
        });

        const result = await client.getEntities(token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities`,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${token}`,
            }),
          })
        );
        expect(result.data).toEqual(mockEntities);
      });
    });

    describe('getEntity', () => {
      it('should fetch a single entity', async () => {
        const mockEntity = {
          entitySlug: entitySlug,
          displayName: 'My Org',
        };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockEntity },
        });

        const result = await client.getEntity(entitySlug, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockEntity);
      });
    });

    describe('createEntity', () => {
      it('should create a new entity', async () => {
        const createData = { display_name: 'New Org', slug: 'new-org' };
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: 'new-id', ...createData } },
        });

        const result = await client.createEntity(createData as never, token);

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities`,
          createData,
          expect.any(Object)
        );
        expect(result.success).toBe(true);
      });
    });

    describe('updateEntity', () => {
      it('should update an entity', async () => {
        const updateData = { display_name: 'Updated Org' };
        vi.mocked(mockNetworkClient.put).mockResolvedValue({
          ok: true,
          data: { success: true, data: { entitySlug, ...updateData } },
        });

        await client.updateEntity(entitySlug, updateData as never, token);

        expect(mockNetworkClient.put).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}`,
          updateData,
          expect.any(Object)
        );
      });
    });

    describe('deleteEntity', () => {
      it('should delete an entity', async () => {
        vi.mocked(mockNetworkClient.delete).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.deleteEntity(entitySlug, token);

        expect(mockNetworkClient.delete).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}`,
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // ENTITY MEMBERS
  // =============================================================================

  describe('Entity Members', () => {
    const entitySlug = 'my-org';
    const token = 'firebase-token';
    const memberId = 'member-123';

    describe('getEntityMembers', () => {
      it('should fetch all members for an entity', async () => {
        const mockMembers = [
          { uuid: memberId, email: 'user@example.com', role: 'admin' },
        ];
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockMembers },
        });

        const result = await client.getEntityMembers(entitySlug, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/members`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockMembers);
      });
    });

    describe('updateEntityMemberRole', () => {
      it('should update a member role', async () => {
        vi.mocked(mockNetworkClient.put).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: memberId, role: 'admin' } },
        });

        await client.updateEntityMemberRole(
          entitySlug,
          memberId,
          'admin' as never,
          token
        );

        expect(mockNetworkClient.put).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/members/${memberId}`,
          { role: 'admin' },
          expect.any(Object)
        );
      });
    });

    describe('removeEntityMember', () => {
      it('should remove a member from an entity', async () => {
        vi.mocked(mockNetworkClient.delete).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.removeEntityMember(entitySlug, memberId, token);

        expect(mockNetworkClient.delete).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/members/${memberId}`,
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // ENTITY INVITATIONS
  // =============================================================================

  describe('Entity Invitations', () => {
    const entitySlug = 'my-org';
    const token = 'firebase-token';

    describe('getEntityInvitations', () => {
      it('should fetch all invitations for an entity', async () => {
        const mockInvitations = [
          { uuid: 'inv-1', email: 'invited@example.com', role: 'member' },
        ];
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockInvitations },
        });

        const result = await client.getEntityInvitations(entitySlug, token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/invitations`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockInvitations);
      });
    });

    describe('createEntityInvitation', () => {
      it('should create an invitation', async () => {
        const inviteData = {
          email: 'new@example.com',
          role: 'member' as never,
        };
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: { uuid: 'inv-new', ...inviteData } },
        });

        await client.createEntityInvitation(entitySlug, inviteData, token);

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/invitations`,
          inviteData,
          expect.any(Object)
        );
      });
    });

    describe('cancelEntityInvitation', () => {
      it('should cancel an invitation', async () => {
        vi.mocked(mockNetworkClient.delete).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.cancelEntityInvitation(entitySlug, 'inv-1', token);

        expect(mockNetworkClient.delete).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/entities/${entitySlug}/invitations/inv-1`,
          expect.any(Object)
        );
      });
    });

    describe('getMyInvitations', () => {
      it('should fetch pending invitations for the current user', async () => {
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: [] },
        });

        await client.getMyInvitations(token);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/invitations`,
          expect.any(Object)
        );
      });
    });

    describe('acceptInvitation', () => {
      it('should accept an invitation', async () => {
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.acceptInvitation('invite-token-abc', token);

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/invitations/invite-token-abc/accept`,
          {},
          expect.any(Object)
        );
      });
    });

    describe('declineInvitation', () => {
      it('should decline an invitation', async () => {
        vi.mocked(mockNetworkClient.post).mockResolvedValue({
          ok: true,
          data: { success: true, data: {} },
        });

        await client.declineInvitation('invite-token-abc', token);

        expect(mockNetworkClient.post).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/invitations/invite-token-abc/decline`,
          {},
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // RATE LIMITS
  // =============================================================================

  describe('Rate Limits', () => {
    const token = 'firebase-token';
    const entitySlug = 'my-org';

    describe('getRateLimitsConfig', () => {
      it('should fetch rate limits config', async () => {
        const mockConfig = { requests_per_hour: 100 };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockConfig },
        });

        const result = await client.getRateLimitsConfig(token, entitySlug);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/ratelimits/${entitySlug}`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockConfig);
      });
    });

    describe('getRateLimitHistory', () => {
      it('should fetch rate limit history for a period', async () => {
        const mockHistory = { entries: [] };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockHistory },
        });

        const result = await client.getRateLimitHistory(
          'hour',
          token,
          entitySlug
        );

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/ratelimits/${entitySlug}/history/hour`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockHistory);
      });
    });
  });

  // =============================================================================
  // PROVIDERS
  // =============================================================================

  describe('Providers', () => {
    describe('getProviders', () => {
      it('should fetch all providers without auth headers', async () => {
        const mockProviders = [{ id: 'openai', name: 'OpenAI' }];
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockProviders },
        });

        const result = await client.getProviders();

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/providers`,
          expect.objectContaining({
            headers: expect.not.objectContaining({
              Authorization: expect.any(String),
            }),
          })
        );
        expect(result.data).toEqual(mockProviders);
      });
    });

    describe('getProvider', () => {
      it('should fetch a specific provider', async () => {
        const mockProvider = { id: 'openai', name: 'OpenAI' };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockProvider },
        });

        const result = await client.getProvider('openai' as never);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/providers/openai`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockProvider);
      });
    });

    describe('getProviderModels', () => {
      it('should fetch models for a provider', async () => {
        const mockModels = {
          provider: { id: 'openai' },
          models: [{ id: 'gpt-4' }],
        };
        vi.mocked(mockNetworkClient.get).mockResolvedValue({
          ok: true,
          data: { success: true, data: mockModels },
        });

        const result = await client.getProviderModels('openai' as never);

        expect(mockNetworkClient.get).toHaveBeenCalledWith(
          `${baseUrl}/api/v1/providers/openai/models`,
          expect.any(Object)
        );
        expect(result.data).toEqual(mockModels);
      });
    });
  });

  // =============================================================================
  // URL ENCODING (Special Characters)
  // =============================================================================

  describe('URL Encoding', () => {
    const token = 'firebase-token';

    it('should encode entitySlug with special characters', async () => {
      vi.mocked(mockNetworkClient.get).mockResolvedValue({
        ok: true,
        data: { success: true, data: [] },
      });

      await client.getKeys('org with spaces/slashes', token);

      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/entities/org%20with%20spaces%2Fslashes/keys`,
        expect.any(Object)
      );
    });

    it('should encode projectId with special characters', async () => {
      vi.mocked(mockNetworkClient.get).mockResolvedValue({
        ok: true,
        data: { success: true, data: {} },
      });

      await client.getProject('org', 'proj/with&chars', token);

      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/entities/org/projects/proj%2Fwith%26chars`,
        expect.any(Object)
      );
    });

    it('should encode AI path segments with special characters', async () => {
      vi.mocked(mockNetworkClient.post).mockResolvedValue({
        ok: true,
        data: { success: true, data: {} },
      });

      await client.executeAiPost('org/path', 'proj name', 'end point', {});

      expect(mockNetworkClient.post).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/ai/org%2Fpath/proj%20name/end%20point`,
        {},
        expect.any(Object)
      );
    });
  });

  // =============================================================================
  // TEST MODE
  // =============================================================================

  describe('Test Mode', () => {
    it('should append testMode=true when testMode is enabled', async () => {
      const testClient = new ShapeshyftClient({
        baseUrl,
        networkClient: mockNetworkClient,
        testMode: true,
      });

      vi.mocked(mockNetworkClient.get).mockResolvedValue({
        ok: true,
        data: { success: true, data: [] },
      });

      await testClient.getKeys('my-org', 'token');

      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/entities/my-org/keys?testMode=true`,
        expect.any(Object)
      );
    });

    it('should not append testMode when testMode is false', async () => {
      vi.mocked(mockNetworkClient.get).mockResolvedValue({
        ok: true,
        data: { success: true, data: [] },
      });

      await client.getKeys('my-org', 'token');

      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/entities/my-org/keys`,
        expect.any(Object)
      );
    });

    it('should merge testMode with existing query params', async () => {
      const testClient = new ShapeshyftClient({
        baseUrl,
        networkClient: mockNetworkClient,
        testMode: true,
      });

      vi.mocked(mockNetworkClient.get).mockResolvedValue({
        ok: true,
        data: { success: true, data: [] },
      });

      await testClient.getProjects('my-org', 'token', {
        is_active: 'true',
      });

      const calledUrl = vi.mocked(mockNetworkClient.get).mock.calls[0]![0];
      expect(calledUrl).toContain('testMode=true');
      expect(calledUrl).toContain('is_active=true');
    });
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  describe('Error Handling', () => {
    it('should throw ShapeshyftApiError when response is not ok', async () => {
      vi.mocked(mockNetworkClient.get).mockResolvedValue({
        ok: false,
        data: { success: false, error: 'Server error' },
      });

      await expect(client.getKeys('user', 'token')).rejects.toThrow(
        'Failed to get keys: Server error'
      );

      try {
        await client.getKeys('user', 'token');
      } catch (err) {
        expect(err).toBeInstanceOf(ShapeshyftApiError);
      }
    });

    it('should throw error when data is missing', async () => {
      vi.mocked(mockNetworkClient.get).mockResolvedValue({
        ok: true,
        data: null,
      });

      await expect(client.getKeys('user', 'token')).rejects.toThrow();
    });

    it('should include status code in ShapeshyftApiError', async () => {
      vi.mocked(mockNetworkClient.get).mockResolvedValue({
        ok: false,
        status: 404,
        data: { success: false, error: 'Entity not found' },
      });

      try {
        await client.getEntity('nonexistent', 'token');
      } catch (err) {
        expect(err).toBeInstanceOf(ShapeshyftApiError);
        expect((err as ShapeshyftApiError).statusCode).toBe(404);
      }
    });
  });

  // =============================================================================
  // API KEY HEADERS (AI Endpoints)
  // =============================================================================

  describe('API Key Headers', () => {
    it('should include API key in Authorization header when provided', async () => {
      vi.mocked(mockNetworkClient.post).mockResolvedValue({
        ok: true,
        data: { success: true, data: {} },
      });

      await client.executeAiPost('org', 'proj', 'ep', {}, 'sk_live_abc123');

      expect(mockNetworkClient.post).toHaveBeenCalledWith(
        expect.any(String),
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk_live_abc123',
          }),
        })
      );
    });

    it('should pass timeout to network client', async () => {
      vi.mocked(mockNetworkClient.post).mockResolvedValue({
        ok: true,
        data: { success: true, data: {} },
      });

      await client.executeAiPost('org', 'proj', 'ep', {}, 'key', 30000);

      expect(mockNetworkClient.post).toHaveBeenCalledWith(
        expect.any(String),
        {},
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });
  });
});
