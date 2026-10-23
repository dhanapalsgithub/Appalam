import { Box, Typography, IconButton, Stack } from '@mui/material';
import { ChevronLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function AppHeader({ title, showBack = true, onBack }: HeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back(); // முந்தைய பக்கத்திற்குச் செல்லும்
    }
  };

  return (
    <Box sx={{ bgcolor: '#242845', color: 'white', py: 1, width: '100%' }}>
      <Stack direction="row" alignItems="center" sx={{ px: 1 }}>
        {showBack && (
          <IconButton onClick={handleBack} sx={{ color: 'white' }}>
            <ChevronLeft size={28} />
          </IconButton>
        )}
        
        <Box sx={{ flex: 1, textAlign: 'center', pr: showBack ? 5 : 0 }}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <Stack direction="row" justifyContent="center" spacing={2}>
             <Typography variant="caption" sx={{ opacity: 0.8 }}>
               {new Date().toLocaleDateString('en-GB')}
             </Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}