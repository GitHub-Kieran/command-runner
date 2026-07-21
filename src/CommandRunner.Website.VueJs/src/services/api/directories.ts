import { apiClient } from './client';
import type { FavoriteDirectoryDto } from './types';

export const directoriesApi = {
  getAllDirectories(): Promise<FavoriteDirectoryDto[]> {
    return apiClient.get<FavoriteDirectoryDto[]>('/api/directories');
  },

  getDirectory(id: string): Promise<FavoriteDirectoryDto> {
    return apiClient.get<FavoriteDirectoryDto>(`/api/directories/${id}`);
  },

  getDirectoryByPath(path: string): Promise<FavoriteDirectoryDto> {
    return apiClient.get<FavoriteDirectoryDto>('/api/directories/by-path', { path });
  },

  getMostUsedDirectories(count = 10): Promise<FavoriteDirectoryDto[]> {
    return apiClient.get<FavoriteDirectoryDto[]>('/api/directories/most-used', { count });
  },

  createDirectory(directory: Omit<FavoriteDirectoryDto, 'id' | 'createdAt' | 'usageCount'>): Promise<FavoriteDirectoryDto> {
    return apiClient.post<FavoriteDirectoryDto>('/api/directories', directory);
  },

  updateDirectory(id: string, directory: Partial<FavoriteDirectoryDto>): Promise<void> {
    return apiClient.put(`/api/directories/${id}`, directory);
  },

  deleteDirectory(id: string): Promise<void> {
    return apiClient.delete(`/api/directories/${id}`);
  },

  incrementUsage(id: string): Promise<void> {
    return apiClient.post(`/api/directories/${id}/increment-usage`);
  },
};
