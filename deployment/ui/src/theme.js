import { createTheme } from '@mui/material/styles';

// Colors from the agreed mockup.
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c9cff', contrastText: '#0b1020' },
    background: { default: '#0f1218', paper: '#171b23' },
    divider: '#2a303b',
    text: { primary: '#e6e9ef', secondary: '#9aa3b2' },
    success: { main: '#4ecb8f' },
    error: { main: '#ff7a7a' },
    warning: { main: '#f2c14e' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'system-ui, Ubuntu, Cantarell, "Noto Sans", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

export const monoFont = 'ui-monospace, "Ubuntu Mono", "DejaVu Sans Mono", monospace';
