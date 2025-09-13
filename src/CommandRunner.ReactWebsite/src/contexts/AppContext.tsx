import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { ProfileDto, FavoriteDirectoryDto, CommandExecutionResponse } from '../services/api';
import { profilesApi, directoriesApi } from '../services/api';

// State interface
interface AppState {
  profiles: ProfileDto[];
  directories: FavoriteDirectoryDto[];
  selectedProfile: ProfileDto | null;
  selectedDirectory: FavoriteDirectoryDto | null;
  isLoading: boolean;
  creatingProfile: boolean; // Prevent duplicate profile creation
  error: string | null;
  executionHistory: CommandExecutionResponse[];
  theme: 'light' | 'dark';
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROFILES'; payload: ProfileDto[] }
  | { type: 'ADD_PROFILE'; payload: ProfileDto }
  | { type: 'UPDATE_PROFILE'; payload: ProfileDto }
  | { type: 'DELETE_PROFILE'; payload: string }
  | { type: 'SET_SELECTED_PROFILE'; payload: ProfileDto | null }
  | { type: 'SET_DIRECTORIES'; payload: FavoriteDirectoryDto[] }
  | { type: 'ADD_DIRECTORY'; payload: FavoriteDirectoryDto }
  | { type: 'UPDATE_DIRECTORY'; payload: FavoriteDirectoryDto }
  | { type: 'DELETE_DIRECTORY'; payload: string }
  | { type: 'SET_SELECTED_DIRECTORY'; payload: FavoriteDirectoryDto | null }
  | { type: 'ADD_EXECUTION'; payload: CommandExecutionResponse }
  | { type: 'CLEAR_EXECUTION_HISTORY' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_CREATING_PROFILE'; payload: boolean };

// Initial state
const initialState: AppState = {
  profiles: [], // Start with empty arrays to force API loading
  directories: [],
  selectedProfile: null,
  selectedDirectory: null,
  isLoading: false,
  creatingProfile: false,
  error: null,
  executionHistory: [],
  theme: 'dark',
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PROFILES':
      return { ...state, profiles: action.payload };
    case 'ADD_PROFILE':
      console.log('📝 Adding profile to local state:', action.payload.name, action.payload.id);

      // Prevent duplicate requests by checking if we're already creating a profile
      if (state.creatingProfile) {
        console.warn('🚫 Profile creation already in progress, ignoring duplicate request');
        return state;
      }

      // Try to save to API
      profilesApi.createProfile(action.payload).then((createdProfile) => {
        console.log('✅ Successfully saved profile to API:', createdProfile.name, createdProfile.id);
        // Profile created successfully, keep it in local state
        // The creatingProfile flag will be reset by the useEffect in SettingsDialog
      }).catch(error => {
        console.error('❌ Failed to save profile to API:', error);
        // Show user-friendly error message
        const errorMessage = error.message || 'Unknown error occurred';
        console.error('❌ Profile creation error details:', errorMessage);

        // Remove the failed profile from local state
        console.log('🗑️ Removing failed profile from local state:', action.payload.id);
        // The creatingProfile flag will be reset by the useEffect in SettingsDialog
      });

      return {
        ...state,
        profiles: [...state.profiles, action.payload],
        creatingProfile: true
      };
    case 'UPDATE_PROFILE':
      // Try to save to API, but don't block the UI
      profilesApi.updateProfile(action.payload.id, action.payload).catch(error => {
        console.warn('Failed to update profile via API:', error);
      });
      return {
        ...state,
        profiles: state.profiles.map(p => p.id === action.payload.id ? action.payload : p),
        selectedProfile: state.selectedProfile?.id === action.payload.id ? action.payload : state.selectedProfile
      };
    case 'DELETE_PROFILE':
      // Delete from local state immediately for better UX
      const updatedProfiles = state.profiles.filter(p => p.id !== action.payload);
      const newState = {
        ...state,
        profiles: updatedProfiles,
        selectedProfile: state.selectedProfile?.id === action.payload ? null : state.selectedProfile
      };

      // Try to delete from API (don't block UI)
      profilesApi.deleteProfile(action.payload).then(() => {
        console.log('Successfully deleted profile from API:', action.payload);
      }).catch(error => {
        console.error('Failed to delete profile from API:', error);
        console.error('Error details:', error.response?.data || error.message);

        // If API deletion fails, show error to user and restore the profile
        const deletedProfile = state.profiles.find(p => p.id === action.payload);
        if (deletedProfile) {
          setTimeout(() => {
            alert(`Failed to delete profile from server. It will reappear on refresh.\nError: ${error.message || 'Unknown error'}`);
            // Optionally restore the profile to local state
            // dispatch({ type: 'ADD_PROFILE', payload: deletedProfile });
          }, 100);
        }
      });

      return newState;
    case 'SET_SELECTED_PROFILE':
      return { ...state, selectedProfile: action.payload };
    case 'SET_DIRECTORIES':
      return { ...state, directories: action.payload };
    case 'ADD_DIRECTORY':
      return { ...state, directories: [...state.directories, action.payload] };
    case 'UPDATE_DIRECTORY':
      return {
        ...state,
        directories: state.directories.map(d => d.id === action.payload.id ? action.payload : d),
        selectedDirectory: state.selectedDirectory?.id === action.payload.id ? action.payload : state.selectedDirectory
      };
    case 'DELETE_DIRECTORY':
      return {
        ...state,
        directories: state.directories.filter(d => d.id !== action.payload),
        selectedDirectory: state.selectedDirectory?.id === action.payload ? null : state.selectedDirectory
      };
    case 'SET_SELECTED_DIRECTORY':
      return { ...state, selectedDirectory: action.payload };
    case 'ADD_EXECUTION':
      return { ...state, executionHistory: [action.payload, ...state.executionHistory].slice(0, 50) }; // Keep last 50
    case 'CLEAR_EXECUTION_HISTORY':
      return { ...state, executionHistory: [] };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_CREATING_PROFILE':
      return { ...state, creatingProfile: action.payload };
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load theme from localStorage on startup
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      dispatch({ type: 'SET_THEME', payload: savedTheme });
    } else {
      // Default to dark if not set
      dispatch({ type: 'SET_THEME', payload: 'dark' });
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🚀 Loading initial data from API...');
      dispatch({ type: 'SET_LOADING', payload: true });

      // Clear any cached data first
      console.log('🧹 Clearing localStorage cache...');
      localStorage.removeItem('commandRunner_profiles');
      localStorage.removeItem('commandRunner_directories');

      try {
        // Try to load from API first
        console.log('📡 Calling API endpoints...');
        const [profiles, directories] = await Promise.all([
          profilesApi.getAllProfiles(),
          directoriesApi.getAllDirectories()
        ]);

        console.log('📊 API Response - Profiles:', profiles.length, 'Directories:', directories.length);
        console.log('📊 Directories data:', directories);

        // Update with API data (even if empty arrays)
        const profilesWithIds = profiles.map(profile => ({
          ...profile,
          id: profile.id || `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        console.log('✅ Loading profiles from API:', profilesWithIds.length);
        dispatch({ type: 'SET_PROFILES', payload: profilesWithIds });

        console.log('✅ Loading directories from API:', directories.length);
        dispatch({ type: 'SET_DIRECTORIES', payload: directories });

      } catch (error) {
        // API connection failed - provide detailed error information
        console.warn('❌ API not available:', error);

        // Extract meaningful error information
        let errorMessage = 'Unable to connect to Command Runner API';
        let errorDetails = '';

        const err = error as any; // Type assertion for error handling

        if (err.code === 'ECONNREFUSED') {
          errorMessage = 'API server is not running';
          errorDetails = 'Please ensure the Command Runner API is started. In development, run the API project. In production, the API should start automatically.';
        } else if (err.code === 'ENOTFOUND') {
          errorMessage = 'API server not found';
          errorDetails = 'The API server may not be running or the connection URL is incorrect.';
        } else if (err.response) {
          errorMessage = `API server error (${err.response.status})`;
          errorDetails = err.response.data?.message || err.response.statusText || 'Unknown server error';
        } else if (err.request) {
          errorMessage = 'Network connection failed';
          errorDetails = 'Please check your internet connection and ensure the API server is accessible.';
        }

        const fullErrorMessage = errorDetails
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;

        console.log('⚠️ API failed, keeping empty data');
        dispatch({ type: 'SET_PROFILES', payload: [] });
        dispatch({ type: 'SET_DIRECTORIES', payload: [] });

        dispatch({ type: 'SET_ERROR', payload: fullErrorMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadInitialData();
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', state.theme);
  }, [state.theme]);

  // Save profiles to localStorage
  useEffect(() => {
    localStorage.setItem('commandRunner_profiles', JSON.stringify(state.profiles));
  }, [state.profiles]);

  // Save directories to localStorage
  useEffect(() => {
    localStorage.setItem('commandRunner_directories', JSON.stringify(state.directories));
  }, [state.directories]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}