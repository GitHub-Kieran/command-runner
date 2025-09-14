import React from 'react';
import { Paper, Typography, Stack, TextField, Box, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CommandDto, FavoriteDirectoryDto } from '../services/api';

interface CommandDetailsProps {
  selectedCommand: CommandDto | null;
  selectedDirectory: FavoriteDirectoryDto | null;
}

export const CommandDetails: React.FC<CommandDetailsProps> = ({
  selectedCommand,
  selectedDirectory
}) => {
  const theme = useTheme();

  if (!selectedCommand) return null;

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header with Properties */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="h6">
          Command Details
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 2 }}>
          {selectedCommand.iterationEnabled && (
            <Chip
              label="🔄 Iterative"
              size="small"
              color="info"
              variant="outlined"
              title="This command runs in subdirectories recursively"
            />
          )}
          {selectedCommand.requireConfirmation && (
            <Chip
              label="⚠️ Requires Confirmation"
              size="small"
              color="warning"
              variant="outlined"
              title="This command will ask for confirmation before running"
            />
          )}
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Stack spacing={2} sx={{ flex: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Executable"
            value={selectedCommand.executable}
            variant="filled"
            slotProps={{
              input: {
                readOnly: true,
                sx: {
                  cursor: 'not-allowed',
                  '& .MuiInputBase-input': {
                    color: theme.palette.text.disabled,
                  },
                  '& .MuiFilledInput-root': {
                    '&::before': {
                      borderBottomStyle: 'dashed',
                      borderBottomColor: theme.palette.action.disabled,
                    },
                    '&::after': {
                      borderBottomStyle: 'dashed',
                      borderBottomColor: theme.palette.action.disabled,
                    },
                  },
                }
              }
            }}
          />
          <TextField
            fullWidth
            size="small"
            label="Arguments"
            value={selectedCommand.arguments}
            variant="filled"
            slotProps={{
              input: {
                readOnly: true,
                sx: {
                  cursor: 'not-allowed',
                  '& .MuiInputBase-input': {
                    color: theme.palette.text.disabled,
                  },
                  '& .MuiFilledInput-root': {
                    '&::before': {
                      borderBottomStyle: 'dashed',
                      borderBottomColor: theme.palette.action.disabled,
                    },
                    '&::after': {
                      borderBottomStyle: 'dashed',
                      borderBottomColor: theme.palette.action.disabled,
                    },
                  },
                }
              }
            }}
          />
        </Stack>
        <Stack spacing={2} sx={{ flex: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Working Directory"
            value={selectedDirectory?.path || selectedCommand.workingDirectory || ''}
            variant="filled"
            slotProps={{
              input: {
                readOnly: true,
                sx: {
                  cursor: 'not-allowed',
                  '& .MuiInputBase-input': {
                    color: theme.palette.text.disabled,
                  },
                  '& .MuiFilledInput-root': {
                    '&::before': {
                      borderBottomStyle: 'dashed',
                      borderBottomColor: theme.palette.action.disabled,
                    },
                    '&::after': {
                      borderBottomStyle: 'dashed',
                      borderBottomColor: theme.palette.action.disabled,
                    },
                  },
                }
              }
            }}
          />
          <TextField
            fullWidth
            size="small"
            label="Shell"
            value={selectedCommand.shell || ''}
            variant="filled"
            slotProps={{
              input: {
                readOnly: true,
                sx: {
                  cursor: 'not-allowed',
                  '& .MuiInputBase-input': {
                    color: theme.palette.text.disabled,
                  },
                  '& .MuiFilledInput-root': {
                    '&::before': {
                      borderBottomStyle: 'dashed',
                      borderBottomColor: theme.palette.action.disabled,
                    },
                    '&::after': {
                      borderBottomStyle: 'dashed',
                      borderBottomColor: theme.palette.action.disabled,
                    },
                  },
                }
              }
            }}
          />
        </Stack>
      </Stack>
    </Paper>
  );
};