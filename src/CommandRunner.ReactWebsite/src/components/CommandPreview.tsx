import React from 'react';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import { CommandDto, FavoriteDirectoryDto } from '../services/api';

interface CommandPreviewProps {
  selectedCommand: CommandDto | null;
  selectedDirectory: FavoriteDirectoryDto | null;
  focusMode: boolean;
}

export const CommandPreview: React.FC<CommandPreviewProps> = ({
  selectedCommand,
  selectedDirectory,
  focusMode
}) => {
  const theme = useTheme();

  if (!selectedCommand) return null;

  if (focusMode) {
    // Plain text in focus mode
    return (
      <Box sx={{ mb: 0.5, px: 0.5, width: '100%', maxWidth: '100%' }}>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            color: theme.palette.text.secondary,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            lineHeight: 1.1,
            opacity: 0.8,
            whiteSpace: 'pre-wrap'
          }}
        >
          <Box component="span" sx={{ color: theme.palette.success.main }}>
            {selectedDirectory?.path || selectedCommand.workingDirectory || '~/'}
          </Box>
          {' $ '}
          <Box component="span" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
            {selectedCommand.executable} {selectedCommand.arguments}
          </Box>
        </Typography>
      </Box>
    );
  }

  // Proper tile in normal mode
  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Command Preview
        </Typography>
        <Box sx={{
          p: 2,
          backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
          borderRadius: 1,
          border: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 1px 3px rgba(0, 0, 0, 0.3)'
            : '0 1px 3px rgba(0, 0, 0, 0.1)',
          fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
          fontSize: '0.875rem',
          color: theme.palette.text.primary,
          position: 'relative',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 12,
            left: 16,
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#10b981',
          }
        }}>
          <Box sx={{ pl: 3 }}>
            <Typography component="div" sx={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              color: 'inherit',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap'
            }}>
              <Box component="span" sx={{ color: '#10b981' }}>
                {selectedDirectory?.path || selectedCommand.workingDirectory || '~/'}
              </Box>
              <Box component="span" sx={{ color: theme.palette.text.secondary, mx: 0.5 }}>
                {' $ '}
              </Box>
              <Box component="span" sx={{ color: '#2563eb', fontWeight: 'bold' }}>
                {selectedCommand.executable}
              </Box>
              {selectedCommand.arguments && (
                <Box component="span" sx={{ color: '#64748b', ml: 0.5 }}>
                  {selectedCommand.arguments}
                </Box>
              )}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};