import { apiClient } from './client';
import { ProfileDto, CommandDto } from './types';

export class ProfilesApiService {
  // Get all profiles
  async getAllProfiles(): Promise<ProfileDto[]> {
    return apiClient.get<ProfileDto[]>('/api/profiles');
  }

  // Get profile by ID
  async getProfile(id: string): Promise<ProfileDto> {
    return apiClient.get<ProfileDto>(`/api/profiles/${id}`);
  }

  // Get profile by name
  async getProfileByName(name: string): Promise<ProfileDto> {
    return apiClient.get<ProfileDto>(`/api/profiles/by-name/${encodeURIComponent(name)}`);
  }

  // Get favorite profiles
  async getFavoriteProfiles(): Promise<ProfileDto[]> {
    return apiClient.get<ProfileDto[]>('/api/profiles/favorites');
  }

  // Create new profile
  async createProfile(profile: ProfileDto): Promise<ProfileDto> {
    return apiClient.post<ProfileDto>('/api/profiles', profile);
  }

  // Update profile
  async updateProfile(id: string, profile: Partial<ProfileDto>): Promise<void> {
    return apiClient.put(`/api/profiles/${id}`, profile);
  }

  // Delete profile
  async deleteProfile(id: string): Promise<void> {
    return apiClient.delete(`/api/profiles/${id}`);
  }

  // Add command to profile
  async addCommandToProfile(profileId: string, command: Omit<CommandDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProfileDto> {
    const profile = await this.getProfile(profileId);
    const newCommand = {
      ...command,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    profile.commands.push(newCommand);
    await this.updateProfile(profileId, profile);
    return this.getProfile(profileId);
  }

  // Update command in profile
  async updateCommandInProfile(profileId: string, commandId: string, command: Partial<CommandDto>): Promise<ProfileDto> {
    const profile = await this.getProfile(profileId);
    const commandIndex = profile.commands.findIndex(c => c.id === commandId);
    if (commandIndex === -1) {
      throw new Error('Command not found in profile');
    }
    profile.commands[commandIndex] = {
      ...profile.commands[commandIndex],
      ...command,
      updatedAt: new Date().toISOString(),
    };
    await this.updateProfile(profileId, profile);
    return this.getProfile(profileId);
  }

  // Remove command from profile
  async removeCommandFromProfile(profileId: string, commandId: string): Promise<ProfileDto> {
    const profile = await this.getProfile(profileId);
    profile.commands = profile.commands.filter(c => c.id !== commandId);
    await this.updateProfile(profileId, profile);
    return this.getProfile(profileId);
  }
}

export const profilesApi = new ProfilesApiService();