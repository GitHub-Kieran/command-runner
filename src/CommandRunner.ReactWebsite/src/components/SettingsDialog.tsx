import { useState, useEffect, useRef, type ChangeEvent, type ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Typography,
  Fab,
  Card,
  CardContent,
  CardActions,
  Chip,
} from '@mui/material';
import {
  Add,
  Delete,
  UploadFile,
  DragIndicator,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../contexts/AppContext';
import { ProfileDto, CommandDto, profilesApi } from '../services/api';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SortableCardProps {
  id: string;
  children: ReactNode;
}

function SortableCard({ id, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        width: '100%',
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
        <IconButton size="small" {...attributes} {...listeners}>
          <DragIndicator fontSize="small" />
        </IconButton>
      </Box>
      {children}
    </Box>
  );
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { state, dispatch } = useApp();
  const sensors = useSensors(useSensor(PointerSensor));
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showCommandForm, setShowCommandForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ name: '', description: '' });
  const [commandForm, setCommandForm] = useState<Partial<CommandDto>>({
    name: '',
    executable: '',
    arguments: '',
    workingDirectory: '',
    shell: 'bash',
    environmentVariables: {},
    iterationEnabled: false,
    requireConfirmation: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // Local state for immediate feedback

  const handleProfilesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = state.profiles.findIndex((profile) => profile.id === active.id);
    const newIndex = state.profiles.findIndex((profile) => profile.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedProfiles = arrayMove(state.profiles, oldIndex, newIndex);
    dispatch({ type: 'SET_PROFILES', payload: reorderedProfiles });
  };

  const handleCommandsDragEnd = (event: DragEndEvent) => {
    if (!state.selectedProfile) {
      return;
    }

    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = state.selectedProfile.commands.findIndex((command) => command.id === active.id);
    const newIndex = state.selectedProfile.commands.findIndex((command) => command.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedCommands = arrayMove(state.selectedProfile.commands, oldIndex, newIndex);
    const updatedProfile = {
      ...state.selectedProfile,
      commands: reorderedCommands,
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'UPDATE_PROFILE', payload: updatedProfile });
  };

  const handleImportProfile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedProfile = await profilesApi.importProfile(file);
      dispatch({ type: 'SET_PROFILES', payload: [...state.profiles, importedProfile] });
      dispatch({ type: 'SET_SELECTED_PROFILE', payload: importedProfile });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import profile';
      alert(message);
    } finally {
      event.target.value = '';
    }
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setShowProfileForm(false);
      setShowCommandForm(false);
      setEditingItem(null);
      setProfileForm({ name: '', description: '' });
      setCommandForm({
        name: '',
        executable: '',
        arguments: '',
        workingDirectory: '',
        shell: 'bash',
        environmentVariables: {},
        iterationEnabled: false,
        requireConfirmation: false,
      });
    }
  }, [open]);

  // Reset creatingProfile flag after profile operations
  useEffect(() => {
    if (state.creatingProfile) {
      // Reset the flag after 3 seconds to allow API call to complete
      const timeout = setTimeout(() => {
        console.log('🔄 Auto-resetting creatingProfile flag');
        dispatch({ type: 'SET_CREATING_PROFILE', payload: false });
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [state.creatingProfile, dispatch]);

  // Also reset when profiles change (indicating successful creation)
  useEffect(() => {
    if (state.creatingProfile && state.profiles.length > 0) {
      // If we were creating a profile and now have profiles, reset the flag
      const timeout = setTimeout(() => {
        console.log('🔄 Resetting creatingProfile flag after profile list update');
        dispatch({ type: 'SET_CREATING_PROFILE', payload: false });
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [state.profiles.length, state.creatingProfile, dispatch]);

  const handleAddProfile = () => {
    setShowProfileForm(true);
    setEditingItem(null);
    setProfileForm({ name: '', description: '' });
  };

  const handleEditProfile = (profile: ProfileDto) => {
    dispatch({ type: 'SET_SELECTED_PROFILE', payload: profile });
    setShowProfileForm(false);
    setShowCommandForm(false);
    setEditingItem(null);
  };

  const handleEditProfileDetails = (profile: ProfileDto) => {
    setProfileForm({ name: profile.name, description: profile.description || '' });
    setEditingItem(profile);
    setShowProfileForm(true);
    setShowCommandForm(false);
  };

  const handleSaveProfile = () => {
    if (!profileForm.name.trim()) {
      alert('Please enter a profile name');
      return;
    }

    // Prevent duplicate profile creation requests using local state
    if (isSubmitting || state.creatingProfile) {
      console.warn('🚫 Profile creation already in progress');
      return;
    }

    setIsSubmitting(true); // Set local state immediately

    const trimmedName = profileForm.name.trim();
    console.log('📝 Creating profile with name:', `"${trimmedName}"`);
    console.log('📝 Original name:', `"${profileForm.name}"`);
    console.log('📝 Name length:', trimmedName.length);

    const profileData: ProfileDto = {
      id: editingItem?.id || `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedName,
      description: profileForm.description.trim(),
      commands: editingItem?.commands || [],
      createdAt: editingItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: editingItem?.isFavorite || false,
    };

    console.log('📝 Final profile data:', profileData);

    if (editingItem) {
      dispatch({ type: 'UPDATE_PROFILE', payload: profileData });
      // Reset local state immediately for updates
      setIsSubmitting(false);
    } else {
      dispatch({ type: 'ADD_PROFILE', payload: profileData });
      // Reset local state after a delay for new profiles (to allow API call to complete)
      setTimeout(() => {
        setIsSubmitting(false);
        // Refresh profiles to ensure we have the latest data from server
        console.log('🔄 Refreshing profiles after creation...');
        // The profiles will be refreshed when the API call completes
      }, 3000);
    }

    setShowProfileForm(false);
    setEditingItem(null);
    setProfileForm({ name: '', description: '' });
  };

  const handleDeleteProfile = (profile: ProfileDto) => {
    if (!profile.id || profile.id.trim() === '') {
      alert('Cannot delete profile: Invalid profile ID');
      return;
    }

    if (confirm(`Delete profile "${profile.name}" and all its commands?`)) {
      dispatch({ type: 'DELETE_PROFILE', payload: profile.id });
    }
  };

  const handleAddCommand = () => {
    setShowCommandForm(true);
    setEditingItem(null);
    setCommandForm({
      name: '',
      executable: '',
      arguments: '',
      workingDirectory: state.selectedProfile?.commands[0]?.workingDirectory || '~/',
      shell: 'bash',
      environmentVariables: {},
      iterationEnabled: false,
      requireConfirmation: false,
    });
  };

  const handleEditCommand = (command: CommandDto) => {
    setEditingItem(command);
    setCommandForm({ ...command });
    setShowCommandForm(true);
  };

  const handleSaveCommand = () => {
    if (!state.selectedProfile || !commandForm.name || !commandForm.executable) {
      alert('Please fill in Name and Executable');
      return;
    }

    const commandData: CommandDto = {
      id: editingItem?.id || `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: commandForm.name,
      executable: commandForm.executable,
      arguments: commandForm.arguments || '',
      workingDirectory: commandForm.workingDirectory || '~/',
      shell: commandForm.shell || 'bash',
      environmentVariables: commandForm.environmentVariables || {},
      iterationEnabled: commandForm.iterationEnabled || false,
      requireConfirmation: commandForm.requireConfirmation || false,
      createdAt: editingItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedProfile = {
      ...state.selectedProfile,
      commands: editingItem
        ? state.selectedProfile.commands.map(cmd =>
            cmd.id === editingItem.id ? commandData : cmd
          )
        : [...state.selectedProfile.commands, commandData],
    };

    dispatch({ type: 'UPDATE_PROFILE', payload: updatedProfile });
    setShowCommandForm(false);
    setEditingItem(null);
  };

  const handleDeleteCommand = (command: CommandDto) => {
    if (!state.selectedProfile) return;

    if (confirm(`Delete command "${command.name}"?`)) {
      const updatedProfile = {
        ...state.selectedProfile,
        commands: state.selectedProfile.commands.filter(cmd => cmd.id !== command.id),
      };
      dispatch({ type: 'UPDATE_PROFILE', payload: updatedProfile });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon />
        Manage Profiles & Commands
      </DialogTitle>

      <DialogContent sx={{ minHeight: 500 }}>
        {!showProfileForm && !showCommandForm ? (
          // Main view - Profiles grid
          <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Profiles</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadFile />}
                  onClick={() => profileFileInputRef.current?.click()}
                >
                  Import Profile
                </Button>
                <Fab color="primary" size="small" onClick={handleAddProfile}>
                  <Add />
                </Fab>
              </Box>
            </Box>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProfilesDragEnd}>
              <SortableContext items={state.profiles.map((profile) => profile.id)} strategy={verticalListSortingStrategy}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {state.profiles.map((profile) => (
                    <SortableCard key={profile.id} id={profile.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: state.selectedProfile?.id === profile.id ? 2 : 1,
                          borderColor: state.selectedProfile?.id === profile.id ? 'primary.main' : 'divider',
                          minWidth: 280,
                          flex: '1 1 auto',
                        }}
                        onClick={(e) => {
                          if (!(e.target as HTMLElement).closest('button')) {
                            handleEditProfile(profile);
                          }
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" gutterBottom>
                                {profile.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {profile.description || 'No description'}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Chip
                                  label={`${profile.commands.length} commands`}
                                  size="small"
                                  variant="outlined"
                                />
                                {profile.isFavorite && (
                                  <Chip label="★ Favorite" size="small" color="primary" />
                                )}
                              </Box>
                            </Box>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProfile(profile);
                              }}
                              title="Select this profile to view and edit its commands"
                              sx={{ ml: 1 }}
                            >
                              Select
                            </Button>
                          </Box>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'space-between' }}>
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProfileDetails(profile);
                            }}
                            title="Edit profile name and description"
                          >
                            Edit
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProfile(profile);
                            }}
                            title="Delete this profile and all its commands"
                          >
                            <Delete />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </SortableCard>
                  ))}
                </Box>
              </SortableContext>
            </DndContext>

            {state.selectedProfile && (
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Commands in "{state.selectedProfile.name}" ({state.selectedProfile.commands.length})
                  </Typography>
                  <Fab color="secondary" size="small" onClick={handleAddCommand}>
                    <Add />
                  </Fab>
                </Box>

                {state.selectedProfile.commands.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No commands in this profile yet
                    </Typography>
                    <Button variant="outlined" startIcon={<Add />} onClick={handleAddCommand} sx={{ mt: 1 }}>
                      Add First Command
                    </Button>
                  </Box>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCommandsDragEnd}>
                    <SortableContext
                      items={state.selectedProfile.commands.map((command) => command.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {state.selectedProfile.commands.map((command) => (
                          <SortableCard key={command.id} id={command.id}>
                            <Card sx={{ minWidth: 280, flex: '1 1 auto' }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {command.name}
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', p: 1, borderRadius: 1, mb: 1 }}>
                            {command.executable} {command.arguments}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            📁 {command.workingDirectory}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {command.iterationEnabled && (
                              <Chip
                                label="🔄 Iterative"
                                size="small"
                                color="info"
                                variant="outlined"
                                title="This command runs in subdirectories recursively"
                              />
                            )}
                            {command.requireConfirmation && (
                              <Chip
                                label="⚠️ Requires Confirmation"
                                size="small"
                                color="warning"
                                variant="outlined"
                                title="This command will ask for confirmation before running"
                              />
                            )}
                            {command.shell && command.shell !== 'bash' && (
                              <Chip
                                label={`🐚 ${command.shell}`}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                title={`Command runs in ${command.shell} shell`}
                              />
                            )}
                            {Object.keys(command.environmentVariables || {}).length > 0 && (
                              <Chip
                                label={`🔧 ${Object.keys(command.environmentVariables).length} env vars`}
                                size="small"
                                color="success"
                                variant="outlined"
                                title={`Has ${Object.keys(command.environmentVariables).length} environment variables set`}
                              />
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic', opacity: 0.7 }}>
                              Created: {new Date(command.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'space-between' }}>
                          <Button
                            size="small"
                            onClick={() => handleEditCommand(command)}
                            title="Edit command details"
                          >
                            Edit
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCommand(command)}
                            title="Delete this command"
                          >
                            <Delete />
                          </IconButton>
                        </CardActions>
                            </Card>
                          </SortableCard>
                        ))}
                      </Box>
                    </SortableContext>
                  </DndContext>
                )}
              </Box>
            )}
          </Box>
        ) : showProfileForm ? (
          // Profile form
          <Box>
            <Typography variant="h6" gutterBottom>
              {editingItem ? 'Edit Profile' : 'Add New Profile'}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Profile Name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
                autoFocus
                variant="filled"
              />
              <TextField
                label="Description (optional)"
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                multiline
                rows={2}
                variant="filled"
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                <Button onClick={() => setShowProfileForm(false)}>Cancel</Button>
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={isSubmitting || state.creatingProfile}
                >
                  {isSubmitting || state.creatingProfile
                    ? 'Creating...'
                    : editingItem ? 'Update Profile' : 'Create Profile'
                  }
                </Button>
              </Box>
            </Box>
          </Box>
        ) : (
          // Command form
          <Box>
            <Typography variant="h6" gutterBottom>
              {editingItem ? 'Edit Command' : 'Add New Command'}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Command Name"
                value={commandForm.name || ''}
                onChange={(e) => setCommandForm({ ...commandForm, name: e.target.value })}
                required
                autoFocus
                variant="filled"
              />
              <TextField
                label="Executable"
                value={commandForm.executable || ''}
                onChange={(e) => setCommandForm({ ...commandForm, executable: e.target.value })}
                required
                placeholder="e.g., git, npm, python"
                variant="filled"
              />
              <TextField
                label="Arguments"
                value={commandForm.arguments || ''}
                onChange={(e) => setCommandForm({ ...commandForm, arguments: e.target.value })}
                placeholder="e.g., --version, pull --rebase"
                variant="filled"
              />
              <TextField
                label="Working Directory"
                value={commandForm.workingDirectory || ''}
                onChange={(e) => setCommandForm({ ...commandForm, workingDirectory: e.target.value })}
                placeholder="e.g., ~/projects, /usr/local/bin"
                variant="filled"
              />
              <FormControl>
                <InputLabel>Shell</InputLabel>
                <Select
                  value={commandForm.shell || 'bash'}
                  label="Shell"
                  variant="filled"
                  onChange={(e) => setCommandForm({ ...commandForm, shell: e.target.value })}
                >
                  <MenuItem value="bash">bash</MenuItem>
                  <MenuItem value="powershell">PowerShell</MenuItem>
                  <MenuItem value="cmd">Command Prompt</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={commandForm.iterationEnabled || false}
                      onChange={(e) => setCommandForm({ ...commandForm, iterationEnabled: e.target.checked })}
                    />
                  }
                  label="Run in subdirectories"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={commandForm.requireConfirmation || false}
                      onChange={(e) => setCommandForm({ ...commandForm, requireConfirmation: e.target.checked })}
                    />
                  }
                  label="Require confirmation"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                <Button onClick={() => setShowCommandForm(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleSaveCommand}>
                  {editingItem ? 'Update' : 'Create'} Command
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} title="Close settings dialog">Close</Button>
      </DialogActions>
      <input
        ref={profileFileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleImportProfile}
      />
    </Dialog>
  );
}
