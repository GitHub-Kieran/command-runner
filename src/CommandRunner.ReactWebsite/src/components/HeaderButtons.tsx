import React from 'react';
import { IconButton } from '@mui/material';
import { Settings, Brightness4, Brightness7, CenterFocusStrong } from '@mui/icons-material';

interface HeaderButtonsProps {
  themeMode: 'light' | 'dark';
  onToggleFocusMode: () => void;
  onToggleTheme: () => void;
  onSettingsClick: () => void;
}

const HeaderButtons: React.FC<HeaderButtonsProps> = ({
  themeMode,
  onToggleFocusMode,
  onToggleTheme,
  onSettingsClick,
}) => {
  return (
    <>
      <IconButton
        size="small"
        onClick={onToggleFocusMode}
        title="Focus Mode"
        sx={{
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: themeMode === 'dark' ? '#334155' : '#f1f5f9',
          }
        }}
      >
        <CenterFocusStrong />
      </IconButton>
      <IconButton
        size="small"
        onClick={onToggleTheme}
        title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: themeMode === 'dark' ? '#334155' : '#f1f5f9',
          }
        }}
      >
        {themeMode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
      <IconButton
        size="small"
        onClick={onSettingsClick}
        title="Settings"
        sx={{
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: themeMode === 'dark' ? '#334155' : '#f1f5f9',
          }
        }}
      >
        <Settings />
      </IconButton>
    </>
  );
};

export default HeaderButtons;