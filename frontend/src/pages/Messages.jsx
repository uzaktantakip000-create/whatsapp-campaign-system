import { Box, Typography, Paper } from '@mui/material';
import MainLayout from '../components/layout/MainLayout';

function Messages() {
  return (
    <MainLayout>
      <Box>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Message History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and track all sent messages
          </Typography>
        </Paper>

        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Message History Page
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will show all sent messages with delivery status and analytics.
            Coming soon!
          </Typography>
        </Paper>
      </Box>
    </MainLayout>
  );
}

export default Messages;
