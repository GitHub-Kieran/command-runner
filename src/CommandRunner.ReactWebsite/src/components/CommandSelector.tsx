import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { CommandDto, ProfileDto } from '../services/api';

interface CommandSelectorProps {
  selectedProfile: ProfileDto | null;
  selectedCommand: CommandDto | null;
  onCommandChange: (commandId: string) => void;
  size?: 'small' | 'medium';
}

const CommandSelectorComponent: React.FC<CommandSelectorProps> = ({
  selectedProfile,
  selectedCommand,
  onCommandChange,
  size = 'medium'
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onCommandChange(event.target.value);
  };

  return (
    <FormControl size={size} sx={{ width: { xs: '100%', sm: 280, md: 320 } }}>
      <InputLabel>Command</InputLabel>
      <Select
        value={selectedCommand?.id || ''}
        label="Command"
        disabled={!selectedProfile}
        variant="filled"
        onChange={handleChange}
        sx={{
          '& .MuiSelect-select': {
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: 1.2,
            maxHeight: '3em',
            overflow: 'hidden',
          }
        }}
      >
        {!selectedProfile ? (
          <MenuItem disabled>Select a profile first</MenuItem>
        ) : selectedProfile.commands.length === 0 ? (
          <MenuItem disabled>No commands in this profile</MenuItem>
        ) : (
          selectedProfile.commands.map((command) => (
            <MenuItem key={command.id} value={command.id}>
              {command.name}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
};

export const CommandSelector = React.memo(CommandSelectorComponent);