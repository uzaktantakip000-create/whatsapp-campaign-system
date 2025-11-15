import { Box, Typography, Paper } from '@mui/material';
import MainLayout from '../components/layout/MainLayout';

function Settings() {
  return (
    <MainLayout>
      <Box>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure your account and system preferences
          </Typography>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Settings Page
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will allow you to configure profile settings, notifications, and preferences.
            Coming soon!
          </Typography>
        </Paper>
      </Box>
    </MainLayout>
  );
}

export default Settings;
