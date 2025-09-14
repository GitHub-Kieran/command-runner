import React from 'react';
import { Button, Stack, CircularProgress } from '@mui/material';
import { PlayArrow, Clear } from '@mui/icons-material';
import { CommandDto } from '../services/api';

interface CommandControlsProps {
  selectedCommand: CommandDto | null;
  isExecuting: boolean;
  focusMode: boolean;
  onExecute: () => void;
  onClear: () => void;
}

export const CommandControls: React.FC<CommandControlsProps> = ({
  selectedCommand,
  isExecuting,
  focusMode,
  onExecute,
  onClear
}) => {
  return (
    <Stack direction="row" spacing={focusMode ? 1 : 2} sx={{ alignItems: 'center', flexShrink: 0 }}>
      <Button
        variant="contained"
        color="primary"
        startIcon={isExecuting ? <CircularProgress size={focusMode ? 14 : 16} /> : <PlayArrow />}
        disabled={!selectedCommand || isExecuting}
        onClick={onExecute}
        size={focusMode ? "small" : "medium"}
        sx={{ minWidth: focusMode ? 80 : 100, whiteSpace: 'nowrap' }}
      >
        {isExecuting ? 'Running...' : 'Run'}
      </Button>
      <Button
        variant="outlined"
        startIcon={<Clear />}
        onClick={onClear}
        size={focusMode ? "small" : "medium"}
        disabled={!selectedCommand}
        sx={{ minWidth: focusMode ? 80 : 100, whiteSpace: 'nowrap' }}
      >
        Clear
      </Button>
    </Stack>
  );
};