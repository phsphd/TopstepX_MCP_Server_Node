/**
 * Authentication module for TopstepX API
 */

import axios, { AxiosInstance } from 'axios';
import * as logger from './logger.js';
import { TopstepXConfig, ApiResponse } from './types.js';

let authToken: string | null = null;
let tokenExpiry: Date | null = null;
let axiosInstance: AxiosInstance | null = null;

export function getApiUrl(): string {
  const environment = process.env.TOPSTEPX_ENVIRONMENT || 'demo';
  
  // TopstepX uses its own domain
  if (environment === 'topstepx' || environment === 'demo') {
    return 'https://api.topstepx.com/api';
  }
  
  // Fallback for other environments
  if (environment === 'live') {
    return 'https://gateway-api.s2f.projectx.com/api';
  }
  return 'https://gateway-api-demo.s2f.projectx.com/api';
}

export async function authenticate(): Promise<void> {
  const username = process.env.TOPSTEPX_USERNAME || process.env.PROJECTX_USERNAME;
  const apiKey = process.env.TOPSTEPX_API_KEY || process.env.PROJECTX_API_KEY;
  
  if (!username || !apiKey) {
    throw new Error('TOPSTEPX_USERNAME/PROJECTX_USERNAME and TOPSTEPX_API_KEY/PROJECTX_API_KEY must be set in environment variables');
  }
  
  logger.info(`Using credentials - Username: ${username}, API Key: ${apiKey.substring(0, 10)}...`);
  
  const apiUrl = getApiUrl();
  
  try {
    logger.info(`Authenticating with TopstepX API at ${apiUrl}`);
    
    // Create axios instance for auth
    const authClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'accept': 'text/plain'
      }
    });
    
    // Authenticate with API key - using the correct endpoint
    const authData = {
      userName: username,  // Note: userName not username
      apiKey
    };
    logger.info('Sending auth request with data:', JSON.stringify(authData));
    
    const response = await authClient.post('/Auth/loginKey', authData);
    
    logger.info('Auth response status:', response.status);
    logger.info('Auth response data:', JSON.stringify(response.data));
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      // Set token expiry (assuming 24 hour validity)
      tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Create authenticated axios instance
      axiosInstance = axios.create({
        baseURL: apiUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'accept': 'text/plain',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      logger.info('Successfully authenticated with TopstepX API');
    } else {
      logger.error('Authentication failed. Response:', response.data);
      throw new Error(response.data.errorMessage || 'Authentication failed');
    }
  } catch (error: any) {
    logger.error('Failed to authenticate with TopstepX');
    if (error.response) {
      logger.error('Response status:', error.response.status);
      logger.error('Response data:', error.response.data);
    } else {
      logger.error('Error:', error.message);
    }
    throw error;
  }
}

export async function ensureAuthenticated(): Promise<void> {
  if (!authToken || !tokenExpiry || tokenExpiry < new Date()) {
    await authenticate();
  }
}

export async function topstepxRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: any
): Promise<T> {
  await ensureAuthenticated();
  
  if (!axiosInstance) {
    throw new Error('Not authenticated');
  }
  
  try {
    const response = await axiosInstance.request<ApiResponse<T>>({
      method,
      url: path,
      data
    });
    
    logger.debug(`TopstepX request ${method} ${path} response:`, JSON.stringify(response.data));
    
    // Handle different response formats
    // Some endpoints return { success, data } while others return the data directly
    if (response.data.success !== undefined) {
      if (response.data.success) {
        // If there's a data property, return it; otherwise return the whole response
        return response.data.data !== undefined ? response.data.data as T : response.data as T;
      } else {
        throw new Error(response.data.errorMessage || 'Request failed');
      }
    } else {
      // If no success property, assume the response is the data itself
      return response.data as T;
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token might be expired, try to re-authenticate
      logger.info('Token expired, re-authenticating...');
      authToken = null;
      await authenticate();
      
      // Retry the request
      const response = await axiosInstance!.request<ApiResponse<T>>({
        method,
        url: path,
        data
      });
      
      if (response.data.success) {
        return response.data.data as T;
      } else {
        throw new Error(response.data.errorMessage || 'Request failed');
      }
    }
    
    throw error;
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function getAxiosInstance(): AxiosInstance | null {
  return axiosInstance;
}