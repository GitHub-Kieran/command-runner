import { createTheme } from '@mui/material/styles';

// Base theme configuration
const baseTheme = {
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiFilledInput-root': {
            borderRadius: 6,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiFilledInput-root': {
            borderRadius: 6,
          },
        },
      },
    },
  },
};

// Light theme
export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#64748b',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  components: {
    ...baseTheme.components,
    MuiPaper: {
      styleOverrides: {
        root: {
          ...baseTheme.components?.MuiPaper?.styleOverrides?.root,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        ...baseTheme.components?.MuiButton?.styleOverrides?.root,
        contained: {
          backgroundColor: '#2563eb',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#1d4ed8',
          },
        },
        outlined: {
          borderColor: '#cbd5e1',
          color: '#475569',
          '&:hover': {
            borderColor: '#2563eb',
            backgroundColor: '#f1f5f9',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          ...baseTheme.components?.MuiTextField?.styleOverrides?.root,
          '& .MuiFilledInput-root': {
            ...baseTheme.components?.MuiTextField?.styleOverrides?.root?.['& .MuiFilledInput-root'],
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            '&:hover': {
              backgroundColor: '#f1f5f9',
              borderColor: '#2563eb',
            },
            '&.Mui-focused': {
              backgroundColor: '#f1f5f9',
              borderColor: '#2563eb',
              boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
            },
            '&::before': {
              borderBottom: 'none',
            },
            '&::after': {
              borderBottom: 'none',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#64748b',
            '&.Mui-focused': {
              color: '#2563eb',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          ...baseTheme.components?.MuiSelect?.styleOverrides?.root,
          '& .MuiFilledInput-root': {
            ...baseTheme.components?.MuiSelect?.styleOverrides?.root?.['& .MuiFilledInput-root'],
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            '&:hover': {
              backgroundColor: '#f1f5f9',
              borderColor: '#2563eb',
            },
            '&.Mui-focused': {
              backgroundColor: '#f1f5f9',
              borderColor: '#2563eb',
              boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
            },
            '&::before': {
              borderBottom: 'none',
            },
            '&::after': {
              borderBottom: 'none',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#64748b',
            '&.Mui-focused': {
              color: '#2563eb',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1e293b',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

// Dark theme
export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#64748b',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
  },
  components: {
    ...baseTheme.components,
    MuiPaper: {
      styleOverrides: {
        root: {
          ...baseTheme.components?.MuiPaper?.styleOverrides?.root,
          border: '1px solid #334155',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        ...baseTheme.components?.MuiButton?.styleOverrides?.root,
        contained: {
          backgroundColor: '#2563eb',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#1d4ed8',
          },
        },
        outlined: {
          borderColor: '#475569',
          color: '#f1f5f9',
          '&:hover': {
            borderColor: '#2563eb',
            backgroundColor: '#1e293b',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          ...baseTheme.components?.MuiTextField?.styleOverrides?.root,
          '& .MuiFilledInput-root': {
            ...baseTheme.components?.MuiTextField?.styleOverrides?.root?.['& .MuiFilledInput-root'],
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            '&:hover': {
              backgroundColor: '#334155',
              borderColor: '#2563eb',
            },
            '&.Mui-focused': {
              backgroundColor: '#334155',
              borderColor: '#2563eb',
              boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
            },
            '&::before': {
              borderBottom: 'none',
            },
            '&::after': {
              borderBottom: 'none',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#94a3b8',
            '&.Mui-focused': {
              color: '#2563eb',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          ...baseTheme.components?.MuiSelect?.styleOverrides?.root,
          '& .MuiFilledInput-root': {
            ...baseTheme.components?.MuiSelect?.styleOverrides?.root?.['& .MuiFilledInput-root'],
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            '&:hover': {
              backgroundColor: '#334155',
              borderColor: '#2563eb',
            },
            '&.Mui-focused': {
              backgroundColor: '#334155',
              borderColor: '#2563eb',
              boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
            },
            '&::before': {
              borderBottom: 'none',
            },
            '&::after': {
              borderBottom: 'none',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#94a3b8',
            '&.Mui-focused': {
              color: '#2563eb',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e293b',
          color: '#f1f5f9',
          borderBottom: '1px solid #334155',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
});

// Export theme getter function
export const getTheme = (mode: 'light' | 'dark') => mode === 'light' ? lightTheme : darkTheme;