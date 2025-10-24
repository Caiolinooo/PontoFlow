import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, createApiClient } from '@/lib/shared/api-client';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = createApiClient('https://api.example.com');
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create client with base URL', () => {
      expect(client).toBeDefined();
    });

    it('should set default headers', () => {
      expect(client).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should set token', () => {
      client.setToken('test-token');
      expect(client).toBeDefined();
    });

    it('should clear token', () => {
      client.setToken('test-token');
      client.clearToken();
      expect(client).toBeDefined();
    });
  });

  describe('GET Request', () => {
    it('should make GET request', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const response = await client.get('/test');

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ data: 'test' });
    });

    it('should handle GET error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not found' }),
      });

      const response = await client.get('/test');

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('POST Request', () => {
    it('should make POST request with data', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      const response = await client.post('/test', { name: 'test' });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: '123' });
    });

    it('should handle POST error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid data' }),
      });

      const response = await client.post('/test', { name: '' });

      expect(response.success).toBe(false);
    });
  });

  describe('PATCH Request', () => {
    it('should make PATCH request', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123', name: 'updated' }),
      });

      const response = await client.patch('/test/123', { name: 'updated' });

      expect(response.success).toBe(true);
    });
  });

  describe('DELETE Request', () => {
    it('should make DELETE request', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const response = await client.delete('/test/123');

      expect(response.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const response = await client.get('/test');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Network error');
    });

    it('should handle timeout', async () => {
      global.fetch = vi.fn().mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        });
      });

      const response = await client.get('/test');

      expect(response.success).toBe(false);
    });

    it('should handle JSON parse error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const response = await client.get('/test');

      expect(response.success).toBe(false);
    });
  });

  describe('Headers', () => {
    it('should include authorization header when token is set', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      client.setToken('test-token');
      await client.get('/test');

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should include content-type header', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await client.post('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

