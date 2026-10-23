import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#030213',
      contrastText: '#ffffff',
    },
    // Glassy UI-க்கு மிக முக்கியமானது இந்த பின்னணி நிறங்கள்
    background: {
      default: '#f3f4f6', // லேசான கிரே கலர்
      paper: 'rgba(255, 255, 255, 0.7)', // இங்கேதான் Glassmorphism வரும் (Opacity)
    },
    text: {
      primary: '#030213',
    },
  },
  shape: {
    borderRadius: 20, // Liquid தோற்றத்திற்கு சற்று பெரிய ரவுண்டட் கார்னர்கள் அழகாக இருக்கும்
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(15px)', // இதுதான் கண்ணாடி போன்ற மங்கலான விளைவைத் தரும் (Blur)
          border: '1px solid rgba(255, 255, 255, 0.3)', // மெல்லிய பார்டர்
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', // மென்மையான நிழல்
          backgroundColor: 'rgba(255, 255, 255, 0.6) !important', // டிரான்ஸ்பரன்சி
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  },
});