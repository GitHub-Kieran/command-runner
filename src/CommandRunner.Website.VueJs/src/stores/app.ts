import { defineStore } from 'pinia';
import { profilesApi, directoriesApi } from '../services/api';
import type { CommandExecutionResponse, FavoriteDirectoryDto, ProfileDto } from '../services/api';

export type ThemeMode = 'light' | 'dark';

interface AppState {
  profiles: ProfileDto[];
  directories: FavoriteDirectoryDto[];
  selectedProfile: ProfileDto | null;
  selectedDirectory: FavoriteDirectoryDto | null;
  isLoading: boolean;
  creatingProfile: boolean;
  error: string | null;
  executionHistory: CommandExecutionResponse[];
  theme: ThemeMode;
}

function describeApiFailure(error: unknown): string {
  const err = error as { message?: string; status?: number } | undefined;

  if (err?.status === undefined) {
    return 'API server is not running. Please ensure the Command Runner API is started.';
  }
  if (err.status >= 500) {
    return `API server error (${err.status}): ${err.message ?? 'Unknown server error'}`;
  }
  return err.message ?? 'Unable to connect to Command Runner API';
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    profiles: [],
    directories: [],
    selectedProfile: null,
    selectedDirectory: null,
    isLoading: false,
    creatingProfile: false,
    error: null,
    executionHistory: [],
    theme: 'dark',
  }),

  actions: {
    async loadInitialData() {
      this.isLoading = true;
      this.error = null;

      try {
        const [profiles, directories] = await Promise.all([
          profilesApi.getAllProfiles(),
          directoriesApi.getAllDirectories(),
        ]);
        this.profiles = profiles;
        this.directories = directories;
      } catch (error) {
        this.profiles = [];
        this.directories = [];
        this.error = describeApiFailure(error);
      } finally {
        this.isLoading = false;
      }
    },

    setSelectedProfile(profile: ProfileDto | null) {
      this.selectedProfile = profile;
    },

    setSelectedDirectory(directory: FavoriteDirectoryDto | null) {
      this.selectedDirectory = directory;
    },

    setError(message: string | null) {
      this.error = message;
    },

    // Optimistically adds the profile locally, then persists it; rolls back on failure.
    async addProfile(profile: ProfileDto) {
      if (this.creatingProfile) return;

      this.profiles.push(profile);
      this.creatingProfile = true;

      try {
        await profilesApi.createProfile(profile);
      } catch (error) {
        this.profiles = this.profiles.filter((p) => p.id !== profile.id);
        this.error = `Failed to save profile: ${describeApiFailure(error)}`;
      } finally {
        this.creatingProfile = false;
      }
    },

    updateProfile(profile: ProfileDto) {
      const index = this.profiles.findIndex((p) => p.id === profile.id);
      if (index !== -1) {
        this.profiles[index] = profile;
      }
      if (this.selectedProfile?.id === profile.id) {
        this.selectedProfile = profile;
      }

      profilesApi.updateProfile(profile.id, profile).catch((error) => {
        this.error = `Failed to update profile: ${describeApiFailure(error)}`;
      });
    },

    setProfiles(profiles: ProfileDto[]) {
      this.profiles = profiles;
    },

    async deleteProfile(id: string) {
      const removed = this.profiles.find((p) => p.id === id);
      this.profiles = this.profiles.filter((p) => p.id !== id);
      if (this.selectedProfile?.id === id) {
        this.selectedProfile = null;
      }

      try {
        await profilesApi.deleteProfile(id);
      } catch (error) {
        this.error = `Failed to delete profile: ${describeApiFailure(error)}`;
        if (removed) {
          this.profiles.push(removed);
        }
      }
    },

    addDirectory(directory: FavoriteDirectoryDto) {
      this.directories.push(directory);
    },

    deleteDirectory(id: string) {
      this.directories = this.directories.filter((d) => d.id !== id);
      if (this.selectedDirectory?.id === id) {
        this.selectedDirectory = null;
      }
    },

    addExecution(result: CommandExecutionResponse) {
      this.executionHistory = [result, ...this.executionHistory].slice(0, 50);
    },

    clearExecutionHistory() {
      this.executionHistory = [];
    },

    setTheme(theme: ThemeMode) {
      this.theme = theme;
    },
  },
});
