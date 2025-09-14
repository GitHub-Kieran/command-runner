import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { ProfileDto } from '../services/api';

interface ProfileSelectorProps {
  profiles: ProfileDto[];
  selectedProfile: ProfileDto | null;
  onProfileChange: (profile: ProfileDto | null) => void;
  size?: 'small' | 'medium';
}

const ProfileSelectorComponent: React.FC<ProfileSelectorProps> = ({
  profiles,
  selectedProfile,
  onProfileChange,
  size = 'medium'
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    const profileId = event.target.value;
    const profile = profiles.find(p => p.id === profileId) || null;
    onProfileChange(profile);
  };

  return (
    <FormControl size={size} sx={{ width: { xs: '100%', sm: 280, md: 320 } }}>
      <InputLabel>Profile</InputLabel>
      <Select
        value={selectedProfile?.id || ''}
        label="Profile"
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
        {profiles.length === 0 ? (
          <MenuItem disabled>No profiles available</MenuItem>
        ) : (
          profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              {profile.name}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
};

export const ProfileSelector = React.memo(ProfileSelectorComponent);