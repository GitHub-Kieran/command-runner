import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5081';

console.log('API Base URL:', API_BASE_URL);

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
        console.log('📤 Request Data:', config.data);
        console.log('🔗 Full URL:', `${config.baseURL || 'undefined'}${config.url || ''}`);
        // Check for duplicate requests
        if (config.method?.toUpperCase() === 'POST' && config.url?.includes('/profiles')) {
          console.log('🚨 PROFILE CREATION REQUEST - Checking for duplicates');
          const profileData = config.data || {};
          console.log('🚨 Profile name being sent:', profileData.name);
          console.log('🚨 Full profile data:', profileData);
        }
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        console.error('❌ Request Config:', error.config);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log('✅ API Response:', response.status, response.config.method?.toUpperCase(), response.config.url);
        console.log('📥 Response Data:', response.data);
        console.log('📥 Raw Response:', response);
        return response;
      },
      (error) => {
        console.error('❌ API Response Error:', error);
        console.error('❌ Full Error Object:', error);
        if (error.response) {
          console.error('❌ Error Response Status:', error.response.status);
          console.error('❌ Error Response Headers:', error.response.headers);
          console.error('❌ Error Response Data (raw):', error.response.data);
          console.error('❌ Error Response Data Type:', typeof error.response.data);

          // Server responded with error status
          let message = 'API Error';

          // Try to extract the specific error message from different possible formats
          if (error.response.data) {
            if (typeof error.response.data === 'string') {
              console.error('❌ Response is string, first 200 chars:', error.response.data.substring(0, 200));
              message = error.response.data;
            } else if (error.response.data.message) {
              message = error.response.data.message;
            } else if (error.response.data.error) {
              message = error.response.data.error;
            } else if (error.response.data.title) {
              message = error.response.data.title;
            }
          }

          // Include status code for context
          const statusCode = error.response.status;
          console.error(`❌ HTTP ${statusCode} Error Details:`, error.response.data);
          if (statusCode === 409) {
            message = `Conflict: ${message}`;
          } else if (statusCode === 400) {
            message = `Bad Request: ${message}`;
          } else if (statusCode === 401) {
            message = `Unauthorized: ${message}`;
          } else if (statusCode === 403) {
            message = `Forbidden: ${message}`;
          } else if (statusCode === 404) {
            message = `Not Found: ${message}`;
          } else if (statusCode >= 500) {
            message = `Server Error: ${message}`;
          }

          throw new Error(message);
        } else if (error.request) {
          // Network error
          console.error('❌ Network Error - Request made but no response received');
          console.error('❌ Request details:', error.request);
          throw new Error('Network error - please check your connection');
        } else {
          // Other error
          console.error('❌ Unknown API Error:', error.message);
          throw new Error(error.message || 'Unknown API error');
        }
      }
    );
  }

  // Generic GET request
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  // Generic POST request
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  // Generic PUT request
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  // Generic DELETE request
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();