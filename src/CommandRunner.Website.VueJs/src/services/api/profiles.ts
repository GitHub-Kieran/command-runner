import { apiClient, API_BASE_URL } from './client';
import type { ProfileDto } from './types';

export const profilesApi = {
  getAllProfiles(): Promise<ProfileDto[]> {
    return apiClient.get<ProfileDto[]>('/api/profiles');
  },

  getProfile(id: string): Promise<ProfileDto> {
    return apiClient.get<ProfileDto>(`/api/profiles/${id}`);
  },

  getFavoriteProfiles(): Promise<ProfileDto[]> {
    return apiClient.get<ProfileDto[]>('/api/profiles/favorites');
  },

  createProfile(profile: ProfileDto): Promise<ProfileDto> {
    return apiClient.post<ProfileDto>('/api/profiles', profile);
  },

  async importProfile(file: File): Promise<ProfileDto> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/profiles/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to import profile (${response.status})`);
    }

    return response.json() as Promise<ProfileDto>;
  },

  updateProfile(id: string, profile: Partial<ProfileDto>): Promise<void> {
    return apiClient.put(`/api/profiles/${id}`, profile);
  },

  deleteProfile(id: string): Promise<void> {
    return apiClient.delete(`/api/profiles/${id}`);
  },
};
