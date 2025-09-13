import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { FavoriteDirectoryDto } from '../services/api';

interface DirectorySelectorProps {
  directories: FavoriteDirectoryDto[];
  selectedDirectory: FavoriteDirectoryDto | null;
  onDirectoryChange: (directory: FavoriteDirectoryDto | null) => void;
  size?: 'small' | 'medium';
}

const DirectorySelectorComponent: React.FC<DirectorySelectorProps> = ({
  directories,
  selectedDirectory,
  onDirectoryChange,
  size = 'medium'
}) => {
  console.log('DirectorySelector: render - directories received:', directories?.length || 0, 'items');
  console.log('DirectorySelector: render - selectedDirectory:', selectedDirectory);
  console.log('DirectorySelector: render - directories data:', directories);

  const handleChange = (event: SelectChangeEvent<string>) => {
    console.log('DirectorySelector: handleChange called with value:', event.target.value);
    const directoryId = event.target.value;
    const directory = directories.find(d => d.id === directoryId) || null;
    console.log('DirectorySelector: found directory:', directory);
    onDirectoryChange(directory);
  };

  return (
    <FormControl size={size} sx={{ width: { xs: '100%', sm: 280, md: 320 } }}>
      <InputLabel>Directory</InputLabel>
      <Select
        value={selectedDirectory?.id || ''}
        label="Directory"
        variant="filled"
        onChange={handleChange}
        sx={{
          '& .MuiSelect-select': {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }
        }}
      >
        {directories.length === 0 ? (
          <MenuItem disabled>No directories available</MenuItem>
        ) : (
          directories.map((directory) => (
            <MenuItem key={directory.id} value={directory.id}>
              {directory.name} {directory.id.startsWith('cmd-dir-') ? '(from command)' : ''}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
};

export const DirectorySelector = React.memo(DirectorySelectorComponent);