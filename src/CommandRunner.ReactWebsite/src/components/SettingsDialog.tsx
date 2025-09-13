import { useState, useEffect } from 'react';
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
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';
import { ProfileDto, CommandDto } from '../services/api';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { state, dispatch } = useApp();
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
              <Fab color="primary" size="small" onClick={handleAddProfile}>
                <Add />
              </Fab>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {state.profiles.map((profile) => (
                <Card
                  key={profile.id}
                  sx={{
                    cursor: 'pointer',
                    border: state.selectedProfile?.id === profile.id ? 2 : 1,
                    borderColor: state.selectedProfile?.id === profile.id ? 'primary.main' : 'divider',
                    minWidth: 280,
                    flex: '1 1 auto',
                  }}
                  onClick={(e) => {
                    // Only select profile if not clicking on buttons
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
              ))}
            </Box>

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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {state.selectedProfile.commands.map((command) => (
                      <Card key={command.id} sx={{ minWidth: 280, flex: '1 1 auto' }}>
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
                    ))}
                  </Box>
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
    </Dialog>
  );
}