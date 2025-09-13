import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  IconButton,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Clear,
  Error,
} from '@mui/icons-material';

interface OutputPanelProps {
  output: string;
  isLoading: boolean;
  focusMode: boolean;
  onClear: () => void;
  onCopy?: () => void;
  onSave?: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  output,
  isLoading,
  focusMode,
  onClear,
  onCopy,
  onSave
}) => {
  const theme = useTheme();
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Format output to prettify exceptions and errors
  const formatOutput = (text: string) => {
    if (!text) return { type: 'plain', content: text };

    const lines = text.split('\n');

    // Generic .NET exception detection
    const isDotNetException = lines.some(line =>
      line.includes('System.') && line.includes('Exception')
    );

    if (isDotNetException) {
      // Find the main exception message
      const mainException = lines.find(line =>
        line.trim().startsWith('System.') &&
        line.includes('Exception:') &&
        !line.includes('--->')
      );

      const unhandledException = lines.find(line =>
        line.includes('Unhandled exception') ||
        line.includes('An unhandled exception')
      );

      let errorMessage = 'An error occurred';
      if (mainException) {
        const colonIndex = mainException.indexOf('Exception:');
        if (colonIndex !== -1) {
          errorMessage = mainException.substring(colonIndex + 11).trim();
        }
      } else if (unhandledException) {
        errorMessage = unhandledException.trim();
      }

      return {
        type: 'error',
        title: 'Application Error',
        message: errorMessage,
        suggestions: [
          'Check if required services are running',
          'Verify configuration settings',
          'Ensure all dependencies are installed',
          'Check file and network permissions'
        ],
        fullDetails: text
      };
    }

    // Command not found errors
    if (lines.some(line =>
      line.includes('command not found') ||
      line.includes('is not recognized') ||
      line.includes('No such file or directory')
    )) {
      return {
        type: 'error',
        title: 'Command Not Found',
        message: 'The specified command could not be located',
        suggestions: [
          'Install the required software',
          'Use absolute paths to executables',
          'Check if the command is in your PATH',
          'Verify the executable name is correct'
        ],
        fullDetails: text
      };
    }

    // Permission errors
    if (lines.some(line =>
      line.includes('Permission denied') ||
      line.includes('Access is denied') ||
      line.includes('Operation not permitted')
    )) {
      return {
        type: 'error',
        title: 'Permission Denied',
        message: 'Access to the requested resource was denied',
        suggestions: [
          'Run with elevated privileges (sudo/admin)',
          'Check file ownership and permissions',
          'Verify access to the target directory',
          'Ensure the user has necessary rights'
        ],
        fullDetails: text
      };
    }

    // Connection errors
    if (lines.some(line =>
      line.includes('Connection refused') ||
      line.includes('Network is unreachable') ||
      line.includes('Address already in use')
    )) {
      return {
        type: 'error',
        title: 'Connection Error',
        message: 'Network or connection-related error occurred',
        suggestions: [
          'Check if the target service is running',
          'Verify network connectivity',
          'Ensure the correct port/address is used',
          'Check firewall settings'
        ],
        fullDetails: text
      };
    }

    // File system errors
    if (lines.some(line =>
      line.includes('No such file') ||
      line.includes('Directory not found') ||
      line.includes('File exists')
    )) {
      return {
        type: 'error',
        title: 'File System Error',
        message: 'File or directory operation failed',
        suggestions: [
          'Verify the file/directory path exists',
          'Check file permissions',
          'Use absolute paths instead of relative paths',
          'Ensure the working directory is correct'
        ],
        fullDetails: text
      };
    }

    return { type: 'plain', content: text };
  };

  // Component to render formatted output
  const FormattedOutput = ({ formatted }: { formatted: any }) => {
    if (formatted.type === 'plain') {
      return <span>{formatted.content}</span>;
    }

    if (formatted.type === 'error') {
      return (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Error color="error" />
            <Typography variant="h6" color="error.main" fontWeight="bold">
              {formatted.title}
            </Typography>
          </Box>

          <Typography variant="body1" color="text.primary" sx={{ mb: 2 }}>
            {formatted.message}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="info.main" sx={{ mb: 1 }}>
              💡 Suggestions:
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {formatted.suggestions.map((suggestion: string, index: number) => (
                <Typography key={index} component="li" variant="body2" color="text.secondary">
                  {suggestion}
                </Typography>
              ))}
            </Box>
          </Box>

          <Box>
            <Button
              size="small"
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              startIcon={showErrorDetails ? <ExpandLess /> : <ExpandMore />}
              sx={{ mb: 1 }}
            >
              {showErrorDetails ? 'Hide' : 'Show'} Full Details
            </Button>

            {showErrorDetails && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  maxHeight: 300,
                  overflow: 'auto'
                }}
              >
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    m: 0,
                    whiteSpace: 'pre-wrap',
                    color: theme.palette.text.secondary
                  }}
                >
                  {formatted.fullDetails}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      );
    }

    return <span>{String(formatted)}</span>;
  };

  if (focusMode) {
    // Collapsible output panel for focus mode - only show for actual errors
    const formatted = formatOutput(output);
    const hasError = formatted.type === 'error' && output && output !== 'Ready to execute commands...';

    if (!hasError) return null;

    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" color="error.main">
            ⚠️ Error Output
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton size="small" onClick={onClear}>
              <Clear />
            </IconButton>
          </Box>
        </Box>
        <Box
          sx={{
            backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
            p: 2,
            borderRadius: 1,
            maxHeight: 200,
            overflow: 'auto',
            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 1px 3px rgba(0, 0, 0, 0.3)'
              : '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              Loading...
            </Box>
          ) : <FormattedOutput formatted={formatted} />}
        </Box>
      </Paper>
    );
  }

  // Full output window for normal mode
  return (
    <Paper sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Output Window
        </Typography>
        <Stack direction="row" spacing={2} sx={{ ml: 2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Clear />}
            onClick={onClear}
            disabled={!output || output === 'Ready to execute commands...'}
          >
            Clear Output
          </Button>
          {onCopy && (
            <Button size="small" variant="outlined" onClick={onCopy} disabled={!output}>
              Copy Output
            </Button>
          )}
          {onSave && (
            <Button size="small" variant="outlined" onClick={onSave} disabled={!output}>
              Save Log
            </Button>
          )}
        </Stack>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
          p: 2,
          borderRadius: 1,
          flexGrow: 1,
          fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
          fontSize: '0.875rem',
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
          color: theme.palette.text.primary,
          minHeight: 300,
          border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            Loading...
          </Box>
        ) : output ? <FormattedOutput formatted={formatOutput(output)} /> : 'Ready to execute commands...'}
      </Box>
    </Paper>
  );
};