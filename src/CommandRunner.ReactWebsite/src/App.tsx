import { useState, useEffect } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Button,
  IconButton,
  Alert,
  Stack,
  Snackbar,
} from '@mui/material';
import {
  Settings,
  Folder,
  Brightness4,
  Brightness7,
  CenterFocusStrong,
  CenterFocusWeak,
  CheckCircle,
  Refresh,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useApp } from './contexts/AppContext';
import { commandsApi } from './services/api/commands';
import { CommandDto, CommandExecutionResponse, IterationExecutionResponse } from './services/api/types';
import { SettingsDialog } from './components/SettingsDialog';
import { ProfileSelector } from './components/ProfileSelector';
import { DirectorySelector } from './components/DirectorySelector';
import { CommandSelector } from './components/CommandSelector';
import { CommandControls } from './components/CommandControls';
import { CommandDetails } from './components/CommandDetails';
import { CommandPreview } from './components/CommandPreview';
import { OutputPanel } from './components/OutputPanel';
import { getTheme } from './themes';

function App() {
  const { state, dispatch } = useApp();
  const [selectedCommand, setSelectedCommand] = useState<CommandDto | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [retryingApi, setRetryingApi] = useState(false);

  const theme = getTheme(state.theme);

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
  };

  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  // Handle settings button click
  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  // Handle browse button click - Use native dialog in Electron, fallback to prompt
  const handleBrowseClick = () => {
    // Check if running in Electron
    const isElectron = (window as any).electronAPI !== undefined;
    console.log('handleBrowseClick: isElectron detected:', isElectron);
    console.log('handleBrowseClick: window.electronAPI:', (window as any).electronAPI);

    if (isElectron) {
      try {
        (window as any).electronAPI.openDirectory().then((result: any) => {
          console.log('Directory dialog result:', result);
          if (!result.canceled && result.filePaths.length > 0) {
            const directoryPath = result.filePaths[0];
            const pathParts = directoryPath.split('/').filter((p: string) => p);
            const dirName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : directoryPath;

            const newDirectory = {
              id: `dir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              path: directoryPath,
              name: dirName,
              createdAt: new Date().toISOString(),
              usageCount: 1,
            };

            // Check if directory already exists
            const existingDir = state.directories.find(d => d.path === directoryPath);
            if (existingDir) {
              dispatch({ type: 'SET_SELECTED_DIRECTORY', payload: existingDir });
            } else {
              dispatch({ type: 'ADD_DIRECTORY', payload: newDirectory });
              dispatch({ type: 'SET_SELECTED_DIRECTORY', payload: newDirectory });
            }
          }
        }).catch((error: any) => {
          console.error('Failed to open directory dialog:', error);
          // Fallback to prompt
          fallbackDirectorySelection();
        });
      } catch (error) {
        console.error('Failed to call electronAPI:', error);
        // Fallback to prompt
        fallbackDirectorySelection();
      }
    } else {
      // Web fallback
      fallbackDirectorySelection();
    }
  };

  // Fallback directory selection for web or when Electron dialog fails
  const fallbackDirectorySelection = () => {
    const directoryPath = prompt('Enter directory path:', state.selectedDirectory?.path || '~/');

    if (directoryPath && directoryPath.trim()) {
      const path = directoryPath.trim();
      const pathParts = path.split('/').filter(p => p);
      const dirName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : path;

      const newDirectory = {
        id: `dir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        path: path,
        name: dirName,
        createdAt: new Date().toISOString(),
        usageCount: 1,
      };

      // Check if directory already exists
      const existingDir = state.directories.find(d => d.path === path);
      if (existingDir) {
        dispatch({ type: 'SET_SELECTED_DIRECTORY', payload: existingDir });
      } else {
        dispatch({ type: 'ADD_DIRECTORY', payload: newDirectory });
        dispatch({ type: 'SET_SELECTED_DIRECTORY', payload: newDirectory });
      }
    }
  };

  // Get all available directories including command's working directory
  const getAvailableDirectories = () => {
    const directories = [...state.directories];

    // Add the current command's working directory if it exists and isn't already in the list
    if (selectedCommand?.workingDirectory) {
      const commandDirExists = directories.some(d => d.path === selectedCommand.workingDirectory);
      if (!commandDirExists) {
        const pathParts = selectedCommand.workingDirectory.split('/').filter(p => p);
        const dirName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : selectedCommand.workingDirectory;

        directories.push({
          id: `cmd-dir-${selectedCommand.id}`,
          path: selectedCommand.workingDirectory,
          name: dirName,
          createdAt: new Date().toISOString(),
          usageCount: 0,
        });
      }
    }

    return directories;
  };

  // Handle copy output
  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  // Handle save log
  const handleSaveLog = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `command-output-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle command execution
  const handleExecuteCommand = async () => {
    if (!selectedCommand || !state.selectedProfile) return;

    // Check if command requires confirmation
    if (selectedCommand.requireConfirmation) {
      const confirmed = window.confirm(
        `This command requires confirmation:\n\n${selectedCommand.name}\n${selectedCommand.executable} ${selectedCommand.arguments}\n\nWorking Directory: ${state.selectedDirectory?.path || selectedCommand.workingDirectory || '~/'}\n\nDo you want to proceed?`
      );
      if (!confirmed) {
        return; // User cancelled
      }
    }

    setIsExecuting(true);
    const workingDirectory = state.selectedDirectory?.path || selectedCommand.workingDirectory || '~/';

    if (selectedCommand.iterationEnabled) {
      setOutput(`Executing iteratively: ${selectedCommand.executable} ${selectedCommand.arguments}\nWorking Directory: ${workingDirectory}\nScanning subdirectories...\n\n`);
    } else {
      setOutput(`Executing: ${selectedCommand.executable} ${selectedCommand.arguments}\nWorking Directory: ${workingDirectory}\n\n`);
    }

    try {
      const request = {
        commandId: selectedCommand.id,
        profileId: state.selectedProfile.id,
        workingDirectory: workingDirectory,
        userConfirmed: selectedCommand.requireConfirmation,
      };

      console.log('Executing command:', request);

      let result;
      if (selectedCommand.iterationEnabled) {
        // Use iterative execution for commands with iteration enabled
        // Configure for shallow iteration (only immediate children, not recursive)
        const iterativeRequest = {
          ...request,
          iterationOptions: {
            maxDepth: 1, // Only immediate children
            includeRootDirectory: false, // Don't run in root directory
            skipErrors: true, // Continue on errors
            stopOnFirstFailure: false, // Process all directories
            excludePatterns: [], // No exclusions
            includePatterns: [], // Include all
            maxParallelism: 3 // Limit concurrent executions
          }
        };
        result = await commandsApi.executeIterativeCommand(iterativeRequest);
      } else {
        // Use regular execution for single commands
        result = await commandsApi.executeCommand(request);
      }

      let outputText = '';

      // Type guard to check if result is IterationExecutionResponse
      const isIterationResult = (res: any): res is IterationExecutionResponse =>
        res && typeof res.totalItems === 'number';

      // Type guard to check if result is CommandExecutionResponse
      const isCommandResult = (res: any): res is CommandExecutionResponse =>
        res && typeof res.exitCode === 'number';

      if (selectedCommand.iterationEnabled && isIterationResult(result)) {
        // Handle iterative execution results
        outputText = `Iterative execution completed\n`;
        outputText += `Total Items: ${result.totalItems}\n`;
        outputText += `Successful: ${result.successfulItems}\n`;
        outputText += `Failed: ${result.failedItems}\n`;
        outputText += `Skipped: ${result.skippedItems}\n`;
        outputText += `Execution Time: ${result.startedAt} - ${result.completedAt || 'In Progress'}\n\n`;

        if (result.itemResults && result.itemResults.length > 0) {
          outputText += `Results by directory:\n\n`;
          result.itemResults.forEach((item) => {
            const status = item.wasSuccessful ? '✅' : '❌';
            const dirName = item.itemPath.split('/').pop() || item.itemPath;
            outputText += `${status} ${dirName}/\n`;

            // Show command output if available
            if (item.output && item.output.trim()) {
              outputText += `   Output: ${item.output.trim()}\n`;
            }

            if (item.errorOutput && item.errorOutput.trim()) {
              outputText += `   Error: ${item.errorOutput.trim()}\n`;
            }

            if (item.executionTime) {
              outputText += `   Execution time: ${item.executionTime}\n`;
            }

            if (!item.wasSuccessful && item.errorMessage) {
              outputText += `   Error: ${item.errorMessage}\n`;
            } else if (item.wasSuccessful && !item.output?.trim() && !item.errorOutput?.trim()) {
              outputText += `   Status: Command completed successfully\n`;
            }

            outputText += '\n';
          });
        }

        if (result.wasCancelled) {
          outputText += `⚠️  Execution was cancelled\n`;
        }
      } else if (!selectedCommand.iterationEnabled && isCommandResult(result)) {
        // Handle regular execution results
        outputText = `Command completed\n`;
        outputText += `Exit Code: ${result.exitCode}\n`;
        outputText += `Execution Time: ${result.executionTime}\n\n`;

        // Provide helpful interpretation of exit codes
        if (result.exitCode === 0) {
          outputText += `✅ Success: Command executed successfully\n\n`;
        } else if (result.exitCode === 128 && result.errorOutput?.includes('not a git repository')) {
          outputText += `ℹ️  Info: Directory is not a git repository\n`;
          outputText += `💡 Tip: Use 'git init' to initialize or navigate to a git repository\n\n`;
        } else if (result.exitCode !== 0) {
          outputText += `⚠️  Warning: Command exited with code ${result.exitCode}\n\n`;
        }

        if (result.output && result.output.trim()) {
          outputText += `Output:\n${result.output}\n`;
        } else if (result.exitCode === 0) {
          outputText += `Output: (command completed successfully, no output)\n`;
        }

        if (result.errorOutput && result.errorOutput.trim()) {
          outputText += `\nErrors:\n${result.errorOutput}\n`;
        }

        // Show execution errors if any
        if (result.executionErrors && result.executionErrors.length > 0) {
          outputText += `\nExecution Errors:\n${result.executionErrors.join('\n')}\n`;
        }
      }

      setOutput(outputText);

      // Set success status for successful command completion
      if (!selectedCommand.iterationEnabled && isCommandResult(result) && result.exitCode === 0) {
        setShowSuccessToast(true);
      } else if (selectedCommand.iterationEnabled && isIterationResult(result) && result.failedItems === 0) {
        setShowSuccessToast(true);
      }

      // Add to execution history (only for command results, not iteration results)
      if (!selectedCommand.iterationEnabled && isCommandResult(result)) {
        dispatch({ type: 'ADD_EXECUTION', payload: result as CommandExecutionResponse });
      }
    } catch (error) {
      const errorMessage = (error as any)?.message || String(error) || 'Unknown error occurred';
      console.error('Command execution error:', error);
      setOutput(`Command execution failed:\n${errorMessage}\n\nTroubleshooting tips:\n• Check if the working directory exists\n• Verify the command is available in PATH\n• Ensure proper permissions\n• Try using absolute paths instead of ~\n`);
      // Error status is handled by the error display
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle command selection
  const handleCommandChange = (commandId: string) => {
    if (!state.selectedProfile) return;

    const command = state.selectedProfile.commands.find(c => c.id === commandId);
    setSelectedCommand(command || null);
    setShowSuccessToast(false); // Hide any existing success toast

    // Auto-select the command's working directory if available and no directory is selected
    if (command?.workingDirectory && !state.selectedDirectory) {
      const availableDirs = getAvailableDirectories();
      const commandDir = availableDirs.find(d => d.path === command.workingDirectory);
      if (commandDir) {
        dispatch({ type: 'SET_SELECTED_DIRECTORY', payload: commandDir });
      }
    }
  };

  // Auto-select first profile and command on initial load
  useEffect(() => {
    if (state.profiles.length > 0 && !state.selectedProfile) {
      const firstProfile = state.profiles[0];
      dispatch({ type: 'SET_SELECTED_PROFILE', payload: firstProfile });
      if (firstProfile.commands.length > 0) {
        setSelectedCommand(firstProfile.commands[0]);
      }
    }
  }, [state.profiles, state.selectedProfile, dispatch]);

  // Auto-select directory when command changes
  useEffect(() => {
    if (selectedCommand?.workingDirectory) {
      const availableDirs = getAvailableDirectories();
      const commandDir = availableDirs.find(d => d.path === selectedCommand.workingDirectory);
      if (commandDir) {
        dispatch({ type: 'SET_SELECTED_DIRECTORY', payload: commandDir });
      }
    }
  }, [selectedCommand, state.directories]);

  // Keyboard shortcuts for desktop experience
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Enter or Cmd+Enter to execute command
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (selectedCommand && !isExecuting) {
          handleExecuteCommand();
        }
      }

      // Ctrl+L or Cmd+L to clear output
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        handleClearOutput();
      }

      // F11 to toggle focus mode
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFocusMode();
      }

      // Ctrl+B or Cmd+B to browse directory
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        handleBrowseClick();
      }

      // Ctrl+, or Cmd+, to open settings
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCommand, isExecuting]);

  // Clear selected command
  const handleClearCommand = () => {
    setSelectedCommand(null);
  };

  // Clear output
  const handleClearOutput = () => {
    setOutput('');
    setShowSuccessToast(false);
  };

  // Retry API connection
  const handleRetryApiConnection = async () => {
    console.log('🔄 Retrying API connection...');
    setRetryingApi(true);
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Import the API services
      const { profilesApi, directoriesApi } = await import('./services/api');

      // Try to load data again
      const [profiles, directories] = await Promise.all([
        profilesApi.getAllProfiles(),
        directoriesApi.getAllDirectories()
      ]);

      console.log('✅ API retry successful - Profiles:', profiles.length, 'Directories:', directories.length);

      const profilesWithIds = profiles.map(profile => ({
        ...profile,
        id: profile.id || `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));

      dispatch({ type: 'SET_PROFILES', payload: profilesWithIds });
      dispatch({ type: 'SET_DIRECTORIES', payload: directories });

    } catch (error) {
      console.warn('❌ API retry failed:', error);
      const err = error as any;
      let errorMessage = 'Unable to connect to Command Runner API';
      let errorDetails = '';

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

      dispatch({ type: 'SET_ERROR', payload: fullErrorMessage });
    } finally {
      setRetryingApi(false);
    }
  };


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Top Toolbar - Hidden in focus mode */}
        {!focusMode && (
          <AppBar position="static" sx={{
            width: '100%',
            backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
            borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 1px 3px rgba(0, 0, 0, 0.3)'
              : '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            <Toolbar sx={{ minHeight: 56, px: 2 }}>
              <Typography variant="h6" component="div" sx={{
                flexGrow: 1,
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}>
                Command Runner
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  onClick={toggleFocusMode}
                  title="Enter Focus Mode"
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#f1f5f9',
                    }
                  }}
                >
                  <CenterFocusStrong />
                </IconButton>
                <IconButton
                  onClick={toggleTheme}
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#f1f5f9',
                    }
                  }}
                >
                  {state.theme === 'dark' ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
                <IconButton
                  onClick={handleSettingsClick}
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#f1f5f9',
                    }
                  }}
                >
                  <Settings />
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>
        )}

        <Container maxWidth={false} sx={{ flexGrow: 1, py: 2, px: { xs: 2, md: 4 } }}>
          {state.error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              icon={<ErrorIcon />}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleRetryApiConnection}
                  disabled={retryingApi}
                  startIcon={retryingApi ? undefined : <Refresh />}
                  sx={{ minWidth: 'auto' }}
                >
                  {retryingApi ? 'Retrying...' : 'Retry'}
                </Button>
              }
            >
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  API Connection Error
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {state.error}
                </Typography>
              </Box>
            </Alert>
          )}

          <Stack spacing={2}>
            {/* Profile and Directory Selection */}
            <Paper sx={{ p: focusMode ? 0.5 : 2, mb: focusMode ? 0.5 : 2 }}>
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: focusMode ? 1 : 2,
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <ProfileSelector
                  profiles={state.profiles}
                  selectedProfile={state.selectedProfile}
                  onProfileChange={(profile) => {
                    dispatch({ type: 'SET_SELECTED_PROFILE', payload: profile });
                    // Select first command of the new profile
                    if (profile && profile.commands.length > 0) {
                      setSelectedCommand(profile.commands[0]);
                    } else {
                      setSelectedCommand(null);
                    }
                  }}
                  size={focusMode ? "small" : "medium"}
                />

                {!focusMode && (
                  <DirectorySelector
                    directories={getAvailableDirectories()}
                    selectedDirectory={state.selectedDirectory}
                    onDirectoryChange={(directory) => {
                      dispatch({ type: 'SET_SELECTED_DIRECTORY', payload: directory });
                    }}
                    size="medium"
                  />
                )}

                {focusMode ? (
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <IconButton
                      size="small"
                      onClick={toggleFocusMode}
                      title="Exit Focus Mode"
                      sx={{
                        color: theme.palette.text.secondary,
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#f1f5f9',
                        }
                      }}
                    >
                      <CenterFocusWeak />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={toggleTheme}
                      sx={{
                        color: theme.palette.text.secondary,
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#f1f5f9',
                        }
                      }}
                    >
                      {state.theme === 'dark' ? <Brightness7 /> : <Brightness4 />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={handleSettingsClick}
                      sx={{
                        color: theme.palette.text.secondary,
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#f1f5f9',
                        }
                      }}
                    >
                      <Settings />
                    </IconButton>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Folder />}
                    onClick={handleBrowseClick}
                    sx={{ minWidth: 120 }}
                    size="small"
                  >
                    Select Directory
                  </Button>
                )}
              </Box>
            </Paper>

            {/* Command Selection and Controls */}
            <Paper sx={{ p: focusMode ? 0.5 : 2, mb: focusMode ? 0.5 : 2 }}>
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: focusMode ? 1 : 2,
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <CommandSelector
                  selectedProfile={state.selectedProfile}
                  selectedCommand={selectedCommand}
                  onCommandChange={handleCommandChange}
                  size={focusMode ? "small" : "medium"}
                />

                <CommandControls
                  selectedCommand={selectedCommand}
                  isExecuting={isExecuting}
                  focusMode={focusMode}
                  onExecute={handleExecuteCommand}
                  onClear={handleClearCommand}
                />
              </Box>
            </Paper>

            {/* Command Details */}
            {!focusMode && (
              <CommandDetails
                selectedCommand={selectedCommand}
                selectedDirectory={state.selectedDirectory}
              />
            )}

            {/* Command Preview */}
            {selectedCommand && (
              <CommandPreview
                selectedCommand={selectedCommand}
                selectedDirectory={state.selectedDirectory}
                focusMode={focusMode}
              />
            )}

            {/* Output Window */}
            <OutputPanel
              output={output}
              isLoading={state.isLoading}
              focusMode={focusMode}
              onClear={handleClearOutput}
              onCopy={handleCopyOutput}
              onSave={handleSaveLog}
            />
          </Stack>
        </Container>
      </Box>

      {/* Success Toast */}
      <Snackbar
        open={showSuccessToast}
        autoHideDuration={3000}
        onClose={() => setShowSuccessToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccessToast(false)}
          severity="success"
          variant="filled"
          icon={<CheckCircle fontSize="inherit" />}
          sx={{
            fontWeight: 500,
            opacity: 0.9,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(0, 0, 0, 0.2)'
              : '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}
        >
          Command completed successfully!
        </Alert>
      </Snackbar>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </ThemeProvider>
  );
}

export default App;