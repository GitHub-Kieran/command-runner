import { apiClient } from './client';
import { FavoriteDirectoryDto } from './types';

export class DirectoriesApiService {
  // Get all favorite directories
  async getAllDirectories(): Promise<FavoriteDirectoryDto[]> {
    return apiClient.get<FavoriteDirectoryDto[]>('/api/directories');
  }

  // Get directory by ID
  async getDirectory(id: string): Promise<FavoriteDirectoryDto> {
    return apiClient.get<FavoriteDirectoryDto>(`/api/directories/${id}`);
  }

  // Get directory by path
  async getDirectoryByPath(path: string): Promise<FavoriteDirectoryDto> {
    return apiClient.get<FavoriteDirectoryDto>(`/api/directories/by-path`, { path });
  }

  // Get most used directories
  async getMostUsedDirectories(count: number = 10): Promise<FavoriteDirectoryDto[]> {
    return apiClient.get<FavoriteDirectoryDto[]>(`/api/directories/most-used`, { count });
  }

  // Create new favorite directory
  async createDirectory(directory: Omit<FavoriteDirectoryDto, 'id' | 'createdAt' | 'usageCount'>): Promise<FavoriteDirectoryDto> {
    return apiClient.post<FavoriteDirectoryDto>('/api/directories', directory);
  }

  // Update directory
  async updateDirectory(id: string, directory: Partial<FavoriteDirectoryDto>): Promise<void> {
    return apiClient.put(`/api/directories/${id}`, directory);
  }

  // Delete directory
  async deleteDirectory(id: string): Promise<void> {
    return apiClient.delete(`/api/directories/${id}`);
  }

  // Increment usage count
  async incrementUsage(id: string): Promise<void> {
    return apiClient.post(`/api/directories/${id}/increment-usage`);
  }
}

export const directoriesApi = new DirectoriesApiService();