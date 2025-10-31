/**
 * Shared API Client for Mobile and Web
 * Provides a unified interface for API communication
 */

import { ApiResponse, ApiError } from './types';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;
  private token?: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = undefined;
    delete this.headers['Authorization'];
  }

  /**
   * GET request
   */
  async get<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(path: string, data?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, data?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Generic request method
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.parseError(response);
        return {
          success: false,
          error: error.message,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data as T,
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
          };
        }
        return {
          success: false,
          error: err.message,
        };
      }

      return {
        success: false,
        error: 'Unknown error',
      };
    }
  }

  /**
   * Parse error response
   */
  private async parseError(response: Response): Promise<ApiError> {
    try {
      const data = await response.json();
      return {
        code: data.code || 'UNKNOWN_ERROR',
        message: data.message || response.statusText,
        statusCode: response.status,
        details: data.details,
      };
    } catch {
      return {
        code: 'PARSE_ERROR',
        message: response.statusText,
        statusCode: response.status,
      };
    }
  }
}

/**
 * Create API client instance
 */
export function createApiClient(baseUrl: string): ApiClient {
  return new ApiClient({ baseUrl });
}

